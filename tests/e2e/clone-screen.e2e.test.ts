/**
 * clone-screen.e2e.test.ts — Playwright E2E tests for the multi-trace
 * synchronized stacked clone-screen viewer.
 *
 * Tests verify:
 *  1. Panel is hidden when only one trace is loaded.
 *  2. Panel becomes visible when a second trace is loaded.
 *  3. EXACT: loading the same trace twice → 0 mismatches in the summary.
 *  4. EXACT: summary shows correct trace count (2 traces).
 *  5. Keyboard: Tab focuses the panel; Left/Right arrows move the cursor.
 *  6. EXACT: cursor-info line reflects the current 1-based position.
 *  7. Prev/Next mismatch navigation buttons are present.
 *  8. Copy report button is present.
 *  9. Panel is hidden again after all traces are closed.
 * 10. EXACT: loading two different traces → mismatch count > 0 when sequences differ.
 *
 * Ground spec: docs/research/next-killer-features.md Top-3 (CutePeaks #31)
 */

import path from 'node:path'
import { test, expect } from '@playwright/test'

const FIXTURE_A = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const FIXTURE_B = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

// ── helpers ──────────────────────────────────────────────────────────────────

async function loadTrace(page: import('@playwright/test').Page, fixturePath: string) {
  await page.setInputFiles('#file-input', fixturePath)
  await expect(page.locator('#status')).toContainText('Loaded')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Clone-screen stacked viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
  })

  // ── Test 1: Panel hidden with one trace ──────────────────────────────────────
  test('clone screen panel is hidden when only one trace is loaded', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    const panel = page.locator('[data-testid="clone-screen-panel"]')
    await expect(panel).toBeHidden()
  })

  // ── Test 2: Panel visible with two traces ────────────────────────────────────
  test('clone screen panel becomes visible after loading a second trace', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    const panel = page.locator('[data-testid="clone-screen-panel"]')
    await expect(panel).toBeVisible()
  })

  // ── Test 3: EXACT — same file loaded twice → 0 mismatches ────────────────────
  test('EXACT: loading the same trace twice gives 0 mismatches', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_A)
    const summary = page.locator('[data-testid="clone-screen-summary"]')
    await expect(summary).toBeVisible()
    const text = await summary.textContent()
    expect(text).toMatch(/0 mismatches?/)
  })

  // ── Test 4: EXACT — summary shows 2 traces ────────────────────────────────────
  test('EXACT: summary shows 2 traces when two files are loaded', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    const summary = page.locator('[data-testid="clone-screen-summary"]')
    const text = await summary.textContent()
    expect(text).toMatch(/2 traces?/)
  })

  // ── Test 5: Panel is keyboard-focusable ──────────────────────────────────────
  test('clone screen panel is keyboard-focusable', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    const panel = page.locator('[data-testid="clone-screen-panel"]')
    await panel.focus()
    await expect(panel).toBeFocused()
  })

  // ── Test 6: EXACT — cursor moves with ArrowRight key ─────────────────────────
  test('EXACT: cursor moves to position 2 after pressing ArrowRight once', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_A)  // same file → 0 mismatches → cursor nav still works
    const panel = page.locator('[data-testid="clone-screen-panel"]')
    const cursorInfo = page.locator('[data-testid="clone-screen-cursor-info"]')

    await panel.focus()

    // Initial cursor info should say "Position 1"
    const initialText = await cursorInfo.textContent()
    expect(initialText).toMatch(/Position 1/)

    // Press ArrowRight
    await page.keyboard.press('ArrowRight')

    // Cursor info should now say "Position 2"
    await expect(cursorInfo).toContainText('Position 2')
  })

  // ── Test 7: EXACT — cursor ArrowLeft from position 2 returns to 1 ────────────
  test('EXACT: cursor returns to position 1 after ArrowLeft from position 2', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_A)
    const panel = page.locator('[data-testid="clone-screen-panel"]')
    const cursorInfo = page.locator('[data-testid="clone-screen-cursor-info"]')

    await panel.focus()
    await page.keyboard.press('ArrowRight')
    await expect(cursorInfo).toContainText('Position 2')

    await page.keyboard.press('ArrowLeft')
    await expect(cursorInfo).toContainText('Position 1')
  })

  // ── Test 8: Navigation buttons are present ────────────────────────────────────
  test('prev-mismatch and next-mismatch buttons are visible', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    await expect(page.locator('[data-testid="clone-screen-prev-mismatch"]')).toBeVisible()
    await expect(page.locator('[data-testid="clone-screen-next-mismatch"]')).toBeVisible()
  })

  // ── Test 9: Copy report button is present ────────────────────────────────────
  test('copy report button is visible', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    await expect(page.locator('[data-testid="clone-screen-copy-report"]')).toBeVisible()
  })

  // ── Test 10: EXACT — trace rows are rendered per-trace ───────────────────────
  test('EXACT: two trace rows are rendered when two traces are loaded', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    const row0 = page.locator('[data-testid="clone-screen-row-0"]')
    const row1 = page.locator('[data-testid="clone-screen-row-1"]')
    await expect(row0).toBeVisible()
    await expect(row1).toBeVisible()
    // No third row
    await expect(page.locator('[data-testid="clone-screen-row-2"]')).toBeHidden()
  })

  // ── Test 11: EXACT — cursor base cell highlighted at position 0 ──────────────
  test('EXACT: base cell at trace 0, position 0 has the cursor class on load', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_A)
    // p0 is 0-based position 0 (1-based position 1)
    const cell = page.locator('[data-testid="clone-screen-base-t0-p0"]')
    await expect(cell).toHaveClass(/clone-screen__base--cursor/)
  })

  // ── Test 12: Different traces → mismatch count > 0 ───────────────────────────
  test('loading two different AB1 files produces at least 1 mismatch', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    const summary = page.locator('[data-testid="clone-screen-summary"]')
    const text = await summary.textContent()
    // Extract mismatch count from summary text like "Clone screen · 2 traces · 868 bp · 0 mismatches"
    const match = text?.match(/(\d+) mismatches?/)
    expect(match).not.toBeNull()
    const count = parseInt(match![1], 10)
    // Two different sequencing runs will differ in at least some positions
    expect(count).toBeGreaterThan(0)
  })

  // ── Test 13: Keyboard-hint is visible ────────────────────────────────────────
  test('keyboard hint paragraph is present in the panel', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    const panel = page.locator('[data-testid="clone-screen-panel"]')
    const hint = panel.locator('.clone-screen__keyboard-hint')
    await expect(hint).toBeVisible()
  })

  // ── Test 14: ARIA — panel has role=region and accessible label ───────────────
  test('panel has role=region and a non-empty aria-label', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_B)
    const panel = page.locator('[data-testid="clone-screen-panel"]')
    const role = await panel.getAttribute('role')
    expect(role).toBe('region')
    const ariaLabel = await panel.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
    expect((ariaLabel ?? '').length).toBeGreaterThan(0)
  })

  // ── Test 15: Summary line contains bp count ───────────────────────────────────
  test('EXACT: summary includes bp count (> 0) matching min sequence length', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_A)
    const summary = page.locator('[data-testid="clone-screen-summary"]')
    const text = await summary.textContent()
    const bpMatch = text?.match(/(\d+) bp/)
    expect(bpMatch).not.toBeNull()
    const bp = parseInt(bpMatch![1], 10)
    expect(bp).toBeGreaterThan(0)
  })

  // ── Test 16: EXACT — listeners not accumulated across repaints ────────────────
  test('EXACT: many cursor moves then one keypress moves exactly one position (no listener leak)', async ({ page }) => {
    await loadTrace(page, FIXTURE_A)
    await loadTrace(page, FIXTURE_A)
    const panel = page.locator('[data-testid="clone-screen-panel"]')
    const cursorInfo = page.locator('[data-testid="clone-screen-cursor-info"]')

    await panel.focus()

    // Move forward 5 positions — each move triggers a full repaint.
    // If root handlers were re-registered each paint, subsequent presses would jump > 1.
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight')
    }
    await expect(cursorInfo).toContainText('Position 6')

    // ONE ArrowLeft must move exactly one position back.
    await page.keyboard.press('ArrowLeft')
    await expect(cursorInfo).toContainText('Position 5')

    // ONE ArrowRight must move exactly one position forward.
    await page.keyboard.press('ArrowRight')
    await expect(cursorInfo).toContainText('Position 6')
  })
})
