import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')
const MOTIF = 'GCTT'
const INK_THRESHOLD = 1000

async function canvasInkSum(page: Page): Promise<number> {
  return page.locator('[data-testid="chromatogram-canvas"]').evaluate((el) => {
    const canvas = el as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += Math.abs(255 - data[i]) + Math.abs(255 - data[i + 1]) + Math.abs(255 - data[i + 2])
    }
    return sum
  })
}

async function readViewport(page: Page) {
  const text = await page.locator('.position-readout').textContent()
  const match = text?.match(/Position: (\d+) - (\d+)/)
  if (!match) throw new Error(`Unexpected viewport readout: ${text}`)
  return { start: Number(match[1]), end: Number(match[2]) }
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(INK_THRESHOLD)
})

test('subsequence search highlights matches and navigates between them', async ({ page }) => {
  const initialInk = await canvasInkSum(page)
  const search = page.locator('[data-search="query"]')
  const summary = page.locator('#search-summary')
  const canvas = page.locator('[data-testid="chromatogram-canvas"]')

  await search.fill(MOTIF)
  await expect.poll(() => summary.textContent(), { timeout: 5000 }).toMatch(/matches/)
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).not.toBe(initialInk)
  await expect(canvas).toHaveAttribute('data-search-count', /[1-9]\d*/)

  const totalMatches = Number((await summary.textContent())?.match(/(\d+) matches/)?.[1] ?? '0')
  expect(totalMatches).toBeGreaterThan(1)

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(summary).toContainText(`hit 1 of ${totalMatches}`)
  await expect(page.locator('.sequence-panel .search-match-active')).toHaveCount(MOTIF.length)

  const firstActive = await canvas.getAttribute('data-search-active')
  const firstViewport = await readViewport(page)
  expect(firstActive).toBeTruthy()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(summary).toContainText(`hit 2 of ${totalMatches}`)
  await expect.poll(() => canvas.getAttribute('data-search-active')).not.toBe(firstActive)

  const secondViewport = await readViewport(page)
  expect(secondViewport).not.toEqual(firstViewport)

  await page.getByRole('button', { name: 'Previous' }).click()
  await expect(summary).toContainText(`hit 1 of ${totalMatches}`)
  await expect.poll(() => canvas.getAttribute('data-search-active')).toBe(firstActive)

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(search).toHaveValue('')
  await expect(summary).toContainText('Enter a motif to search')
  await expect(canvas).toHaveAttribute('data-search-count', '0')
})
