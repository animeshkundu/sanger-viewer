import { test, expect } from '@playwright/test'
import path from 'node:path'

test('diagnose tooltip issue', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')
  
  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const box = await canvas.boundingBox()
  console.log('Canvas box:', JSON.stringify(box))
  
  // Check what element is at the canvas center
  const elementAtCenter = await page.evaluate(({x, y}) => {
    const el = document.elementFromPoint(x, y)
    return el ? el.tagName + '.' + el.className + ' id=' + el.id : 'null'
  }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 })
  console.log('Element at canvas center:', elementAtCenter)
  
  // Check the canvas clientWidth
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="chromatogram-canvas"]') as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect()
    return {
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      rectWidth: rect.width,
      rectHeight: rect.height,
      rectLeft: rect.left,
      rectTop: rect.top,
    }
  })
  console.log('Canvas info:', JSON.stringify(canvasInfo))
  
  // Listen for pointermove events on the canvas
  await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="chromatogram-canvas"]') as HTMLCanvasElement
    window.__pointerMoveCount = 0
    canvas.addEventListener('pointermove', (e) => {
      window.__pointerMoveCount++
      console.log('pointermove on canvas:', e.clientX, e.clientY, e.pointerType)
    })
  })
  
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  
  const count = await page.evaluate(() => window.__pointerMoveCount)
  console.log('Pointer move count on canvas:', count)
  
  // Check tooltip
  const tooltipInfo = await page.evaluate(() => {
    const tooltip = document.querySelector('.tooltip') as HTMLElement
    return {
      className: tooltip.className,
      textContent: tooltip.textContent,
      parentTagName: tooltip.parentElement?.tagName,
      parentClass: tooltip.parentElement?.className,
    }
  })
  console.log('Tooltip info:', JSON.stringify(tooltipInfo))
})
