import path from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'

async function dispatchPointer(
  canvas: Locator,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  pointerId: number,
  clientX: number,
  clientY: number,
  isPrimary: boolean
) {
  await canvas.dispatchEvent(type, {
    pointerId,
    pointerType: 'touch',
    clientX: Math.round(clientX),
    clientY: Math.round(clientY),
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    isPrimary
  })
}

async function readViewport(page: Page) {
  const text = await page.locator('.position-readout').textContent()
  const match = text?.match(/Position: (\d+) - (\d+)/)
  if (!match) throw new Error(`Unexpected viewport readout: ${text}`)
  const start = Number(match[1])
  const end = Number(match[2])
  return { start, end, span: end - start }
}

test('supports pinch zoom, pan, and tap selection on tablet', async ({ page, browserName, isMobile }) => {
  test.skip(!isMobile || browserName !== 'chromium', 'tablet-only touch assertions')

  await page.goto('')
  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Viewport unavailable')
  expect(viewport.height).toBeGreaterThan(viewport.width)

  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const canvasBox = await canvas.boundingBox()
  if (!canvasBox) throw new Error('Canvas not visible')
  const portraitCanvasMaxHeight = await page.evaluate(() =>
    Number.parseInt(getComputedStyle(document.documentElement).getPropertyValue('--canvas-portrait-max-height'), 10)
  )
  expect(canvasBox.height).toBeLessThanOrEqual(portraitCanvasMaxHeight)

  const zoomButtonBox = await page.getByRole('button', { name: 'Zoom +' }).boundingBox()
  if (!zoomButtonBox) throw new Error('Zoom button not visible')
  expect(zoomButtonBox.height).toBeGreaterThanOrEqual(44)

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  expect(hasHorizontalOverflow).toBeFalsy()

  const beforePinch = await readViewport(page)
  const centerX = canvasBox.x + canvasBox.width / 2
  const centerY = canvasBox.y + canvasBox.height / 2

  await dispatchPointer(canvas, 'pointerdown', 1, centerX - 40, centerY, true)
  await dispatchPointer(canvas, 'pointerdown', 2, centerX + 40, centerY, false)
  for (let step = 1; step <= 4; step += 1) {
    await dispatchPointer(canvas, 'pointermove', 1, centerX - 40 - step * 20, centerY, true)
    await dispatchPointer(canvas, 'pointermove', 2, centerX + 40 + step * 20, centerY, false)
  }
  await dispatchPointer(canvas, 'pointerup', 1, centerX - 120, centerY, true)
  await dispatchPointer(canvas, 'pointerup', 2, centerX + 120, centerY, false)

  await expect.poll(async () => (await readViewport(page)).span).toBeLessThan(beforePinch.span)
  const afterPinch = await readViewport(page)

  await dispatchPointer(canvas, 'pointerdown', 3, centerX, centerY, true)
  for (let step = 1; step <= 5; step += 1) {
    await dispatchPointer(canvas, 'pointermove', 3, centerX - step * 24, centerY, true)
  }
  await dispatchPointer(canvas, 'pointerup', 3, centerX - 120, centerY, true)

  await expect.poll(async () => (await readViewport(page)).start).not.toBe(afterPinch.start)

  await dispatchPointer(canvas, 'pointerdown', 4, centerX + 48, centerY, true)
  await dispatchPointer(canvas, 'pointerup', 4, centerX + 48, centerY, true)

  await expect(page.locator('.tooltip')).toContainText('peak:')
  const selectedBase = page.locator('.sequence-panel .selected-base')
  await expect(selectedBase).toHaveCount(1)
  await expect(selectedBase).toHaveText(/^[ACGTNRYSWKMBDHV]$/)
})
