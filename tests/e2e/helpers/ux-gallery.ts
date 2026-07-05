/**
 * tests/e2e/helpers/ux-gallery.ts
 *
 * Reusable capture primitives for the UX gallery spec.
 * Provides deterministic screenshot helpers that:
 *   - gate each capture on real rendered content
 *   - mask time-varying elements (status banners, timestamps)
 *   - return structured metadata alongside the image buffer
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

/**
 * Assert the chromatogram canvas has non-blank pixel content.
 * Throws if the canvas is blank — prevents vacuous screenshots.
 */
export async function assertCanvasNonBlank(page: Page): Promise<void> {
  const isNonBlank = await page.locator('[data-testid="chromatogram-canvas"]').evaluate((el) => {
    const canvas = el as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    const { width, height } = canvas
    if (width === 0 || height === 0) return false
    const data = ctx.getImageData(0, 0, width, height).data
    // Compute deviation from white (#fff = 255,255,255)
    let deviation = 0
    for (let i = 0; i < data.length; i += 4) {
      deviation += Math.abs(255 - data[i]) + Math.abs(255 - data[i + 1]) + Math.abs(255 - data[i + 2])
    }
    return deviation > 1000
  })
  if (!isNonBlank) {
    throw new Error('Chromatogram canvas is blank — aborting screenshot to prevent vacuous capture')
  }
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
 */
export async function routeSampleWithDelay(page: Page, delayMs = 300): Promise<() => Promise<void>> {
  const samplePath = path.resolve(process.cwd(), 'public/sample.ab1')
  const sampleBytes = await fs.readFile(samplePath)

  await page.route('**/sample.ab1', async (route) => {
    await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: sampleBytes,
    })
  })

  return async () => {
    await page.unroute('**/sample.ab1')
  }
}

/** Ensure the output directory exists, creating it recursively if needed. */
export async function ensureOutputDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}
