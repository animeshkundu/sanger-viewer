/**
 * Amplitude (vertical) scale — end-to-end acceptance test.
 *
 * Exercises the NEW user-facing capability through the repo's existing Playwright
 * harness: a range control in the Controls "View" group that amplifies the
 * chromatogram's vertical excursion independently of horizontal zoom.
 *
 * Acceptance journey:
 *   ✓ the amplitude control renders in the View group after a trace loads
 *   ✓ it defaults to 1× (no vertical amplification)
 *   ✓ raising it to 4× sets the canvas `data-amplitude-scale` attribute to "4",
 *     increases the rendered ink (low peaks amplified), and leaves the horizontal
 *     viewport (`data-viewport-spp`) unchanged
 *
 * On the untouched base this FAILS: `input[data-amplitude="scale"]` does not
 * exist (the locator times out) and no `data-amplitude-scale` attribute is
 * emitted. It PASSES once the control and renderer wiring are implemented.
 */

import path from 'node:path'
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

async function viewportSpp(page: Page): Promise<string | null> {
  return page
    .locator('[data-testid="chromatogram-canvas"]')
    .getAttribute('data-viewport-spp')
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(INK_THRESHOLD)
})

test('amplitude control renders inside the View group', async ({ page }) => {
  const control = page.locator('input[data-amplitude="scale"]')
  await expect(control).toBeVisible()
  // It must live in the View controls group, alongside zoom/fit.
  const inViewGroup = page.locator('[data-group="view"] input[data-amplitude="scale"]')
  await expect(inViewGroup).toHaveCount(1)
})

test('amplitude control defaults to 1x', async ({ page }) => {
  const control = page.locator('input[data-amplitude="scale"]')
  await expect(control).toHaveValue('1')
  await expect(control).toHaveAttribute('min', '0.25')
  await expect(control).toHaveAttribute('max', '8')
  await expect(control).toHaveAttribute('step', '0.25')
})

test('raising amplitude amplifies vertical ink without touching horizontal zoom', async ({ page }) => {
  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const control = page.locator('input[data-amplitude="scale"]')

  const inkBefore = await canvasInkSum(page)
  const sppBefore = await viewportSpp(page)

  await control.fill('4')
  await control.dispatchEvent('input')

  // The renderer records the active amplitude scale on the canvas.
  await expect(canvas).toHaveAttribute('data-amplitude-scale', '4')

  // Vertical amplification increases the amount of drawn signal.
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(inkBefore)

  // Horizontal viewport (samples-per-pixel) must be untouched — this is a
  // vertical-only control, independent of zoom.
  expect(await viewportSpp(page)).toBe(sppBefore)
})
