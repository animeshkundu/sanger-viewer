import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { parseTrace } from '../../src/parsers'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const MAX_BAR_HEIGHT = 40

const fixtureBuffer = await fs.readFile(FIXTURE)
const fixtureArrayBuffer = fixtureBuffer.buffer.slice(
  fixtureBuffer.byteOffset,
  fixtureBuffer.byteOffset + fixtureBuffer.byteLength,
)
const fixtureTrace = parseTrace(fixtureArrayBuffer, '310.ab1')

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
  await expect(page.locator('[data-testid="quality-track-canvas"]')).toHaveAttribute('data-bar-count', /\d+/)
})

test('quality track is toggleable and exposed with accessible labels', async ({ page }) => {
  const track = page.getByRole('region', { name: 'Per-base quality track' })
  const toggle = page.locator('[data-action="toggle-quality-track"]')
  await expect(track).toHaveAttribute('data-visible', 'true')
  await expect(toggle).toHaveText('Hide quality track')
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(track).toHaveAttribute('data-visible', 'false')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(toggle).toHaveText('Show quality track')
})

test('quality bar heights and x positions map to visible PHRED scores', async ({ page }) => {
  const viewport = await page.locator('[data-testid="chromatogram-canvas"]').evaluate((el) => ({
    start: Number((el as HTMLCanvasElement).getAttribute('data-viewport-start') ?? '0'),
    spp: Number((el as HTMLCanvasElement).getAttribute('data-viewport-spp') ?? '1'),
  }))
  const width = await page.locator('[data-testid="quality-track-canvas"]').evaluate(
    (el) => (el as HTMLCanvasElement).clientWidth,
  )

  const expected: Array<{ x: number; height: number; score: number }> = []
  for (let i = 0; i < fixtureTrace.peakPositions.length; i += 1) {
    const q = fixtureTrace.qualities?.[i]
    if (q === undefined) continue
    const x = (fixtureTrace.peakPositions[i] - viewport.start) / viewport.spp
    if (x < 8 || x > width - 8) continue
    if (expected.length > 0 && Math.abs(x - expected[expected.length - 1].x) < 10) continue
    const score = Math.max(0, Math.round(q))
    const height = score === 0 ? 1 : Math.max(1, Math.min(MAX_BAR_HEIGHT, Math.round((Math.min(score, 40) / 40) * MAX_BAR_HEIGHT)))
    expected.push({ x, height, score })
    if (expected.length === 5) break
  }
  expect(expected.length).toBe(5)

  const actual = await page.locator('[data-testid="quality-track-canvas"]').evaluate((el, columns) => {
    const canvas = el as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    const dpr = window.devicePixelRatio || 1
    const h = canvas.height
    return (columns as number[]).map((xCss) => {
      let best = 0
      for (let offset = -1; offset <= 1; offset += 1) {
        const x = Math.max(0, Math.min(canvas.width - 1, Math.round((xCss + offset) * dpr)))
        const data = ctx.getImageData(x, 0, 1, h).data
        let contiguous = 0
        for (let y = h - 1; y >= 0; y -= 1) {
          const alpha = data[y * 4 + 3]
          if (alpha > 0) contiguous += 1
          else break
        }
        if (contiguous > best) best = contiguous
      }
      return Math.round(best / dpr)
    })
  }, expected.map((item) => item.x))

  expect(actual).toEqual(expected.map((item) => item.height))
})
