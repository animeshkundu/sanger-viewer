import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect } from '@playwright/test'

const fixtures = ['fixtures/ab1/310.ab1', 'fixtures/ab1/3100.ab1', 'fixtures/scf/abcZ_F.scf', 'fixtures/large/3730.ab1']

test('loads fixture set and renders interactions', async ({ page }) => {
  await page.goto('')

  for (const fixture of fixtures) {
    await page.setInputFiles('#file-input', path.resolve(process.cwd(), fixture))
    await expect(page.locator('#status')).toContainText('Loaded')

    const nonBlank = await page.locator('[data-testid="chromatogram-canvas"]').evaluate((canvas) => {
      const element = canvas as HTMLCanvasElement
      const ctx = element.getContext('2d')!
      const data = ctx.getImageData(0, 0, element.width, element.height).data
      let sum = 0
      for (let i = 0; i < data.length; i += 4) {
        sum += data[i] + data[i + 1] + data[i + 2]
      }
      return sum > 0
    })
    expect(nonBlank).toBeTruthy()

    await page.getByRole('button', { name: 'Zoom +' }).click()
    await page.getByRole('button', { name: '← Pan' }).click()

    const canvas = page.locator('[data-testid="chromatogram-canvas"]')
    // Controls are below the canvas in the shell layout; clicking them scrolls
    // the page and can push the canvas above the viewport top.  Scroll back so
    // the canvas centre is reachable by mouse.move before we hover over it.
    await canvas.scrollIntoViewIfNeeded()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not visible')
    for (let step = 1; step <= 6; step += 1) {
      await page.mouse.move(box.x + (box.width * step) / 7, box.y + box.height / 2)
      const visible = await page.locator('.tooltip').isVisible()
      if (visible) break
    }
    await expect(page.locator('.tooltip')).toContainText('peak:')
  }

  const pngDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export menu' }).click()
  await page.getByRole('menuitem', { name: 'Export PNG' }).click()
  expect((await pngDownload).suggestedFilename()).toContain('.png')

  const fastaDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export menu' }).click()
  await page.getByRole('menuitem', { name: 'Export FASTA' }).click()
  expect((await fastaDownload).suggestedFilename()).toContain('.fasta')
})

test('supports drag and drop', async ({ page }) => {
  await page.goto('')
  const fixturePath = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
  const fixture = await fs.readFile(fixturePath)
  const payload = fixture.toString('base64')
  const data = await page.evaluateHandle(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    const file = new File([bytes], '310.ab1', { type: 'application/octet-stream' })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    return transfer
  }, payload)

  await page.dispatchEvent('[data-testid="dropzone"]', 'drop', { dataTransfer: data })
  await expect(page.locator('#status')).toContainText('Loaded')
})
