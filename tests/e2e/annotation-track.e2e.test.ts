import path from 'node:path'
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { buildAnnotationFeatures } from '../../src/annotations'
import { parseTrace } from '../../src/parsers'
import { callMixedBases, DEFAULT_MIXED_BASE_THRESHOLD } from '../../src/calling/mixedBase'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

let cachedFeatureCount: number | null = null

function expectedFeatureCount(): number {
  if (cachedFeatureCount !== null) return cachedFeatureCount
  const fixtureBuffer = readFileSync(FIXTURE)
  const fixtureArrayBuffer = fixtureBuffer.buffer.slice(
    fixtureBuffer.byteOffset,
    fixtureBuffer.byteOffset + fixtureBuffer.byteLength,
  )
  const trace = parseTrace(fixtureArrayBuffer, '3100.ab1')
  const mixed = callMixedBases(trace, DEFAULT_MIXED_BASE_THRESHOLD)
  cachedFeatureCount = buildAnnotationFeatures(mixed.sequence).length
  return cachedFeatureCount
}

async function getVisibleRange(page: Page): Promise<{ start: number; end: number }> {
  const attr = await page.locator('.annotation-track').getAttribute('data-annotation-visible-range')
  if (!attr) throw new Error('data-annotation-visible-range not set')
  const [start, end] = attr.split(':').map((value) => Number(value))
  return { start, end }
}

test.describe('annotation track', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE)
    await expect(page.locator('#status')).toContainText('Loaded')
  })

  test('renders expected annotations and windows chips to viewport', async ({ page }) => {
    const track = page.locator('.annotation-track')
    await expect(track).toBeVisible()

    const totalCount = expectedFeatureCount()
    expect(totalCount).toBeGreaterThan(0)
    await expect(track).toHaveAttribute('data-annotation-total-count', String(totalCount))

    const initialVisible = Number(await track.getAttribute('data-annotation-visible-count'))
    expect(initialVisible).toBeGreaterThan(0)
    expect(initialVisible).toBeLessThanOrEqual(totalCount)

    await expect(page.locator('.annotation-track__row-label', { hasText: 'ORF +1' })).toBeVisible()
    await expect(page.locator('.annotation-track__row-label', { hasText: 'Restriction' })).toBeVisible()

    await page.getByRole('button', { name: 'Zoom +' }).click()
    await page.getByRole('button', { name: 'Zoom +' }).click()
    const initialRange = await getVisibleRange(page)
    await page.getByRole('button', { name: 'Pan →' }).click()
    await page.getByRole('button', { name: 'Pan →' }).click()
    await page.getByRole('button', { name: 'Pan →' }).click()
    await expect
      .poll(async () => await getVisibleRange(page))
      .not.toEqual(initialRange)
  })

  test('annotation chips support click and keyboard navigation', async ({ page }) => {
    const chips = page.locator('[data-annotation-chip="true"]')
    await expect(chips.first()).toBeVisible()
    await expect(chips.last()).toBeVisible()

    const first = chips.first()
    const last = chips.last()
    const [firstStart, lastStart] = await Promise.all([
      first.getAttribute('data-annotation-start'),
      last.getAttribute('data-annotation-start'),
    ])
    expect(firstStart).not.toBeNull()
    expect(lastStart).not.toBeNull()
    expect(Number(firstStart)).not.toBe(Number(lastStart))

    await last.click()
    const viewportAfterLast = await page.locator('[data-testid="chromatogram-canvas"]').getAttribute('data-viewport-start')

    await first.focus()
    await page.keyboard.press('Enter')
    await expect
      .poll(async () => await page.locator('[data-testid="chromatogram-canvas"]').getAttribute('data-viewport-start'))
      .not.toBe(viewportAfterLast)

    await expect(first).toHaveAttribute('aria-label', /bases/i)
  })
})
