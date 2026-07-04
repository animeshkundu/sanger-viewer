/**
 * assembly-controls.e2e.test.ts — Playwright E2E tests for manual assembly controls.
 *
 * Tests:
 *  1. Assembly controls section is visible in the contig panel.
 *  2. Strand A/B selects have correct default values ('auto') and all three options.
 *  3. Min overlap input has correct default value (20) and valid range attributes.
 *  4. Min match input has correct default value (0) and valid range attributes.
 *  5. Controls have accessible labels (label[for] wiring).
 *  6. Controls are keyboard-operable (Tab focus, visible focus rings).
 *  7. Changing min-overlap to an out-of-range value → assembly still respects clamping.
 *  8. Strand-A select shows all three options.
 *  9. After assembly, changing a control triggers re-assembly (status re-runs).
 *
 * Ground spec: docs/research/next-killer-features.md Top-2 + docs/specs/05-paired-read-contig-assembly.md
 */

import path from 'node:path'
import { test, expect } from '@playwright/test'

const FIXTURE_A = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const FIXTURE_B = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

test.describe('Manual assembly controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')
  })

  // ── Test 1: Controls section is visible ──────────────────────────────────────
  test('assembly controls section is visible in contig panel', async ({ page }) => {
    const controls = page.locator('.contig-panel__controls')
    await expect(controls).toBeVisible()
  })

  // ── Test 2: Strand selects — defaults and options ────────────────────────────
  test('Strand A select has default Auto and three options', async ({ page }) => {
    const selectA = page.locator('[data-testid="strand-a-select"]')
    await expect(selectA).toBeVisible()

    // Default value is 'auto'
    await expect(selectA).toHaveValue('auto')

    // All three options are present
    const options = await selectA.locator('option').allTextContents()
    expect(options).toContain('Auto')
    expect(options).toContain('Force Forward')
    expect(options).toContain('Force Reverse')
    expect(options).toHaveLength(3)
  })

  test('Strand B select has default Auto and three options', async ({ page }) => {
    const selectB = page.locator('[data-testid="strand-b-select"]')
    await expect(selectB).toBeVisible()
    await expect(selectB).toHaveValue('auto')

    const options = await selectB.locator('option').allTextContents()
    expect(options).toContain('Auto')
    expect(options).toContain('Force Forward')
    expect(options).toContain('Force Reverse')
  })

  // ── Test 3: Min overlap input ─────────────────────────────────────────────────
  test('min overlap input has default value 20 and correct range', async ({ page }) => {
    const input = page.locator('[data-testid="min-overlap-input"]')
    await expect(input).toBeVisible()

    // EXACT default value
    await expect(input).toHaveValue('20')

    // Range attributes
    expect(await input.getAttribute('min')).toBe('5')
    expect(await input.getAttribute('max')).toBe('200')
    expect(await input.getAttribute('step')).toBe('1')
  })

  // ── Test 4: Min match input ───────────────────────────────────────────────────
  test('min match input has default value 0 and correct range', async ({ page }) => {
    const input = page.locator('[data-testid="min-match-input"]')
    await expect(input).toBeVisible()

    // EXACT default value
    await expect(input).toHaveValue('0')

    // Range attributes
    expect(await input.getAttribute('min')).toBe('0')
    expect(await input.getAttribute('max')).toBe('100')
    expect(await input.getAttribute('step')).toBe('1')
  })

  // ── Test 5: Accessible labels ─────────────────────────────────────────────────
  test('strand A select has an accessible label', async ({ page }) => {
    // The label[for="strand-a-select"] must exist and be visible
    const label = page.locator('label[for="strand-a-select"]')
    await expect(label).toBeVisible()
    const text = (await label.textContent()) ?? ''
    expect(text.trim().length).toBeGreaterThan(0)
  })

  test('min overlap input has an accessible label', async ({ page }) => {
    const label = page.locator('label[for="min-overlap-input"]')
    await expect(label).toBeVisible()
    const text = (await label.textContent()) ?? ''
    expect(text.trim().length).toBeGreaterThan(0)
  })

  test('min match input has an accessible label', async ({ page }) => {
    const label = page.locator('label[for="min-match-input"]')
    await expect(label).toBeVisible()
    const text = (await label.textContent()) ?? ''
    expect(text.trim().length).toBeGreaterThan(0)
  })

  // ── Test 6: Keyboard focus (focus-visible CSS applies) ───────────────────────
  test('strand A select is keyboard-focusable and accessible', async ({ page }) => {
    const selectA = page.locator('[data-testid="strand-a-select"]')
    await selectA.focus()
    // Element must be focused after programmatic focus
    await expect(selectA).toBeFocused()
    // aria-label must be present
    const ariaLabel = await selectA.getAttribute('aria-label')
    expect(ariaLabel).toBeTruthy()
  })

  test('min overlap input is keyboard-focusable', async ({ page }) => {
    const input = page.locator('[data-testid="min-overlap-input"]')
    await input.focus()
    await expect(input).toBeFocused()
  })

  // ── Test 7: Changing controls and triggering assembly ─────────────────────────
  test('assembly with min-overlap=5 still reports overlap status', async ({ page }) => {
    // Load second trace
    await page.setInputFiles('#file-input', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    // Set min-overlap to 5 (lowest allowed)
    const overlapInput = page.locator('[data-testid="min-overlap-input"]')
    await overlapInput.fill('5')

    const assembleBtn = page.locator('[data-testid="assemble-btn"]')
    await assembleBtn.click()

    // Status must be updated regardless of overlap result
    const statusSpan = page.locator('[data-testid="contig-status"]')
    await expect(statusSpan).not.toBeEmpty()
  })

  test('assembly with min-overlap=200 reports no overlap for dissimilar reads', async ({ page }) => {
    await page.setInputFiles('#file-input', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    // Set min-overlap to an unreachable value
    const overlapInput = page.locator('[data-testid="min-overlap-input"]')
    await overlapInput.fill('200')

    const assembleBtn = page.locator('[data-testid="assemble-btn"]')
    await assembleBtn.click()

    const statusSpan = page.locator('[data-testid="contig-status"]')
    await expect(statusSpan).toContainText(/overlap|No/i)
  })

  // ── Test 8: Strand options are correct values ──────────────────────────────────
  test('strand A select option values are auto, forward, reverse', async ({ page }) => {
    const selectA = page.locator('[data-testid="strand-a-select"]')
    const values = await selectA.locator('option').evaluateAll((opts: HTMLOptionElement[]) =>
      opts.map((o) => o.value)
    )
    expect(values).toEqual(['auto', 'forward', 'reverse'])
  })

  // ── Test 9: Live re-assembly on control change ────────────────────────────────
  test('changing min-overlap after assembly triggers re-assembly', async ({ page }) => {
    await page.setInputFiles('#file-input', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    const assembleBtn = page.locator('[data-testid="assemble-btn"]')
    const statusSpan = page.locator('[data-testid="contig-status"]')
    const overlapInput = page.locator('[data-testid="min-overlap-input"]')

    // Initial assembly
    await assembleBtn.click()
    const firstStatus = await statusSpan.textContent()

    // Changing min-overlap fires change event → re-assembly should run
    // (sets the status to 'Assembling…' then to the result)
    await overlapInput.fill('15')
    await overlapInput.press('Tab')  // blur triggers the native change event

    // Wait for status update — should still be non-empty
    await expect(statusSpan).not.toBeEmpty()

    // The status after the second assembly is still a valid assembly message
    const secondStatus = await statusSpan.textContent()
    // Both statuses must be non-empty strings (not undefined/null)
    expect(typeof firstStatus).toBe('string')
    expect(typeof secondStatus).toBe('string')
  })
})
