/**
 * tests/e2e/helpers/ux-gallery.ts
 *
 * Reusable capture primitives for the UX gallery spec.
 * Provides deterministic screenshot helpers that:
 *   - gate each capture on real rendered content (canvas variance check)
 *   - return structured metadata alongside the image buffer
 *
 * Note: none of the captured states currently contain time-varying elements
 * (banners or timestamps) — the trace run-date is read from the fixture file
 * and is therefore deterministic.  If future states expose dynamic content,
 * add a `mask` option to `page.screenshot()` in captureState().
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { type Page, expect } from '@playwright/test'

export type Theme = 'light' | 'dark'
export type UxState =
  | 'hero-on-load'
  | 'sidebar-expanded'
  | 'sidebar-collapsed'
  | 'inspect-panel'
  | 'map-panel'
  | 'analyze-panel'
  | 'share-panel'
  | 'empty-state'
  | 'loading-state'
  | 'toolbar-export-menu'
  | 'keyboard-focus'
  | 'hover-tooltip'

export interface CaptureEntry {
  state: UxState
  theme: Theme
  viewport: string
  filePath: string
}

/** Force reduced-motion and set colour scheme before any navigation. */
export async function setupPage(page: Page, theme: Theme): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme })
}

/** Wait for the deterministic sample.ab1 to finish loading. */
export async function waitForSampleLoad(page: Page): Promise<void> {
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1', { timeout: 30_000 })
}

/** Minimum luminance variance across pixels to consider the canvas non-blank.
 *
 * Variance is computed over per-pixel luminance: Σ((L_i − mean)²) / N
 * where L_i = (R_i + G_i + B_i) / 3.  A canvas uniformly filled with
 * any single colour (white, the dark-theme surface #1e293b, any other
 * background) has L_i = constant → variance = 0 and will FAIL this check.
 * A chromatogram with coloured peaks (A/C/G/T on a contrasting background)
 * has luminances that vary significantly → variance >> 100.
 */
export const MIN_CANVAS_VARIANCE_THRESHOLD = 100

/**
 * Compute luminance variance across pixels from raw ImageData bytes.
 * Exported so unit tests can verify the check against synthetic pixel arrays.
 *
 * Uses Welford's online algorithm for a single-pass, numerically stable
 * variance computation.  Luminance per pixel is (R + G + B) / 3.
 * Returns 0 for any uniform fill and increases with visual content.
 *
 * @param data       Raw RGBA bytes from `ctx.getImageData(...).data`
 * @param pixelCount Total number of pixels (width × height)
 * @returns          Luminance variance across pixels; 0 for a uniform fill.
 */
export function computePixelVariance(data: Uint8ClampedArray, pixelCount: number): number {
  if (pixelCount === 0) return 0
  // Welford's online algorithm — single pass, numerically stable
  let mean = 0
  let m2 = 0
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
    count++
    const delta = lum - mean
    mean += delta / count
    m2 += delta * (lum - mean)
  }
  return count < 2 ? 0 : m2 / count
}

/**
 * Assert the chromatogram canvas has non-blank pixel content.
 *
 * Uses luminance VARIANCE across pixels so a canvas uniformly filled with
 * any single colour (white light-theme fill or the dark-theme surface
 * #1e293b) is correctly detected as blank.  Only a canvas with genuinely
 * distinct pixel luminances (i.e. real trace peaks) passes the check.
 * Throws if the canvas is blank — prevents vacuous screenshots.
 */
export async function assertCanvasNonBlank(page: Page): Promise<void> {
  await expect.poll(async () => (
    page.locator('[data-testid="chromatogram-canvas"]').evaluate((el) => {
      const canvas = el as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx) return 0
      const { width, height } = canvas
      if (width === 0 || height === 0) return 0
      const data = ctx.getImageData(0, 0, width, height).data
      // Welford's online algorithm — single-pass luminance variance
      // Uniform fill (any color) → variance ≈ 0; real trace → variance >> threshold
      let mean = 0
      let m2 = 0
      let count = 0
      for (let i = 0; i < data.length; i += 4) {
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
        count++
        const delta = lum - mean
        mean += delta / count
        m2 += delta * (lum - mean)
      }
      return count < 2 ? 0 : m2 / count
    })
  ), {
    message: 'Chromatogram canvas remained blank (uniform fill detected)',
    timeout: 5_000,
  }).toBeGreaterThan(MIN_CANVAS_VARIANCE_THRESHOLD)
}

/**
 * Save a screenshot to the UX gallery output directory and return the entry metadata.
 * @param page       Playwright Page
 * @param state      UX state label
 * @param theme      'light' | 'dark'
 * @param outputDir  Absolute path to the gallery screenshots folder
 */
export async function captureState(
  page: Page,
  state: UxState,
  theme: Theme,
  outputDir: string,
): Promise<CaptureEntry> {
  const viewportSize = page.viewportSize()
  const viewport = viewportSize
    ? `${viewportSize.width}x${viewportSize.height}`
    : 'unknown'

  const filename = `${state}__${theme}__${viewport}.png`
  const filePath = path.join(outputDir, filename)

  await page.screenshot({
    path: filePath,
    animations: 'disabled',
  })

  return { state, theme, viewport, filePath }
}

/**
 * Route sample.ab1 through a 300 ms artificial delay so the loading banner
 * is reliably visible before it resolves.  Returns a cleanup function.
 *
 * Guards against double-handling: some Chromium configurations (e.g. iPad
 * emulation) issue more than one request for the same resource (a speculative
 * prefetch plus the actual fetch).  Only the FIRST request gets the delay +
 * fulfil; any subsequent requests are passed straight through to the network
 * so they do not cause a "Route is already handled!" error.
 */
export async function routeSampleWithDelay(page: Page, delayMs = 300): Promise<() => Promise<void>> {
  const samplePath = path.resolve(process.cwd(), 'public/sample.ab1')
  const sampleBytes = await fs.readFile(samplePath)

  let handled = false
  await page.route('**/sample.ab1', async (route) => {
    if (handled) {
      await route.continue()
      return
    }
    handled = true
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: sampleBytes,
    })
  })

  return async () => {
    handled = false
    await page.unroute('**/sample.ab1')
  }
}

/** Ensure the output directory exists, creating it recursively if needed. */
export async function ensureOutputDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}
