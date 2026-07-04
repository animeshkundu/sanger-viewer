import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

async function readViewport(page: Page): Promise<{ start: number; end: number; span: number }> {
  const text = await page.locator('.position-readout').textContent()
  const match = text?.match(/Position:\s*(\d+)\s*-\s*(\d+)/)
  if (!match) throw new Error(`Unexpected viewport readout: ${text}`)
  const start = Number(match[1])
  const end = Number(match[2])
  return { start, end, span: end - start }
}

test('hides the annotation track when no trace is loaded', async ({ page }) => {
  await page.route('**/sample.ab1', async (route) => {
    await route.fulfill({ status: 500, body: '' })
  })
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Could not fetch sample (500)')
  await expect(page.locator('[data-testid="annotation-track"]')).toBeHidden()
})

test.describe('with loaded trace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE)
    await expect(page.locator('#status')).toContainText('Loaded')
    await expect(page.locator('[data-testid="annotation-track"]')).toBeVisible()
    await expect.poll(async () => Number(await page.locator('[data-testid="annotation-track"]').getAttribute('data-total-count'))).toBeGreaterThan(0)
  })

  test('renders annotation chips and keeps viewport-windowed visibility metadata', async ({ page }) => {
    const track = page.locator('[data-testid="annotation-track"]')

    await expect(track.locator('.annotation-row__label', { hasText: 'ORF +1' })).toBeVisible()
    await expect(track.locator('.annotation-row__label', { hasText: 'Restriction' })).toBeVisible()
    await expect(track.locator('.annotation-chip[data-feature-type="orf"][data-frame="2"][data-start="88"][data-end="103"]')).toContainText('ORF +2 88-103')
    await expect(track.locator('.annotation-chip[data-feature-type="restriction"][data-enzyme="HindIII"][data-start="251"][data-end="257"]')).toContainText('HindIII 251-257')

    const totalCount = Number(await track.getAttribute('data-total-count'))
    const visibleCount = Number(await track.getAttribute('data-visible-count'))
    expect(totalCount).toBeGreaterThan(0)
    expect(visibleCount).toBeGreaterThan(0)
    expect(visibleCount).toBeLessThanOrEqual(totalCount)

    const rangeBefore = await track.getAttribute('data-visible-range')
    await page.getByRole('button', { name: 'Zoom +' }).click()
    await page.getByRole('button', { name: 'Pan →' }).click()
    await expect.poll(() => track.getAttribute('data-visible-range')).not.toBe(rangeBefore)

    const zoomedVisibleCount = Number(await track.getAttribute('data-visible-count'))
    expect(zoomedVisibleCount).toBeLessThanOrEqual(totalCount)
  })

  test('clicking and pressing Enter on chips navigates the viewport', async ({ page }) => {
    await page.getByRole('button', { name: 'Fit' }).click()
    const beforeClick = await readViewport(page)

    const chips = page.locator('[data-testid="annotation-track"] .annotation-chip')
    const chipCount = await chips.count()
    expect(chipCount).toBeGreaterThan(1)

    const lastChip = chips.nth(chipCount - 1)
    await expect(lastChip).toHaveAttribute('data-start', /\d+/)
    await expect(lastChip).toHaveAttribute('data-end', /\d+/)
    await lastChip.click()
    await expect.poll(() => readViewport(page).then((vp) => vp.span), { timeout: 5000 }).toBeLessThan(beforeClick.span)

    await page.getByRole('button', { name: 'Fit' }).click()
    const beforeEnter = await readViewport(page)
    const firstChip = chips.first()
    await firstChip.focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => readViewport(page).then((vp) => vp.span), { timeout: 5000 }).toBeLessThan(beforeEnter.span)
    await expect.poll(() => page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      const track = document.querySelector('[data-testid="annotation-track"]')
      return Boolean(active && active.classList.contains('annotation-chip') && track?.contains(active))
    })).toBe(true)
  })
})
