import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

async function downloadFastaContent(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export FASTA' }).click(),
  ])
  const tmpPath = await download.path()
  if (!tmpPath) throw new Error('FASTA download path unavailable')
  return fs.readFile(tmpPath, 'utf-8')
}

test.describe('mixed-base calling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE)
    await expect(page.locator('#status')).toContainText('Loaded')
  })

  test('threshold slider changes ambiguity count and highlights', async ({ page }) => {
    const slider = page.locator('[data-mixed="threshold"]')
    const summary = page.locator('#mixed-summary')
    const canvas = page.locator('[data-testid="chromatogram-canvas"]')
    const sequencePanel = page.locator('.sequence-panel')

    await slider.fill('0.9')
    await slider.dispatchEvent('input')

    const strictCount = Number(await canvas.getAttribute('data-ambiguous-count'))
    const strictVisible = Number(await canvas.getAttribute('data-ambiguous-visible-count'))
    const strictPanelVisible = Number(await sequencePanel.getAttribute('data-ambiguous-visible-count'))

    await slider.fill('0.3')
    await slider.dispatchEvent('input')

    await expect(summary).toContainText('ambiguous base')
    const permissiveCount = Number(await canvas.getAttribute('data-ambiguous-count'))
    const permissiveVisible = Number(await canvas.getAttribute('data-ambiguous-visible-count'))
    const permissivePanelVisible = Number(await sequencePanel.getAttribute('data-ambiguous-visible-count'))

    expect(permissiveCount).toBeGreaterThan(strictCount)
    expect(permissiveVisible).toBeGreaterThanOrEqual(strictVisible)
    expect(permissivePanelVisible).toBeGreaterThanOrEqual(strictPanelVisible)
    await expect(sequencePanel.locator('[data-ambiguous="true"]').first()).toBeVisible()
  })

  test('FASTA export reflects mixed-base calls at permissive threshold', async ({ page }) => {
    const slider = page.locator('[data-mixed="threshold"]')
    await slider.fill('0.35')
    await slider.dispatchEvent('input')

    const fasta = await downloadFastaContent(page)
    const sequence = fasta
      .split('\n')
      .filter((line) => !line.startsWith('>') && line.trim().length > 0)
      .join('')

    // Fixture-backed exact check: first six 3100.ab1 calls at threshold 0.35 are stable and
    // intentionally mirrored from the unit test to ensure export stays in sync with display calls.
    expect(sequence.slice(0, 6)).toBe('SSSKKW')
    expect(sequence).toMatch(/[RYSWKM]/)
  })
})
