import { expect, test } from '@playwright/test'
import { encodePermalinkState, type PermalinkStateV1 } from '../../src/workspace/permalink'

test('known permalink restores exact sample view state (zoom + base + strand)', async ({ page }) => {
  const state: PermalinkStateV1 = {
    version: 1,
    source: { kind: 'sample', value: 'sample.ab1' },
    view: { startSample: 0, samplesPerPixel: 2, strand: 'reverse' },
    trim: { mode: 'full', threshold: 20 },
    search: { query: '', activeIndex: -1 },
    selection: { baseIndex: 12 },
    edits: [],
    tracks: { quality: false, annotations: true },
  }
  const hash = encodePermalinkState(state).hash
  if (!hash) throw new Error('Failed to encode permalink test state')

  await page.goto(`/${hash}`)
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1 from permalink')
  await expect(page.locator('[data-action="toggle-strand"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-testid="chromatogram-canvas"]')).toHaveAttribute('data-viewport-start', '0')
  await expect(page.locator('[data-testid="chromatogram-canvas"]')).toHaveAttribute('data-viewport-spp', '2')
  await expect(page.locator('.quality-track__toggle')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.sequence-panel [data-base-index="12"]')).toHaveClass(/selected-base/)
})

test('Share this view writes permalink URL to clipboard with feedback', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __clipboardWrites: string[] }).__clipboardWrites = []
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text: string) => {
          ;(window as unknown as { __clipboardWrites: string[] }).__clipboardWrites.push(text)
        },
      },
      configurable: true,
    })
  })

  await page.goto('')
  await page.getByRole('button', { name: /load sample/i }).click()
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1')

  await page.getByRole('button', { name: 'Zoom +' }).click()
  await page.getByRole('button', { name: 'Pan →' }).click()
  await page.getByRole('button', { name: /5′→3′/ }).click()
  await page.getByRole('button', { name: /Hide quality track/i }).click()
  await page.locator('.sequence-panel [data-base-index="8"]').click()

  await page.getByRole('button', { name: /Share this view/i }).click()
  await expect(page.locator('#share-feedback')).toHaveText('Share link copied.')

  const writes = await page.evaluate(() => (window as unknown as { __clipboardWrites: string[] }).__clipboardWrites)
  expect(writes).toHaveLength(1)
  expect(writes[0]).toContain('#sv=')
})
