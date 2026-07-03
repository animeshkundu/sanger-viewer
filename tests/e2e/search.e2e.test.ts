import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

async function loadFixture(page: Page) {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
}

async function getCanvasVisibleHighlightCount(page: Page): Promise<number> {
  const value = await page.locator('[data-testid="chromatogram-canvas"]').getAttribute('data-search-visible-count')
  return Number(value ?? '0')
}

async function getCanvasActiveRange(page: Page): Promise<string> {
  return (await page.locator('[data-testid="chromatogram-canvas"]').getAttribute('data-search-active-range')) ?? ''
}

test('searches a real fixture, highlights hits, navigates, and shows no-match state', async ({ page }) => {
  await loadFixture(page)

  const searchInput = page.locator('#search-input')
  await searchInput.fill('ACGT')

  await expect(page.locator('#search-summary')).toHaveText('2 matches · 1 of 2')
  await expect.poll(() => getCanvasVisibleHighlightCount(page)).toBeGreaterThan(0)
  await expect.poll(async () => page.locator('.sequence-panel [data-search-match="true"]').count()).toBeGreaterThan(0)

  const initialRange = await getCanvasActiveRange(page)
  const initialReadout = await page.locator('.position-readout').textContent()

  await page.getByRole('button', { name: 'Next match' }).click()

  await expect(page.locator('#search-summary')).toHaveText('2 matches · 2 of 2')
  await expect.poll(() => getCanvasActiveRange(page)).not.toBe(initialRange)
  await expect.poll(async () => await page.locator('.position-readout').textContent()).not.toBe(initialReadout)
  await expect.poll(() => getCanvasVisibleHighlightCount(page)).toBeGreaterThan(0)
  await expect.poll(async () => page.locator('.sequence-panel [data-search-active="true"]').count()).toBeGreaterThan(0)

  await searchInput.fill('ZZZZZZ')

  await expect(page.locator('#search-summary')).toHaveText('0 matches')
  await expect(page.locator('#search-empty-state')).toBeVisible()
  await expect.poll(() => getCanvasVisibleHighlightCount(page)).toBe(0)
  await expect(page.locator('.sequence-panel [data-search-match="true"]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Clear search' }).click()
  await expect(page.locator('#search-summary')).toBeEmpty()
  await expect(page.locator('#search-empty-state')).toBeHidden()
})
