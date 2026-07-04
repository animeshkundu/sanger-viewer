import { test, expect } from '@playwright/test'
import path from 'node:path'

declare global {
  interface Window { __pointerMoveCount: number }
}

test('diagnose layout', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')
  
  // Check element heights
  const layout = await page.evaluate(() => {
    const header = document.querySelector('.site-header') as HTMLElement
    const app = document.getElementById('app') as HTMLElement
    const viewer = document.querySelector('.viewer') as HTMLElement
    const h1 = viewer.querySelector('h1') as HTMLElement
    const appShell = viewer.querySelector('.app-shell') as HTMLElement
    const shellHero = viewer.querySelector('.shell-hero') as HTMLElement
    const dropzone = viewer.querySelector('.dropzone') as HTMLElement
    const workspaceBar = viewer.querySelector('.workspace-bar') as HTMLElement
    const annotationTrack = viewer.querySelector('.annotation-track') as HTMLElement
    const canvas = document.querySelector('[data-testid="chromatogram-canvas"]') as HTMLElement
    const canvasWrap = canvas.closest('.canvas-wrap') as HTMLElement
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    
    const getBounds = (el: HTMLElement | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom, height: r.height, width: r.width }
    }
    
    return {
      viewport,
      header: getBounds(header),
      app: getBounds(app),
      viewer: getBounds(viewer),
      h1: getBounds(h1),
      appShell: getBounds(appShell),
      shellHero: getBounds(shellHero),
      dropzone: getBounds(dropzone),
      workspaceBar: getBounds(workspaceBar),
      annotationTrack: getBounds(annotationTrack),
      canvasWrap: getBounds(canvasWrap),
      canvas: getBounds(canvas),
    }
  })
  
  console.log('Layout:', JSON.stringify(layout, null, 2))
  
  // Is canvas center in viewport?
  const canvasY = layout.canvas!.top
  const canvasCenterY = canvasY + layout.canvas!.height / 2
  console.log(`Canvas center Y: ${canvasCenterY}, Viewport height: ${layout.viewport.height}`)
  console.log(`Canvas center in viewport: ${canvasCenterY < layout.viewport.height}`)
})
