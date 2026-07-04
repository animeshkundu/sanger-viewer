/**
 * consensus.e2e.test.ts — E2E tests for the multi-trace consensus & mismatch view.
 *
 * Uses two real fixtures (310.ab1 and abcZ_F.scf) which have different sequences,
 * so the consensus will have > 0 mismatches.
 *
 * Exact-value assertions live in the unit tests; here we assert structural/
 * behavioural guarantees (panel appears, summary contains expected text,
 * FASTA download structure, button state management).
 */

import path from 'node:path'
import { test, expect } from '@playwright/test'

function fixturePath(rel: string) {
  return path.resolve(process.cwd(), rel)
}

const FIXTURE_A = fixturePath('fixtures/ab1/310.ab1')
const FIXTURE_B = fixturePath('fixtures/scf/abcZ_F.scf')

test.describe('Multi-trace consensus view', () => {
  test('consensus row is hidden with only one trace loaded', async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    // Consensus row must be hidden when fewer than 2 traces are loaded.
    await expect(page.locator('[data-testid="consensus-row"]')).toBeHidden()
  })

  test('Export Consensus FASTA button is disabled with one trace', async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    const btn = page.getByRole('button', { name: 'Export Consensus FASTA' })
    await expect(btn).toBeDisabled()
  })

  test('consensus row appears and shows mismatch count when two traces are loaded', async ({ page }) => {
    await page.goto('')

    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    await page.setInputFiles('#file-input-extra', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    // Consensus row should now be visible.
    const row = page.locator('[data-testid="consensus-row"]')
    await expect(row).toBeVisible()

    // Summary must mention "2 traces" and show a mismatch count > 0.
    const summary = page.locator('[data-testid="consensus-summary"]')
    await expect(summary).toContainText('2 traces')
    await expect(summary).toContainText('bp')

    // The two fixtures have different sequences — there MUST be mismatches.
    const summaryText = await summary.textContent()
    const match = summaryText?.match(/(\d+)\s+mismatch/)
    expect(match).not.toBeNull()
    const mismatchCount = Number(match![1])
    expect(mismatchCount).toBeGreaterThan(0)
  })

  test('Export Consensus FASTA button is enabled with two traces', async ({ page }) => {
    await page.goto('')

    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    await page.setInputFiles('#file-input-extra', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    const btn = page.getByRole('button', { name: 'Export Consensus FASTA' })
    await expect(btn).toBeEnabled()
  })

  test('Export Consensus FASTA downloads a valid FASTA file', async ({ page }) => {
    await page.goto('')

    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    await page.setInputFiles('#file-input-extra', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Consensus FASTA' }).click()
    const dl = await download

    // File must be named consensus.fasta.
    expect(dl.suggestedFilename()).toBe('consensus.fasta')

    // Content must be a valid FASTA record.
    const stream = await dl.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer)
    }
    const content = Buffer.concat(chunks).toString('utf-8')

    // Header must contain the consensus prefix and file names.
    expect(content).toMatch(/^>consensus \[2 traces:/)
    expect(content).toContain('310.ab1')
    expect(content).toContain('abcZ_F.scf')

    // Body must contain only valid IUPAC characters (A C G T M R W S Y K V H D B N).
    const lines = content.split('\n').filter((l) => l.length > 0 && !l.startsWith('>'))
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      expect(line).toMatch(/^[ACGTMRWSYKVHDBNU]+$/i)
    }

    // Must end with a trailing newline.
    expect(content.endsWith('\n')).toBe(true)
  })

  test('consensus row hides after closing a trace tab (back to single trace)', async ({ page }) => {
    await page.goto('')

    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    await page.setInputFiles('#file-input-extra', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    // Consensus row visible.
    await expect(page.locator('[data-testid="consensus-row"]')).toBeVisible()

    // Close the first tab.
    const closeBtn = page.locator('.workspace-bar__tab').first().locator('.workspace-bar__tab-close')
    await closeBtn.click()

    // Back to one trace — consensus row must be hidden.
    await expect(page.locator('[data-testid="consensus-row"]')).toBeHidden()

    // And the export button must be disabled again.
    await expect(page.getByRole('button', { name: 'Export Consensus FASTA' })).toBeDisabled()
  })

  test('mismatch bases are visually highlighted in the consensus row', async ({ page }) => {
    await page.goto('')

    await page.setInputFiles('#file-input', FIXTURE_A)
    await expect(page.locator('#status')).toContainText('Loaded')

    await page.setInputFiles('#file-input-extra', FIXTURE_B)
    await expect(page.locator('#status')).toContainText('Loaded')

    // At least one base span with the mismatch class must be present.
    const mismatchSpans = page.locator('.consensus-base--mismatch')
    await expect(mismatchSpans.first()).toBeVisible()
    const count = await mismatchSpans.count()
    expect(count).toBeGreaterThan(0)
  })
})
