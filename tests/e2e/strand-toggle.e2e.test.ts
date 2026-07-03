/**
 * Step 6 — Reverse-complement / strand view E2E tests
 *
 * Verifies the strand toggle button across desktop Chrome and the emulated iPad:
 *   ✓ Toggle button renders with correct initial label (5′→3′)
 *   ✓ Canvas changes (ink sum differs) after toggling strand
 *   ✓ Sequence panel text content changes after toggling strand
 *   ✓ Toggling twice returns to original canvas content (approximately)
 *   ✓ Hover tooltip still shows "peak:" data after toggling (desktop only)
 *   ✓ FASTA export header contains "revcomp" when strand is toggled
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

async function getSequenceText(page: Page): Promise<string> {
  return page.locator('.sequence-panel').textContent().then((t) => t ?? '')
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
  // Wait for canvas to paint
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(INK_THRESHOLD)
})

test('strand toggle button has correct initial label', async ({ page }) => {
  const btn = page.getByRole('button', { name: /5′→3′/ })
  await expect(btn).toBeVisible()
  await expect(btn).toHaveAttribute('aria-pressed', 'false')
})

test('toggling strand changes canvas content', async ({ page }) => {
  const inkBefore = await canvasInkSum(page)
  const seqBefore = await getSequenceText(page)

  await page.getByRole('button', { name: /5′→3′/ }).click()
  // Wait for the sequence panel to reflect the revcomp (unambiguous non-pixel check)
  await expect.poll(() => getSequenceText(page), { timeout: 5000 }).not.toBe(seqBefore)
  // Also wait for the canvas ink sum to change from pre-toggle (not merely be non-zero)
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).not.toBe(inkBefore)
  const inkAfter = await canvasInkSum(page)

  // The reverse-complement renders different channel assignments so pixel content changes
  expect(inkAfter).not.toBe(inkBefore)
})

test('toggle button label flips to 3′→5′ when active and back on re-click', async ({ page }) => {
  const btn = page.getByRole('button', { name: /5′→3′/ })

  await btn.click()
  await expect(page.getByRole('button', { name: /3′→5′/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /3′→5′/ })).toHaveAttribute('aria-pressed', 'true')

  // Click again to revert
  await page.getByRole('button', { name: /3′→5′/ }).click()
  await expect(page.getByRole('button', { name: /5′→3′/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /5′→3′/ })).toHaveAttribute('aria-pressed', 'false')
})

test('sequence panel content changes after strand toggle', async ({ page }) => {
  const seqBefore = await getSequenceText(page)

  await page.getByRole('button', { name: /5′→3′/ }).click()
  // Panel re-renders synchronously on toggle; wait for a mutation
  await expect.poll(() => getSequenceText(page), { timeout: 5000 }).not.toBe(seqBefore)

  const seqAfter = await getSequenceText(page)
  expect(seqAfter).not.toBe(seqBefore)
})

test('toggling strand twice restores roughly the original canvas', async ({ page }) => {
  const inkOriginal = await canvasInkSum(page)
  const seqOriginal = await getSequenceText(page)

  // First toggle — wait for ink to actually change from original (proves repaint happened)
  await page.getByRole('button', { name: /5′→3′/ }).click()
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).not.toBe(inkOriginal)
  const inkAfterFirst = await canvasInkSum(page)

  // Second toggle — wait for ink to change from the toggled state before sampling restored value
  await page.getByRole('button', { name: /3′→5′/ }).click()
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).not.toBe(inkAfterFirst)

  // Sequence panel must return to forward-strand sequence (unambiguous, non-pixel check)
  await expect.poll(() => getSequenceText(page), { timeout: 5000 }).toBe(seqOriginal)

  const inkRestored = await canvasInkSum(page)
  // Allow a small tolerance (≤1% of original) for floating-point / rAF timing differences
  expect(Math.abs(inkRestored - inkOriginal)).toBeLessThanOrEqual(inkOriginal * 0.01 + 100)
})

test('hover tooltip still shows peak data after strand toggle (desktop only)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover tooltip only applies to pointer devices')

  await page.getByRole('button', { name: /5′→3′/ }).click()
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(INK_THRESHOLD)

  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas bounding box unavailable')

  let tooltipVisible = false
  for (let step = 1; step <= 12; step++) {
    await page.mouse.move(box.x + (box.width * step) / 13, box.y + box.height / 2)
    if (await page.locator('.tooltip').isVisible()) {
      tooltipVisible = true
      break
    }
  }

  expect(tooltipVisible).toBeTruthy()
  await expect(page.locator('.tooltip')).toContainText('peak:')
})

test('strand toggle button is keyboard-accessible and aria-pressed updates correctly', { tag: ['@desktop'] }, async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation testing is desktop only')

  // Tab until we land on the strand toggle button
  let found = false
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    const actionAttr = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('data-action') ?? '')
    if (actionAttr === 'toggle-strand') {
      found = true
      break
    }
  }
  expect(found).toBeTruthy()

  // Initially aria-pressed should be false
  const btn = page.locator('[data-action="toggle-strand"]')
  await expect(btn).toHaveAttribute('aria-pressed', 'false')

  // Activate with Space key
  const inkBeforeSpace = await canvasInkSum(page)
  await page.keyboard.press('Space')
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).not.toBe(inkBeforeSpace)
  await expect(btn).toHaveAttribute('aria-pressed', 'true')

  // Activate again with Enter key to revert
  const inkBeforeEnter = await canvasInkSum(page)
  await page.keyboard.press('Enter')
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).not.toBe(inkBeforeEnter)
  await expect(btn).toHaveAttribute('aria-pressed', 'false')
})

test('FASTA export header contains revcomp when strand is toggled', async ({ page }) => {
  await page.getByRole('button', { name: /5′→3′/ }).click()
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(INK_THRESHOLD)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export FASTA' }).click(),
  ])

  expect(download.suggestedFilename()).toContain('revcomp')

  const tmpPath = await download.path()
  expect(tmpPath).toBeTruthy()
  const content = await fs.readFile(tmpPath!, 'utf-8')

  // Header must mention revcomp
  const firstLine = content.split('\n')[0]
  expect(firstLine).toContain('revcomp')

  // Sequence lines must still be valid ACGTN bases
  const seqLines = content.trim().split('\n').slice(1)
  for (const line of seqLines) {
    expect(line).toMatch(/^[ACGTNacgtnRYSWKMBVDH]+$/)
  }
})
