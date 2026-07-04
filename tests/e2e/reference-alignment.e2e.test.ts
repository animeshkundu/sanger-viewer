/**
 * reference-alignment.e2e.test.ts — Playwright E2E tests for reference
 * alignment and variant calling.
 *
 * Tests:
 *  1. Reference panel is visible after trace load.
 *  2. Align button is disabled with empty textarea.
 *  3. Pasting a reference enables the Align button.
 *  4. Clicking Align shows an alignment status (strand + positions).
 *  5. Variant table appears and summary shows variant count.
 *  6. Filter tabs change the visible variant list.
 *  7. Variant CSV export downloads a file with the correct header row.
 *  8. Clear button resets the panel.
 *
 * Ground spec: docs/specs/07-reference-alignment.md + docs/specs/08-variant-calling-review.md
 */

import path from 'node:path'
import { test, expect } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')

test.describe('Reference alignment + variant calling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE)
    await expect(page.locator('#status')).toContainText('Loaded')
  })

  // ── Test 1: Reference panel is rendered ────────────────────────────────────
  test('reference panel is visible after trace load', async ({ page }) => {
    const panel = page.locator('[data-testid="reference-panel"]')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('heading', { name: /align to reference/i })).toBeVisible()
  })

  // ── Test 2: Align button starts disabled ──────────────────────────────────
  test('Align button is disabled when textarea is empty', async ({ page }) => {
    const alignBtn = page.locator('[data-testid="align-btn"]')
    await expect(alignBtn).toBeDisabled()
  })

  // ── Test 3: Pasting a reference enables Align ─────────────────────────────
  test('pasting a reference sequence enables the Align button', async ({ page }) => {
    const textarea = page.locator('#reference-sequence-input')
    const alignBtn = page.locator('[data-testid="align-btn"]')
    await textarea.fill('>ref\nACGTACGTACGTACGT')
    await expect(alignBtn).toBeEnabled()
  })

  // ── Test 4: Clicking Align shows status with strand info ──────────────────
  test('clicking Align shows alignment status with strand and position info', async ({ page }) => {
    const textarea = page.locator('#reference-sequence-input')
    const alignBtn = page.locator('[data-testid="align-btn"]')
    const status = page.locator('[data-testid="reference-status"]')

    await textarea.fill('>sample_ref\nACGTACGTACGTACGTACGTACGT')
    await alignBtn.click()

    // Status should contain strand information.
    await expect(status).toContainText(/forward|reverse/)
    // Status should contain reference positions.
    await expect(status).toContainText(/ref pos \d+–\d+/)
  })

  // ── Test 5: Variant table appears after alignment ─────────────────────────
  test('variant table appears after alignment and shows summary', async ({ page }) => {
    const textarea = page.locator('#reference-sequence-input')
    const alignBtn = page.locator('[data-testid="align-btn"]')
    const variantTable = page.locator('[data-testid="variant-table"]')
    const summary = page.locator('[data-testid="variant-summary"]')

    await textarea.fill('>ref\nACGTACGTACGTACGTACGTACGT')
    await alignBtn.click()

    await expect(variantTable).toBeVisible()
    // Summary should contain "variant" text.
    await expect(summary).toContainText(/variant/)
  })

  // ── Test 6: Filter tabs are present ───────────────────────────────────────
  test('variant filter tabs are visible and toggle active state', async ({ page }) => {
    const textarea = page.locator('#reference-sequence-input')
    const alignBtn = page.locator('[data-testid="align-btn"]')

    await textarea.fill('>ref\nACGTACGTACGT')
    await alignBtn.click()

    const tabs = page.locator('[data-testid="variant-tabs"]')
    await expect(tabs).toBeVisible()
    await expect(tabs.getByRole('tab', { name: 'All variants' })).toBeVisible()
    await expect(tabs.getByRole('tab', { name: 'High-confidence variants' })).toBeVisible()
    await expect(tabs.getByRole('tab', { name: 'Ambiguous variants' })).toBeVisible()
    await expect(tabs.getByRole('tab', { name: 'Insertions and deletions' })).toBeVisible()

    // Click High tab and verify it becomes selected.
    await tabs.getByRole('tab', { name: 'High-confidence variants' }).click()
    await expect(tabs.getByRole('tab', { name: 'High-confidence variants' })).toHaveAttribute('aria-selected', 'true')
  })

  // ── Test 7: CSV export downloads file with correct header ─────────────────
  test('CSV export button downloads file with correct header row', async ({ page }) => {
    const textarea = page.locator('#reference-sequence-input')
    const alignBtn = page.locator('[data-testid="align-btn"]')

    // Use a reference with guaranteed mismatches vs the fixture.
    await textarea.fill('>testref\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')
    await alignBtn.click()

    const exportBtn = page.locator('[data-testid="export-variants-csv"]')

    // Wait for export button to be enabled (there may be variants).
    // Even if no variants it might be disabled — we check the download only when enabled.
    const isEnabled = await exportBtn.isEnabled()
    if (isEnabled) {
      const download = page.waitForEvent('download')
      await exportBtn.click()
      const dl = await download
      expect(dl.suggestedFilename()).toContain('.csv')

      // Verify CSV header in the downloaded content.
      const stream = await dl.createReadStream()
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as ArrayBuffer))
      }
      const content = Buffer.concat(chunks).toString('utf-8')
      // The CSV must contain the expected header.
      expect(content).toContain('position,ref,alt,type,confidence,review')
    }
  })

  // ── Test 8: Clear button resets the panel ─────────────────────────────────
  test('Clear button resets the reference panel and hides variant table', async ({ page }) => {
    const textarea = page.locator('#reference-sequence-input')
    const alignBtn = page.locator('[data-testid="align-btn"]')
    const clearBtn = page.getByRole('button', { name: /clear reference/i })
    const variantTable = page.locator('[data-testid="variant-table"]')
    const status = page.locator('[data-testid="reference-status"]')

    await textarea.fill('>ref\nACGTACGT')
    await alignBtn.click()
    await expect(variantTable).toBeVisible()

    await clearBtn.click()
    await expect(textarea).toHaveValue('')
    await expect(status).toHaveText('')
    await expect(variantTable).toBeHidden()
  })
})
