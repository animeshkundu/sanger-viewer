import path from 'node:path'
import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { parseTrace } from '../../src/parsers'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')

const fixtureTrace = (() => {
  const buffer = readFileSync(FIXTURE)
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  return parseTrace(arrayBuffer, '310.ab1')
})()

const expectedIndex = fixtureTrace.baseCalls.findIndex((base, index) => index < 240 && /[ACGT]/.test(base))

if (expectedIndex < 0) throw new Error('No canonical base found in initial sequence window for base-inspector test')

const expectedPeakPos = fixtureTrace.peakPositions[expectedIndex] ?? 0
const expectedAmplitudes = {
  A: Math.round(fixtureTrace.channels.A[expectedPeakPos] ?? 0),
  C: Math.round(fixtureTrace.channels.C[expectedPeakPos] ?? 0),
  G: Math.round(fixtureTrace.channels.G[expectedPeakPos] ?? 0),
  T: Math.round(fixtureTrace.channels.T[expectedPeakPos] ?? 0),
}
const expectedBase = fixtureTrace.baseCalls[expectedIndex] ?? 'N'
const expectedPeakAmplitude = expectedAmplitudes[expectedBase as 'A' | 'C' | 'G' | 'T']
const expectedQuality = fixtureTrace.qualities?.[expectedIndex] ?? null

async function loadFixture(page: import('@playwright/test').Page) {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
}

test.describe('keyboard base inspector', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard inspector assertions are desktop-only')

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`focus opens inspector with exact values in ${colorScheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await loadFixture(page)
      const span = page.locator(`.sequence-panel span[data-base-index="${expectedIndex}"]`)
      await span.focus()

      const inspector = page.getByRole('dialog', { name: 'Base inspector' })
      await expect(inspector).toBeVisible()
      await expect(inspector.locator('[data-testid="base-inspector-position"]')).toHaveText(String(expectedIndex + 1))
      await expect(inspector.locator('[data-testid="base-inspector-base"]')).toHaveText(expectedBase)
      await expect(inspector.locator('[data-testid="base-inspector-quality"]')).toHaveText(
        expectedQuality === null ? 'n/a' : String(expectedQuality),
      )
      await expect(inspector.locator('[data-testid="base-inspector-peak"]')).toHaveText(String(expectedPeakAmplitude))
      await expect(span).toHaveAttribute('aria-haspopup', 'dialog')
      await expect(span).toHaveAttribute('aria-describedby', 'base-inspector')
      await expect(span).toHaveAttribute('aria-expanded', 'true')
    })
  }

  test('Enter and Space open inspector; Escape and blur close it', async ({ page }) => {
    await loadFixture(page)
    const span = page.locator(`.sequence-panel span[data-base-index="${expectedIndex}"]`)
    const inspector = page.getByRole('dialog', { name: 'Base inspector' })

    await span.focus()
    await expect(inspector).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(inspector).toBeHidden()

    await page.keyboard.press('Enter')
    await expect(inspector).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(inspector).toBeHidden()

    await page.keyboard.press('Space')
    await expect(inspector).toBeVisible()

    await page.locator('#search-input').focus()
    await expect(inspector).toBeHidden()
    await expect(span).not.toHaveAttribute('aria-describedby', 'base-inspector')
  })

  test('hover tooltip still works and contains peak data', async ({ page }) => {
    await loadFixture(page)
    const canvas = page.locator('[data-testid="chromatogram-canvas"]')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not visible')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await expect(page.locator('.tooltip')).toContainText('peak:')
  })
})
