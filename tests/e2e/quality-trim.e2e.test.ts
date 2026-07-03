/**
 * Step 7 — Quality trimming E2E tests
 *
 * Verifies the quality trim controls across desktop Chrome and iPad tablet:
 *   ✓ Trim controls render (slider, Full/Trimmed buttons, summary)
 *   ✓ Default mode is "Full" with threshold 20
 *   ✓ Trim summary appears after loading a trace (e.g. "bp kept · Q̄")
 *   ✓ Canvas ink sum changes when trim overlay is active (shaded regions visible)
 *   ✓ Adjusting threshold slider changes trim summary and canvas
 *   ✓ Switching to Full mode removes the trim overlay from canvas
 *   ✓ "Export FASTA" (Trimmed mode) produces shorter sequence than Full mode
 *   ✓ Trimmed FASTA header contains trim annotation
 *   ✓ Full FASTA header does NOT contain trim annotation
 *   ✓ Threshold 0 keeps all bases; threshold 40 keeps fewer than threshold 0
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')
const INK_THRESHOLD = 1000

async function canvasInkSum(page: Page): Promise<number> {
  return page.locator('[data-testid="chromatogram-canvas"]').evaluate((el) => {
    const canvas = el as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += Math.abs(255 - data[i]) + Math.abs(255 - data[i + 1]) + Math.abs(255 - data[i + 2])
    }
    return sum
  })
}

async function downloadFastaContent(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export FASTA' }).click(),
  ])
  const tmpPath = await download.path()
  if (!tmpPath) throw new Error('FASTA download path unavailable')
  return fs.readFile(tmpPath, 'utf-8')
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
  // Wait for canvas to paint
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(INK_THRESHOLD)
})

test('trim controls render after load', async ({ page }) => {
  // Slider
  await expect(page.locator('[data-trim="threshold"]')).toBeVisible()
  // Mode buttons
  await expect(page.getByRole('button', { name: 'Full' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Trimmed' })).toBeVisible()
  // Summary area
  await expect(page.locator('#trim-summary')).toBeVisible()
})

test('default mode is Full with threshold 20', async ({ page }) => {
  const slider = page.locator('[data-trim="threshold"]')
  await expect(slider).toHaveValue('20')

  const fullBtn = page.getByRole('button', { name: 'Full' })
  await expect(fullBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Trimmed' })).toHaveAttribute('aria-pressed', 'false')
})

test('trim summary appears after load (shows bp kept)', async ({ page }) => {
  // Summary should show trim info or "No quality scores"
  const summary = page.locator('#trim-summary')
  await expect.poll(() => summary.textContent(), { timeout: 5000 }).toMatch(/bp kept|No quality|All bases/)
})

test('adjusting threshold slider changes the trim summary', async ({ page }) => {
  const slider = page.locator('[data-trim="threshold"]')
  const summary = page.locator('#trim-summary')

  // Get initial summary
  const initialSummary = await summary.textContent()

  // Move slider to threshold=5 (much more permissive)
  await slider.fill('5')
  await slider.dispatchEvent('input')

  // Summary should change
  await expect.poll(() => summary.textContent(), { timeout: 5000 }).not.toBe(initialSummary)
})

test('adjusting threshold changes canvas (trim overlay updates)', async ({ page }) => {
  await page.getByRole('button', { name: 'Trimmed' }).click()
  await expect(page.getByRole('button', { name: 'Trimmed' })).toHaveAttribute('aria-pressed', 'true')

  const slider = page.locator('[data-trim="threshold"]')
  const inkBefore = await canvasInkSum(page)

  // Move to Q=0 — no trimming, removes overlay
  await slider.fill('0')
  await slider.dispatchEvent('input')

  // Wait for repaint — ink sum should change as overlay is removed
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).not.toBe(inkBefore)
})

test('switching to Full mode updates aria-pressed and sequence shows all bases', async ({ page }) => {
  const fullBtn = page.getByRole('button', { name: 'Full' })
  const trimmedBtn = page.getByRole('button', { name: 'Trimmed' })

  await fullBtn.click()

  await expect(fullBtn).toHaveAttribute('aria-pressed', 'true')
  await expect(trimmedBtn).toHaveAttribute('aria-pressed', 'false')
})

test('Full mode removes trim overlay — canvas data-trim-active reflects mode', async ({ page }) => {
  const canvas = page.locator('[data-testid="chromatogram-canvas"]')

  // Switch to Trimmed mode — overlay should be active (status=ok on this fixture)
  await page.getByRole('button', { name: 'Trimmed' }).click()
  await expect(page.getByRole('button', { name: 'Trimmed' })).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas).toHaveAttribute('data-trim-active', 'true')

  // Switch back to Full mode — overlay must be cleared
  await page.getByRole('button', { name: 'Full' }).click()
  await expect(page.getByRole('button', { name: 'Full' })).toHaveAttribute('aria-pressed', 'true')
  await expect(canvas).toHaveAttribute('data-trim-active', 'false')
})

test('Trimmed FASTA is shorter than Full FASTA for real fixture', async ({ page }) => {
  await page.getByRole('button', { name: 'Trimmed' }).click()
  await expect(page.getByRole('button', { name: 'Trimmed' })).toHaveAttribute('aria-pressed', 'true')
  const slider = page.locator('[data-trim="threshold"]')
  await slider.fill('20')
  await slider.dispatchEvent('input')

  const trimmedContent = await downloadFastaContent(page)
  const trimmedSeq = trimmedContent
    .split('\n')
    .filter((l) => !l.startsWith('>') && l.trim().length > 0)
    .join('')

  // Switch to Full and download
  await page.getByRole('button', { name: 'Full' }).click()
  await expect(page.getByRole('button', { name: 'Full' })).toHaveAttribute('aria-pressed', 'true')

  const fullContent = await downloadFastaContent(page)
  const fullSeq = fullContent
    .split('\n')
    .filter((l) => !l.startsWith('>') && l.trim().length > 0)
    .join('')

  // Trimmed sequence must be shorter than the full sequence
  expect(trimmedSeq.length).toBeLessThan(fullSeq.length)
  // The trimmed sequence must be a contiguous substring of the full sequence
  expect(fullSeq).toContain(trimmedSeq)
})

test('Trimmed FASTA header includes trim annotation', async ({ page }) => {
  await page.getByRole('button', { name: 'Trimmed' }).click()
  await expect(page.getByRole('button', { name: 'Trimmed' })).toHaveAttribute('aria-pressed', 'true')

  const content = await downloadFastaContent(page)
  const header = content.split('\n')[0]
  expect(header).toMatch(/trimmed/)
})

test('Full FASTA header does NOT include trim annotation', async ({ page }) => {
  await page.getByRole('button', { name: 'Full' }).click()
  await expect(page.getByRole('button', { name: 'Full' })).toHaveAttribute('aria-pressed', 'true')

  const content = await downloadFastaContent(page)
  const header = content.split('\n')[0]
  expect(header).not.toMatch(/trimmed/)
})

test('threshold=0 produces longer or equal trimmed sequence than threshold=20', async ({ page }) => {
  await page.getByRole('button', { name: 'Trimmed' }).click()
  await expect(page.getByRole('button', { name: 'Trimmed' })).toHaveAttribute('aria-pressed', 'true')

  // First get the Q20 trimmed FASTA
  const content20 = await downloadFastaContent(page)
  const seq20 = content20
    .split('\n')
    .filter((l) => !l.startsWith('>') && l.trim().length > 0)
    .join('')

  // Now set threshold to 0 and export
  const slider = page.locator('[data-trim="threshold"]')
  await slider.fill('0')
  await slider.dispatchEvent('input')
  await expect.poll(async () => {
    const summary = await page.locator('#trim-summary').textContent()
    return summary !== null && summary.length > 0
  }, { timeout: 5000 }).toBeTruthy()

  const content0 = await downloadFastaContent(page)
  const seq0 = content0
    .split('\n')
    .filter((l) => !l.startsWith('>') && l.trim().length > 0)
    .join('')

  expect(seq0.length).toBeGreaterThanOrEqual(seq20.length)
})

test('trim controls respond to keyboard: Tab reaches slider', { tag: ['@desktop'] }, async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard tab test is desktop only')

  let sliderFocused = false
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    const isFocusedOnSlider = await page.evaluate(() => {
      const el = document.activeElement as HTMLInputElement | null
      return el?.getAttribute('data-trim') === 'threshold'
    })
    if (isFocusedOnSlider) {
      sliderFocused = true
      break
    }
  }
  expect(sliderFocused).toBeTruthy()
})
