import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

// Acceptance + regression coverage for the chromatogram hover tooltip overflowing
// the viewport near the right edge.
//
// Base behavior (SHA d7df6b1): showTooltip() places the tooltip at cursor+10 with no
// viewport clamping (src/components/Tooltip.ts:9-15), so hovering near the canvas's
// right edge pushes the tooltip's right edge past the viewport (~865.66px at an 800px
// viewport) and its peak/amplitude readout is clipped off-screen.
//
// Expected behavior: when cursor+10+width would overflow, the tooltip mirror-flips to
// the cursor's opposite side (and clamps to >= 0) so its right edge lands inside the
// viewport (~769px) and is never clipped.
//
// This spec is intentionally e2e: Vitest runs with environment 'node' and excludes
// tests/e2e/** (vite.config.ts), and there is no jsdom/happy-dom available, so a DOM
// unit test of showTooltip is not feasible. Existing tooltip coverage is likewise e2e
// (tests/e2e/base-inspector.e2e.test.ts).

// Force an 800px-wide viewport: the desktop project default is Desktop Chrome 1280x720,
// which is too wide for a right-edge hover to overflow.
test.use({ viewport: { width: 800, height: 720 } })

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const VIEWPORT_WIDTH = 800

async function loadFixture(page: Page): Promise<void> {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
}

test(
  'hover tooltip stays within the viewport near the right edge',
  { tag: ['@desktop'] },
  async ({ page, isMobile }) => {
    // The unfiltered tablet/iPad project has no mouse hover; skip there as the existing
    // hover specs do (tests/e2e/base-inspector.e2e.test.ts:75).
    test.skip(isMobile, 'tablet/touch project does not support mouse hover checks')

    await loadFixture(page)

    const canvas = page.locator('[data-testid="chromatogram-canvas"]')
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Chromatogram canvas not visible')

    // Hover as far to the right of the canvas as possible so a base is still hit but the
    // default cursor+10 placement would overflow the 800px viewport.
    const hoverX = box.x + box.width - 2
    const hoverY = box.y + box.height / 2
    await page.mouse.move(hoverX, hoverY)

    const tooltip = page.locator('.tooltip')
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText('peak:')

    const tooltipBox = await tooltip.boundingBox()
    if (!tooltipBox) throw new Error('Tooltip not measurable')

    // Acceptance: the tooltip's right edge must land inside the viewport, and its left
    // edge must not be clamped off-screen to the left.
    expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(VIEWPORT_WIDTH)
    expect(tooltipBox.x).toBeGreaterThanOrEqual(0)
  }
)
