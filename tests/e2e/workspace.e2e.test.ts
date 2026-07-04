/**
 * Step 10 — Multi-trace workspace + SVG export E2E
 *
 * Exercises:
 *   ✓ Loading two different fixtures opens two workspace tabs
 *   ✓ Switching between tabs restores the correct file name in the status bar
 *   ✓ Closing a tab removes it from the workspace bar
 *   ✓ The "+" (Open another) button triggers a file chooser (file-input-extra)
 *   ✓ Export SVG downloads a .svg file for the current view
 */

import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

function fixturePath(rel: string) {
  return path.resolve(process.cwd(), rel)
}

const FIXTURE_A = fixturePath('fixtures/ab1/310.ab1')
const FIXTURE_B = fixturePath('fixtures/scf/abcZ_F.scf')
const INK_THRESHOLD = 1000

async function waitForInitialSampleLoad(page: Page) {
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1 (868 bases)')
}

async function canvasInkSum(page: Page): Promise<number> {
  return page.locator('[data-testid="chromatogram-canvas"]').evaluate((canvas) => {
    const el = canvas as HTMLCanvasElement
    const ctx = el.getContext('2d')!
    const data = ctx.getImageData(0, 0, el.width, el.height).data
    let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += Math.abs(255 - data[i]) + Math.abs(255 - data[i + 1]) + Math.abs(255 - data[i + 2])
    }
    return sum
  })
}

async function readViewportState(page: Page) {
  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const [startSample, samplesPerPixel] = await Promise.all([
    canvas.getAttribute('data-viewport-start'),
    canvas.getAttribute('data-viewport-spp'),
  ])
  if (!startSample || !samplesPerPixel) {
    throw new Error(`Viewport state unavailable: start=${startSample} spp=${samplesPerPixel}`)
  }
  return { startSample, samplesPerPixel }
}

test.describe('Multi-trace workspace', () => {
  test('opening two fixtures shows two tabs in the workspace bar', async ({ page }) => {
    await waitForInitialSampleLoad(page)

    // Load first fixture via primary input.
    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')
    await expect(page.getByRole('button', { name: 'Open another trace' })).toBeVisible()

    // The single open tab remains visible alongside the affordance to open another trace.
    await expect(page.locator('.workspace-bar')).not.toHaveClass(/workspace-bar--hidden/)
    await expect(page.locator('.workspace-bar__tab')).toHaveCount(1)

    // Load second fixture via the extra input (simulates "Open another").
    await page.setInputFiles('#file-input-extra', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    // Bar should now be visible with two tabs.
    await expect(page.locator('.workspace-bar')).not.toHaveClass(/workspace-bar--hidden/)
    const tabs = page.locator('.workspace-bar__tab')
    await expect(tabs).toHaveCount(2)
    const tablist = page.getByRole('tablist', { name: 'Open traces' })
    await expect(tablist.getByRole('tab')).toHaveCount(2)
    await expect(tablist.getByRole('button')).toHaveCount(0)
    await expect(tablist.getByRole('button', { name: 'Open another trace' })).toHaveCount(0)
  })

  test('switching between tabs restores state', async ({ page }) => {
    await waitForInitialSampleLoad(page)

    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('310.ab1')
    await expect
      .poll(async () => await page.locator('[data-testid="chromatogram-canvas"]').getAttribute('data-viewport-start'))
      .not.toBeNull()
    const initialViewport = await readViewportState(page)
    await page.getByRole('button', { name: 'Zoom +' }).click()
    await expect
      .poll(async () => await readViewportState(page))
      .not.toEqual(initialViewport)
    const zoomedViewport = await readViewportState(page)
    await page.getByRole('button', { name: 'Pan →' }).click()
    await expect
      .poll(async () => await readViewportState(page))
      .not.toEqual(zoomedViewport)
    const expectedViewport = await readViewportState(page)

    await page.setInputFiles('#file-input-extra', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('abcZ_F.scf')

    // Switch back via the named tab so ordering changes do not make the test flaky.
    await page.getByRole('tab', { name: '310.ab1' }).click()
    await expect(page.locator('#status')).toContainText('310.ab1')
    await expect
      .poll(async () => await readViewportState(page))
      .toEqual(expectedViewport)

    // Canvas should still render trace-colored pixels after switching back.
    await expect
      .poll(() => canvasInkSum(page), { timeout: 5000 })
      .toBeGreaterThan(INK_THRESHOLD)
  })

  test('closing a tab removes it from the workspace bar', async ({ page }) => {
    await waitForInitialSampleLoad(page)

    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    await page.setInputFiles('#file-input-extra', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    await expect(page.locator('.workspace-bar__tab')).toHaveCount(2)

    // Close the first tab.
    const closeBtn = page.locator('.workspace-bar__tab').first().locator('.workspace-bar__tab-close')
    await closeBtn.click()

    // Should be back to one tab, while the open-another affordance stays visible.
    await expect(page.locator('.workspace-bar__tab')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Open another trace' })).toBeVisible()
  })

  test('Export SVG downloads a .svg file', async ({ page }) => {
    await waitForInitialSampleLoad(page)
    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export SVG' }).click()
    const dl = await download
    expect(dl.suggestedFilename()).toMatch(/\.svg$/)
  })

  test('SVG download contains valid SVG content', async ({ page }) => {
    await waitForInitialSampleLoad(page)
    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export SVG' }).click()
    const dl = await download

    const stream = await dl.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    const svgContent = Buffer.concat(chunks).toString('utf-8')

    // Must be a real SVG document.
    expect(svgContent).toContain('<svg ')
    expect(svgContent).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svgContent).toContain('</svg>')
    // Must contain at least one trace path.
    expect(svgContent).toContain('<path ')
  })

  test('workspace-open button ("+") stays visible and loads a second file', async ({ page }) => {
    await waitForInitialSampleLoad(page)

    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    const fileChooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Open another trace' }).click()
    await (await fileChooser).setFiles(FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    // Two tabs now visible.
    await expect(page.locator('.workspace-bar__tab')).toHaveCount(2)
  })

  test('switching to an evicted tab clears rendered UI and shows reload state', async ({ page }) => {
    await waitForInitialSampleLoad(page)

    const files = [FIXTURE_A, FIXTURE_B, FIXTURE_A, FIXTURE_B, FIXTURE_A, FIXTURE_B]
    await page.setInputFiles('#file-input', files[0])
    await expect(page.locator('#status')).toContainText('Loaded')
    for (const file of files.slice(1)) {
      await page.setInputFiles('#file-input-extra', file)
      await expect(page.locator('#status')).toContainText('Loaded')
    }

    await expect(page.locator('.workspace-bar__tab-label', { hasText: '(evicted)' })).toHaveCount(1)
    await page.locator('.workspace-bar__tab', {
      has: page.locator('.workspace-bar__tab-label', { hasText: '(evicted)' }),
    }).click()

    await expect(page.locator('#error-banner')).toBeVisible()
    await expect(page.locator('#status')).toContainText('was evicted from memory')
    await expect(page.locator('.sequence-panel')).toHaveText('Load a trace to inspect sequence')
    await expect(page.locator('.position-readout')).toHaveText('Position: -')
    await expect(page.locator('[data-testid="chromatogram-canvas"]')).not.toHaveAttribute('data-viewport-start', /.+/)
    await expect.poll(() => canvasInkSum(page)).toBeLessThan(INK_THRESHOLD)
  })
})
