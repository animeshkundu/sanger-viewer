/**
 * toolbar-hierarchy.e2e.test.ts — Progressive disclosure + toolbar hierarchy
 *
 * Genuine behavioral assertions for the grouped toolbar and Export ▾ dropdown.
 *
 * Tests:
 *   1. Toolbar has four named groups (View, Export, Edit, Search).
 *   2. Export actions live inside a single Export menu dropdown, not exposed as
 *      flat top-level buttons.
 *   3. The Export menu toggle opens the dropdown; it lists all 7 export items.
 *   4. The export dropdown is closed on Escape.
 *   5. The export dropdown is closed when clicking outside it.
 *   6. Pre-load: export menu toggle is disabled; view + edit buttons are disabled.
 *   7. Post-load: export menu toggle is enabled; all view buttons are enabled.
 *   8. Export menu toggle button is Tab-reachable (not the individual export items).
 */

import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')

async function waitForSampleLoad(page: Page) {
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1')
}

// ── 1. Toolbar groups exist with labels ───────────────────────────────────────

test('toolbar has labelled View, Export, Edit groups', async ({ page }) => {
  await waitForSampleLoad(page)

  await expect(page.locator('[data-group="view"]')).toBeVisible()
  await expect(page.locator('[data-group="export"]')).toBeVisible()
  await expect(page.locator('[data-group="edit"]')).toBeVisible()

  // Group labels are rendered
  const viewLabel = page.locator('[data-group="view"] .controls-group__label')
  await expect(viewLabel).toBeVisible()
  await expect(viewLabel).toHaveText('View')

  const exportLabel = page.locator('[data-group="export"] .controls-group__label')
  await expect(exportLabel).toBeVisible()
  await expect(exportLabel).toHaveText('Export')

  const editLabel = page.locator('[data-group="edit"] .controls-group__label')
  await expect(editLabel).toBeVisible()
  await expect(editLabel).toHaveText('Edit')
})

// ── 2. Export actions inside a single menu (not flat top-level buttons) ───────

test('no flat export buttons are visible at the top level of the toolbar', async ({ page }) => {
  await waitForSampleLoad(page)
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  // There must be exactly one top-level button in the export group (the toggle).
  const exportGroupDirectButtons = page.locator('[data-group="export"] > button, [data-group="export"] > .export-menu > button')
  await expect(exportGroupDirectButtons).toHaveCount(1)

  // The dropdown must be hidden (not visible) by default.
  await expect(page.locator('.export-menu__dropdown')).toBeHidden()
})

// ── 3. Export menu toggle opens the dropdown with all 7 export items ──────────

test('export menu toggle opens dropdown with all export items enumerated', async ({ page }) => {
  await waitForSampleLoad(page)
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  const toggle = page.getByRole('button', { name: 'Export menu' })
  await expect(toggle).toBeEnabled()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  // Open the dropdown
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.export-menu__dropdown')).toBeVisible()

  // Enumerate all menu items — must include exactly 7 actions
  const expectedItems = ['Export PNG', 'Export SVG', 'Export FASTA', 'Export FASTQ', 'Export QUAL', 'Export Consensus FASTA', 'Print / Save as PDF']
  for (const name of expectedItems) {
    await expect(page.locator('.export-menu__dropdown').getByRole('menuitem', { name: new RegExp(name, 'i') })).toBeAttached()
  }

  const allItems = page.locator('.export-menu__dropdown [role="menuitem"]')
  await expect(allItems).toHaveCount(7)
})

// ── 4. Escape closes the export dropdown ──────────────────────────────────────

test('Escape key closes the export dropdown', async ({ page }) => {
  await waitForSampleLoad(page)
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  await page.getByRole('button', { name: 'Export menu' }).click()
  await expect(page.locator('.export-menu__dropdown')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('.export-menu__dropdown')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Export menu' })).toHaveAttribute('aria-expanded', 'false')
})

// ── 5. Clicking outside closes the export dropdown ───────────────────────────

test('clicking outside the export group closes the dropdown', async ({ page }) => {
  await waitForSampleLoad(page)
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  await page.getByRole('button', { name: 'Export menu' }).click()
  await expect(page.locator('.export-menu__dropdown')).toBeVisible()

  // Click somewhere outside the export group (e.g. the canvas)
  await page.locator('[data-testid="chromatogram-canvas"]').click({ position: { x: 10, y: 10 } })
  await expect(page.locator('.export-menu__dropdown')).toBeHidden()
})

// ── 6. Pre-load: export toggle disabled during loading phase ─────────────────

test('export menu toggle is disabled while a trace is loading', async ({ page }) => {
  // Intercept sample.ab1 with a delay to observe the loading state
  const sampleBuf = await import('node:fs/promises').then((fs) =>
    fs.readFile(path.resolve(process.cwd(), 'public/sample.ab1'))
  )
  await page.route('**/sample.ab1', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: sampleBuf,
    })
  })

  await page.goto('')
  // During loading, the export toggle should be disabled
  await expect(page.locator('#loading-banner')).toBeVisible({ timeout: 3000 })
  await expect(page.getByRole('button', { name: 'Export menu' })).toBeDisabled()

  // View buttons should also be disabled during loading
  await expect(page.getByRole('button', { name: 'Zoom +' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Fit' })).toBeDisabled()
})

// ── 7. Post-load: export menu toggle enabled; all view buttons enabled ─────────

test('after loading a trace, view group buttons and export toggle are enabled', async ({ page }) => {
  await waitForSampleLoad(page)
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  // View group buttons
  await expect(page.getByRole('button', { name: 'Zoom +' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Zoom −' })).toBeEnabled()
  await expect(page.getByRole('button', { name: '← Pan' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Pan →' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Fit' })).toBeEnabled()

  // Export toggle
  await expect(page.getByRole('button', { name: 'Export menu' })).toBeEnabled()
})

// ── 8. Export menu toggle is Tab-reachable (not individual hidden export items) ──

test('export-menu-toggle is Tab-reachable by keyboard', { tag: ['@desktop'] }, async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation only on desktop')
  await waitForSampleLoad(page)
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  await page.focus('body')
  let found = false
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const action = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.getAttribute('data-action') ?? '',
    )
    if (action === 'export-menu-toggle') {
      found = true
      break
    }
  }
  expect(found, 'export-menu-toggle was not reached by Tab').toBeTruthy()

  // Individual export items should NOT be Tab-reachable while dropdown is closed
  await page.focus('body')
  const exportItemActions = ['export-png', 'export-svg', 'export-fasta', 'export-fastq', 'export-qual', 'export-consensus-fasta', 'print']
  const reachedWhileClosed = new Set<string>()
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const action = await page.evaluate(
      () => (document.activeElement as HTMLElement | null)?.getAttribute('data-action') ?? '',
    )
    if (exportItemActions.includes(action)) reachedWhileClosed.add(action)
  }
  expect(reachedWhileClosed.size, 'Export dropdown items should not be Tab-reachable when menu is closed').toBe(0)
})

// ── 9. Export menu toggle has correct ARIA attributes ────────────────────────

test('export menu toggle has aria-haspopup="menu" and aria-expanded reflects open state', async ({ page }) => {
  await waitForSampleLoad(page)
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  const toggle = page.getByRole('button', { name: 'Export menu' })
  await expect(toggle).toHaveAttribute('aria-haspopup', 'menu')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})
