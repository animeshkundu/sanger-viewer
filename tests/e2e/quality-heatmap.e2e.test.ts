import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { parseTrace } from '../../src/parsers'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const HEATMAP_HEIGHT = 14

const fixtureBuffer = await fs.readFile(FIXTURE)
const fixtureArrayBuffer = fixtureBuffer.buffer.slice(
  fixtureBuffer.byteOffset,
  fixtureBuffer.byteOffset + fixtureBuffer.byteLength,
)
const fixtureTrace = parseTrace(fixtureArrayBuffer, '310.ab1')

type VisibleQuality = {
  baseIndex: number
  score: number
  x: number
}

async function getVisibleQuality(page: Page): Promise<VisibleQuality> {
  const viewport = await page.locator('[data-testid="chromatogram-canvas"]').evaluate((el) => ({
    start: Number((el as HTMLCanvasElement).getAttribute('data-viewport-start') ?? '0'),
    spp: Number((el as HTMLCanvasElement).getAttribute('data-viewport-spp') ?? '1'),
  }))
  const width = await page.locator('[data-testid="quality-heatmap-canvas"]').evaluate(
    (el) => (el as HTMLCanvasElement).clientWidth,
  )

  for (let i = 0; i < fixtureTrace.peakPositions.length; i += 1) {
    const quality = fixtureTrace.qualities?.[i]
    if (quality === undefined) continue
    const x = (fixtureTrace.peakPositions[i] - viewport.start) / viewport.spp
    if (x >= 16 && x <= width - 16) {
      return { baseIndex: i, score: Math.max(0, Math.round(quality)), x }
    }
  }
  throw new Error('No visible quality score found')
}

test.beforeEach(async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
  await expect(page.locator('[data-testid="quality-heatmap-canvas"]')).toHaveAttribute('data-cell-count', /[1-9]\d*/)
})

test('renders fixed-height color cells aligned to visible base peaks', async ({ page }) => {
  const canvas = page.locator('[data-testid="quality-heatmap-canvas"]')
  const target = await getVisibleQuality(page)

  await expect(canvas).toHaveAttribute('data-track-height', String(HEATMAP_HEIGHT))
  const alpha = await canvas.evaluate((el, xCss) => {
    const c = el as HTMLCanvasElement
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    const dpr = window.devicePixelRatio || 1
    const x = Math.max(0, Math.min(c.width - 1, Math.round(xCss * dpr)))
    return [
      ctx.getImageData(x, 0, 1, 1).data[3],
      ctx.getImageData(x, c.height - 1, 1, 1).data[3],
    ]
  }, target.x)
  expect(alpha).toEqual([255, 255])

  const toggle = page.locator('[data-action="toggle-quality-track"]')
  await toggle.click()
  await expect(canvas).toBeHidden()
  await toggle.click()
  await expect(canvas).toBeVisible()
})

test('repaints heatmap cells from the quality-tier theme tokens', async ({ page }) => {
  const canvas = page.locator('[data-testid="quality-heatmap-canvas"]')
  const target = await getVisibleQuality(page)

  await page.evaluate(() => {
    for (const token of ['--color-qual-poor', '--color-qual-fair', '--color-qual-good', '--color-qual-excellent']) {
      document.documentElement.style.setProperty(token, 'rgb(12, 34, 56)')
    }
  })

  await expect.poll(() => canvas.evaluate((el, xCss) => {
    const c = el as HTMLCanvasElement
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    const dpr = window.devicePixelRatio || 1
    const x = Math.max(0, Math.min(c.width - 1, Math.round(xCss * dpr)))
    return Array.from(ctx.getImageData(x, Math.floor(c.height / 2), 1, 1).data)
  }, target.x)).toEqual([12, 34, 56, 255])
})

test('shows the exact integer Phred score for the hovered base', async ({ page }) => {
  const canvas = page.locator('[data-testid="quality-heatmap-canvas"]')
  const tooltip = page.locator('[data-testid="quality-heatmap-tooltip"]')
  const target = await getVisibleQuality(page)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Heatmap canvas has no bounding box')

  await canvas.dispatchEvent('pointermove', {
    clientX: box.x + target.x,
    clientY: box.y + box.height / 2,
    pointerType: 'mouse',
  })
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toHaveText(`Base #${target.baseIndex + 1} | Phred quality: ${target.score}`)

  await canvas.dispatchEvent('pointerleave', { pointerType: 'mouse' })
  await expect(tooltip).toBeHidden()
})
