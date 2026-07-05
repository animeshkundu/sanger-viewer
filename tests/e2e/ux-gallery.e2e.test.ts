/**
 * tests/e2e/ux-gallery.e2e.test.ts
 *
 * Dedicated Playwright UX-gallery capture spec.
 *
 * Captures the FULL enumerated state × theme × viewport matrix:
 *
 *   States: hero-on-load, sidebar-expanded, sidebar-collapsed,
 *           inspect-panel, map-panel, analyze-panel, share-panel,
 *           empty-state, loading-state, toolbar-export-menu,
 *           keyboard-focus, hover-tooltip
 *
 *   Themes: light, dark
 *
 *   Viewports: driven by the Playwright project that runs this spec
 *              (desktop 1280×720, tablet 810×1080, narrow-mobile 360×640)
 *
 * Determinism guarantees:
 *   - prefers-reduced-motion: reduce (emulated)
 *   - fixed viewport per project
 *   - deterministic sample.ab1 auto-load
 *   - time-varying content (banners, timestamps) masked/stabilized
 *
 * Genuineness guards:
 *   - canvas non-blank check before every chromatogram screenshot
 *   - expected elements asserted visible before every panel screenshot
 *   - completeness assertion: fails if any matrix entry is missing
 *
 * Output: screenshots written to ux-gallery-screenshots/ at repo root.
 *         The CI job subsequently runs scripts/generate-ux-gallery-html.ts
 *         to bundle everything into a self-contained HTML artifact.
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { openSidebarTab } from './helpers/sidebar'
import {
  type Theme,
  type UxState,
  type CaptureEntry,
  setupPage,
  waitForSampleLoad,
  assertCanvasNonBlank,
  captureState,
  routeSampleWithDelay,
  ensureOutputDir,
} from './helpers/ux-gallery'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.resolve(process.cwd(), 'ux-gallery-screenshots')

/** Safety limit on Tab presses when searching for a specific focusable element. */
const MAX_TAB_ITERATIONS = 30

/** Every state that must be captured. Test fails if any is missing. */
const REQUIRED_STATES: UxState[] = [
  'hero-on-load',
  'sidebar-expanded',
  'sidebar-collapsed',
  'inspect-panel',
  'map-panel',
  'analyze-panel',
  'share-panel',
  'empty-state',
  'loading-state',
  'toolbar-export-menu',
  'keyboard-focus',
  'hover-tooltip',
]

const THEMES: Theme[] = ['light', 'dark']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistrar() {
  const captured: CaptureEntry[] = []
  return {
    add(entry: CaptureEntry) {
      captured.push(entry)
    },
    get all() {
      return captured
    },
  }
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('UX gallery capture', () => {
  // Run sequentially — captures to shared disk; order must be predictable.
  test.describe.configure({ mode: 'serial' })

  for (const theme of THEMES) {
    test.describe(`theme: ${theme}`, () => {
      // Track which states were captured for this theme × viewport combination.
      let registry: ReturnType<typeof makeRegistrar>

      test.beforeAll(async () => {
        await ensureOutputDir(OUTPUT_DIR)
        registry = makeRegistrar()
      })

      // -----------------------------------------------------------------------
      // hero-on-load + sidebar-expanded
      // -----------------------------------------------------------------------
      test(`${theme} — hero on load + sidebar expanded`, async ({ page }) => {
        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)
        await assertCanvasNonBlank(page)

        // Ensure sidebar is open (default)
        await expect(page.locator('.shell-sidebar')).toHaveAttribute('data-sidebar-open', 'true')

        registry.add(await captureState(page, 'hero-on-load', theme, OUTPUT_DIR))
        registry.add(await captureState(page, 'sidebar-expanded', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // sidebar-collapsed
      // -----------------------------------------------------------------------
      test(`${theme} — sidebar collapsed`, async ({ page }) => {
        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)
        await assertCanvasNonBlank(page)

        await page.locator('.sidebar-toggle-btn').click()
        await expect(page.locator('.shell-sidebar')).toHaveAttribute('data-sidebar-open', 'false')

        registry.add(await captureState(page, 'sidebar-collapsed', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // inspect-panel
      // -----------------------------------------------------------------------
      test(`${theme} — inspect panel`, async ({ page }) => {
        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)

        await openSidebarTab(page, 'inspect')
        await expect(page.locator('#sidebar-panel-inspect')).toBeVisible()
        await expect(page.locator('#search-input')).toBeVisible()

        registry.add(await captureState(page, 'inspect-panel', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // map-panel
      // -----------------------------------------------------------------------
      test(`${theme} — map panel`, async ({ page }) => {
        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)

        await openSidebarTab(page, 'map')
        await expect(page.locator('#sidebar-panel-map')).toBeVisible()
        await expect(page.locator('[data-testid="plasmid-map"]')).toBeVisible()

        registry.add(await captureState(page, 'map-panel', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // analyze-panel
      // -----------------------------------------------------------------------
      test(`${theme} — analyze panel`, async ({ page }) => {
        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)

        await openSidebarTab(page, 'analyze')
        await expect(page.locator('#sidebar-panel-analyze')).toBeVisible()
        await expect(page.locator('[data-testid="contig-panel"]')).toBeVisible()

        registry.add(await captureState(page, 'analyze-panel', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // share-panel
      // -----------------------------------------------------------------------
      test(`${theme} — share panel`, async ({ page }) => {
        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)

        await openSidebarTab(page, 'share')
        await expect(page.locator('#sidebar-panel-share')).toBeVisible()
        await expect(page.locator('[data-testid="share-view-btn"]')).toBeVisible()

        registry.add(await captureState(page, 'share-panel', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // empty-state  (close the last workspace slot to reach the genuine
      //               no-file state; blocking sample.ab1 would give error
      //               state instead because loadSample() catches fetch errors)
      // -----------------------------------------------------------------------
      test(`${theme} — empty state`, async ({ page }) => {
        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)

        // Close the only open workspace slot — when no slots remain the app
        // transitions to its genuine empty state (#empty-state loses 'hidden').
        const closeBtn = page.locator('.workspace-bar__tab').first().locator('.workspace-bar__tab-close')
        await expect(closeBtn).toBeVisible({ timeout: 5_000 })
        await closeBtn.click()

        await expect(page.locator('#empty-state')).toBeVisible({ timeout: 10_000 })

        registry.add(await captureState(page, 'empty-state', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // loading-state (sample.ab1 delayed 300 ms)
      // -----------------------------------------------------------------------
      test(`${theme} — loading state`, async ({ page }) => {
        await setupPage(page, theme)
        const cleanup = await routeSampleWithDelay(page, 300)

        await page.goto('')
        await expect(page.locator('#loading-banner')).toBeVisible({ timeout: 10_000 })

        registry.add(await captureState(page, 'loading-state', theme, OUTPUT_DIR))
        await cleanup()
      })

      // -----------------------------------------------------------------------
      // toolbar-export-menu
      // -----------------------------------------------------------------------
      test(`${theme} — toolbar export menu`, async ({ page }) => {
        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)
        await assertCanvasNonBlank(page)

        // Open the Export ▾ dropdown
        const exportBtn = page.locator('[data-testid="export-menu-btn"]')
        await expect(exportBtn).toBeVisible({ timeout: 10_000 })
        await exportBtn.click()
        await expect(page.locator('[data-testid="export-menu"]')).toBeVisible()

        registry.add(await captureState(page, 'toolbar-export-menu', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // keyboard-focus (desktop only; skip on touch/mobile where focus rings
      // behave differently and are less meaningful for UX assessment)
      // -----------------------------------------------------------------------
      test(`${theme} — keyboard focus state`, async ({ page, isMobile }) => {
        test.skip(isMobile, 'keyboard focus screenshots are desktop-only')

        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)

        // Tab until the sidebar toggle is focused — it's early in the tab order
        // and produces a clear, representative focus-ring screenshot.
        for (let i = 0; i < MAX_TAB_ITERATIONS; i++) {
          await page.keyboard.press('Tab')
          const matches = await page.evaluate(() =>
            document.activeElement?.matches('.sidebar-toggle-btn') ?? false
          )
          if (matches) break
        }
        await expect(page.locator('.sidebar-toggle-btn')).toBeFocused()

        registry.add(await captureState(page, 'keyboard-focus', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // hover-tooltip (desktop only; not available on touch devices)
      // -----------------------------------------------------------------------
      test(`${theme} — hover tooltip`, async ({ page, isMobile }) => {
        test.skip(isMobile, 'hover tooltip screenshots are desktop-only')

        await setupPage(page, theme)
        await page.goto('')
        await waitForSampleLoad(page)
        await assertCanvasNonBlank(page)

        // Hover over the centre of the chromatogram canvas to trigger the base tooltip.
        const canvas = page.locator('[data-testid="chromatogram-canvas"]')
        const box = await canvas.boundingBox()
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
          // Give the tooltip a moment to appear
          await page.waitForTimeout(300)
        }

        registry.add(await captureState(page, 'hover-tooltip', theme, OUTPUT_DIR))
      })

      // -----------------------------------------------------------------------
      // Completeness gate — all required states must have been captured.
      // -----------------------------------------------------------------------
      test(`${theme} — completeness gate`, async ({ page }) => {
        const capturedStates = new Set(registry.all.map((e) => e.state))

        // On mobile projects, keyboard-focus and hover-tooltip are intentionally
        // skipped; exclude them from the completeness check.
        const isMobileViewport = (page.viewportSize()?.width ?? 1280) < 600
        const skipOnMobile: UxState[] = ['keyboard-focus', 'hover-tooltip']

        const expected = isMobileViewport
          ? REQUIRED_STATES.filter((s) => !skipOnMobile.includes(s))
          : REQUIRED_STATES

        for (const state of expected) {
          expect(capturedStates.has(state), `Missing capture for state: ${state} (theme: ${theme})`).toBe(true)
        }

        // Write a JSON manifest so the HTML generator can enumerate files.
        const manifestPath = path.join(OUTPUT_DIR, `manifest-${theme}-${page.viewportSize()?.width ?? 'unknown'}.json`)
        await fs.writeFile(manifestPath, JSON.stringify(registry.all, null, 2), 'utf-8')
      })
    })
  }
})
