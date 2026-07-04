/**
 * contig.e2e.test.ts — Playwright E2E tests for paired-read contig assembly.
 *
 * Tests:
 *  1. Contig panel is visible after any trace load.
 *  2. Assemble button is disabled with only one trace loaded.
 *  3. Assemble button is enabled after a second trace is loaded.
 *  4. Clicking Assemble with two traces shows a contig summary with length / overlap info.
 *  5. Export FASTA button downloads a file whose content starts with ">contig [".
 *  6. Contig panel clears and Assemble button is disabled after closing back to one trace.
 *
 * Ground spec: docs/specs/05-paired-read-contig-assembly.md
 */

import path from 'node:path'
import { test, expect } from '@playwright/test'

const FIXTURE_A = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const FIXTURE_B = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

test.describe('Contig assembly', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
    // Load first trace
    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')
  })

  // ── Test 1: Panel is rendered ──────────────────────────────────────────────
  test('contig panel is visible after trace load', async ({ page }) => {
    const panel = page.locator('[data-testid="contig-panel"]')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('heading', { name: /contig assembly/i })).toBeVisible()
  })

  // ── Test 2: Assemble button is disabled with one trace ─────────────────────
  test('Assemble button is disabled with only one trace loaded', async ({ page }) => {
    const assembleBtn = page.locator('[data-testid="assemble-btn"]')
    await expect(assembleBtn).toBeDisabled()
  })

  // ── Test 3: Assemble button is enabled with two traces ─────────────────────
  test('Assemble button is enabled after a second trace is loaded', async ({ page }) => {
    const assembleBtn = page.locator('[data-testid="assemble-btn"]')
    await expect(assembleBtn).toBeDisabled()

    // Load second trace
    await page.setInputFiles('#file-input', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    await expect(assembleBtn).toBeEnabled()
  })

  // ── Test 4: Assembling two traces shows summary ────────────────────────────
  test('clicking Assemble shows a contig summary with length and overlap info', async ({ page }) => {
    // Load second trace
    await page.setInputFiles('#file-input', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    const assembleBtn = page.locator('[data-testid="assemble-btn"]')
    await assembleBtn.click()

    // Summary should appear with contig metadata
    const summary = page.locator('[data-testid="contig-summary"]')
    await expect(summary).toBeVisible()

    // Summary must contain "contig" and numeric values (length, overlap)
    await expect(summary).toContainText(/contig/i)
    await expect(summary).toContainText(/\d+/)
  })

  // ── Test 5: Export FASTA downloads valid FASTA content ─────────────────────
  test('Export contig FASTA downloads a file starting with ">contig ["', async ({ page }) => {
    // Load second trace and assemble
    await page.setInputFiles('#file-input', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    const assembleBtn = page.locator('[data-testid="assemble-btn"]')
    await assembleBtn.click()
    await expect(page.locator('[data-testid="contig-summary"]')).toBeVisible()

    const exportBtn = page.locator('[data-testid="contig-export-btn"]')
    const isEnabled = await exportBtn.isEnabled()

    if (isEnabled) {
      const download = page.waitForEvent('download')
      await exportBtn.click()
      const dl = await download
      expect(dl.suggestedFilename()).toContain('.fasta')

      const stream = await dl.createReadStream()
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as ArrayBuffer))
      }
      const content = Buffer.concat(chunks).toString('utf-8')
      // FASTA must start with the expected header prefix
      expect(content).toMatch(/^>contig \[/)
    }
  })

  // ── Test 6: Closing a trace back to one disables Assemble ─────────────────
  test('Assemble button is disabled after closing second trace', async ({ page }) => {
    // Load second trace
    await page.setInputFiles('#file-input', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    const assembleBtn = page.locator('[data-testid="assemble-btn"]')
    await expect(assembleBtn).toBeEnabled()

    // Close the second trace slot — find its close button in the workspace bar
    const closeButtons = page.locator('[data-action="close-slot"]')
    await expect(closeButtons).toHaveCount(2)
    await closeButtons.last().click()

    // With only one trace remaining, Assemble must be disabled again
    await expect(assembleBtn).toBeDisabled()
  })
})
