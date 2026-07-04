import path from 'node:path'
import { test, expect } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const KNOWN_INDEX = 0

test('diag6: which event type causes refreshSequence', async ({ page }) => {
  const browserLogs: string[] = []
  page.on('console', msg => browserLogs.push(msg.text()))

  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not visible')
  
  await page.evaluate(() => {
    const seqPanel = document.querySelector('.sequence-panel') as HTMLElement
    if (seqPanel) {
      seqPanel.addEventListener('focusin', (e) => {
        const t = e.target as HTMLElement
        console.log('FOCUSIN baseIndex=' + t?.dataset?.baseIndex)
      })
      seqPanel.addEventListener('focusout', (e) => {
        const t = e.target as HTMLElement
        // Capture FULL stack 
        const lines = new Error().stack?.split('\n') || []
        console.log('FOCUSOUT baseIndex=' + t?.dataset?.baseIndex)
        // Print each frame
        for (let i = 1; i < Math.min(lines.length, 15); i++) {
          console.log('  frame[' + i + ']: ' + lines[i].trim())
        }
      })
    }
  })

  await page.mouse.move(box.x + 8, box.y + box.height / 2)
  await page.locator('.tooltip').waitFor({ state: 'visible', timeout: 3000 })
  browserLogs.length = 0
  
  const target = page.locator(`.sequence-panel span[data-base-index="${KNOWN_INDEX}"]`)
  await target.scrollIntoViewIfNeeded()
  await expect(target).toBeVisible()
  await target.focus()
  await page.waitForTimeout(200)
  
  for (const log of browserLogs) {
    console.log('B:', log)
  }
})
