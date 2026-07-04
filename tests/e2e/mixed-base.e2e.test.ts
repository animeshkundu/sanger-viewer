import path from 'node:path'
import { readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
import { parseTrace } from '../../src/parsers'
import { callMixedBases } from '../../src/calling/mixedBase'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')
const STRICT_THRESHOLD = 0.95
const PERMISSIVE_THRESHOLD = 0.15
const FASTA_THRESHOLD = 0.35
const RECOMPUTE_TIMEOUT_MS = 5000

let cachedFixtureTrace: ReturnType<typeof parseTrace> | null = null

function parseFixtureTrace() {
  if (cachedFixtureTrace) return cachedFixtureTrace
  const fixtureBuffer = readFileSync(FIXTURE)
  const fixtureArrayBuffer = fixtureBuffer.buffer.slice(
    fixtureBuffer.byteOffset,
    fixtureBuffer.byteOffset + fixtureBuffer.byteLength,
  )
  cachedFixtureTrace = parseTrace(fixtureArrayBuffer, '3100.ab1')
  return cachedFixtureTrace
}

function computeExpectedCounts() {
  const fixtureTrace = parseFixtureTrace()
  const strict = callMixedBases(fixtureTrace, STRICT_THRESHOLD).ambiguousCount
  const permissive = callMixedBases(fixtureTrace, PERMISSIVE_THRESHOLD).ambiguousCount
  const fasta = callMixedBases(fixtureTrace, FASTA_THRESHOLD).ambiguousCount
  if (permissive <= strict) {
    throw new Error(`Fixture does not provide threshold spread for mixed-base E2E: strict=${strict}, permissive=${permissive}`)
  }
  return { strict, permissive, fasta }
}

async function downloadFastaContent(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByRole('button', { name: 'Export menu' }).click()
      await page.getByRole('menuitem', { name: 'Export FASTA' }).click()
    })(),
  ])
  const tmpPath = await download.path()
  if (!tmpPath) throw new Error('FASTA download path unavailable')
  return fs.readFile(tmpPath, 'utf-8')
}

async function setThresholdAndWaitForRecompute(page: Page, threshold: number, expectedCount: number): Promise<void> {
  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  await page.locator('[data-mixed="threshold"]').evaluate((element, value) => {
    const slider = element as HTMLInputElement
    slider.value = String(value)
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    slider.dispatchEvent(new Event('change', { bubbles: true }))
  }, threshold)
  await expect.poll(async () => Number(await canvas.getAttribute('data-ambiguous-count')), { timeout: RECOMPUTE_TIMEOUT_MS }).toBe(expectedCount)
}

test.describe('mixed-base calling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE)
    await expect(page.locator('#status')).toContainText('Loaded')
  })

  test('threshold slider changes ambiguity count and highlights', async ({ page }) => {
    const expectedCounts = computeExpectedCounts()
    const summary = page.locator('#mixed-summary')
    const canvas = page.locator('[data-testid="chromatogram-canvas"]')
    const sequencePanel = page.locator('.sequence-panel')

    await setThresholdAndWaitForRecompute(page, STRICT_THRESHOLD, expectedCounts.strict)
    const strictCount = Number(await canvas.getAttribute('data-ambiguous-count'))
    const strictVisible = Number(await canvas.getAttribute('data-ambiguous-visible-count'))
    const strictPanelVisible = Number(await sequencePanel.getAttribute('data-ambiguous-visible-count'))

    await setThresholdAndWaitForRecompute(page, PERMISSIVE_THRESHOLD, expectedCounts.permissive)
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
    const expectedCounts = computeExpectedCounts()
    await setThresholdAndWaitForRecompute(page, FASTA_THRESHOLD, expectedCounts.fasta)

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
