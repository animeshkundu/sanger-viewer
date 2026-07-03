import path from 'node:path'
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const fixturePath = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')
const canvasSelector = '[data-testid="chromatogram-canvas"]'

function parseRange(text: string): { start: number; end: number; span: number } {
  const match = text.match(/Position:\s+(\d+)\s+-\s+(\d+)/)
  if (!match) throw new Error(`Unexpected readout: ${text}`)
  const start = Number(match[1])
  const end = Number(match[2])
  return { start, end, span: end - start }
}

async function dispatchTouchPointer(
  page: Page,
  type: string,
  pointerId: number,
  x: number,
  y: number
): Promise<void> {
  await page.evaluate(
    ({ selector, type, pointerId, x, y }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(selector)
      if (!canvas) throw new Error('Canvas not found')
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId,
          pointerType: 'touch',
          isPrimary: pointerId === 1,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: y
        })
      )
    },
    { selector: canvasSelector, type, pointerId, x, y }
  )
}

async function drag(page: Page, fromX: number, toX: number, y: number): Promise<void> {
  await dispatchTouchPointer(page, 'pointerdown', 1, fromX, y)
  const steps = 6
  for (let step = 1; step <= steps; step += 1) {
    const x = fromX + ((toX - fromX) * step) / steps
    await dispatchTouchPointer(page, 'pointermove', 1, x, y)
  }
  await dispatchTouchPointer(page, 'pointerup', 1, toX, y)
}

async function pinch(
  page: Page,
  startLeft: number,
  startRight: number,
  endLeft: number,
  endRight: number,
  y: number
): Promise<void> {
  await dispatchTouchPointer(page, 'pointerdown', 1, startLeft, y)
  await dispatchTouchPointer(page, 'pointerdown', 2, startRight, y)
  const steps = 6
  for (let step = 1; step <= steps; step += 1) {
    const left = startLeft + ((endLeft - startLeft) * step) / steps
    const right = startRight + ((endRight - startRight) * step) / steps
    await dispatchTouchPointer(page, 'pointermove', 1, left, y)
    await dispatchTouchPointer(page, 'pointermove', 2, right, y)
  }
  await dispatchTouchPointer(page, 'pointerup', 1, endLeft, y)
  await dispatchTouchPointer(page, 'pointerup', 2, endRight, y)
}

test('tablet layout supports touch pan, pinch, and tap inspection', async ({ page }) => {
  test.skip(test.info().project.name !== 'tablet', 'Touch coverage is tablet-only')

  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath)
  await expect(page.locator('#status')).toContainText('Loaded')

  const viewport = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.innerWidth)

  const zoomButtonHeight = await page.getByRole('button', { name: 'Zoom +' }).evaluate((button) =>
    button.getBoundingClientRect().height
  )
  expect(zoomButtonHeight).toBeGreaterThanOrEqual(44)

  const canvasBox = await page.locator(canvasSelector).boundingBox()
  if (!canvasBox) throw new Error('Canvas not visible')

  const readout = page.locator('.position-readout')
  const initialRange = parseRange((await readout.textContent()) ?? '')

  const dragY = canvasBox.y + canvasBox.height / 2
  await drag(page, canvasBox.x + canvasBox.width * 0.6, canvasBox.x + canvasBox.width * 0.35, dragY)
  const pannedRange = parseRange((await readout.textContent()) ?? '')
  expect(pannedRange.start).not.toBe(initialRange.start)

  await pinch(
    page,
    canvasBox.x + canvasBox.width * 0.45,
    canvasBox.x + canvasBox.width * 0.55,
    canvasBox.x + canvasBox.width * 0.3,
    canvasBox.x + canvasBox.width * 0.7,
    dragY
  )
  const zoomedRange = parseRange((await readout.textContent()) ?? '')
  expect(zoomedRange.span).toBeLessThan(pannedRange.span)

  await page.getByRole('button', { name: 'Fit' }).click()

  let tapLocalX = canvasBox.width * 0.5
  for (let step = 1; step <= 6; step += 1) {
    tapLocalX = (canvasBox.width * step) / 7
    await page.mouse.move(canvasBox.x + tapLocalX, dragY)
    const visible = await page.locator('.tooltip').isVisible()
    if (visible) break
  }
  await expect(page.locator('.tooltip')).toContainText('peak:')
  await page.locator(canvasSelector).dispatchEvent('mouseleave')
  await expect(page.locator('.tooltip')).toBeHidden()

  await page.locator(canvasSelector).tap({
    position: {
      x: tapLocalX,
      y: canvasBox.height * 0.5
    }
  })

  await expect(page.locator('.tooltip')).toContainText('peak:')
  await expect(page.locator('.selected-base')).toHaveCount(1)
})
