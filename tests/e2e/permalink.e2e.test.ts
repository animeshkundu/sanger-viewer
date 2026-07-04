import path from 'node:path'
import { test, expect } from '@playwright/test'
import { encodePermalinkState } from '../../src/workspace/permalink'

test('known permalink opens exact sample view state', async ({ page }) => {
  const encoded = encodePermalinkState(
    {
      source: { kind: 'sample', value: 'sample.ab1' },
      view: { startSample: 180, samplesPerPixel: 3.5 },
      strand: 'reverse',
      trim: { mode: 'full', threshold: 24 },
      search: { query: 'TGAT', activeIndex: 0 },
      selection: { baseIndex: 49 },
      edits: [{ forwardIndex: 9, base: 'N', originalBase: 'A' }],
      overlays: { quality: false, annotations: true, mixedBases: true },
    },
    { maxChars: 1800 },
  )
  if (!encoded.hash) throw new Error(encoded.error ?? 'Failed to encode test permalink')

  await page.goto(`/${encoded.hash}`)
  await expect(page.locator('#status')).toContainText('Loaded', { timeout: 10000 })
  await expect(page.locator('[data-action="toggle-strand"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-action="toggle-quality-track"]')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('[data-trim-mode="full"]')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#search-input')).toHaveValue('TGAT')
  await expect(page.locator('.sequence-panel .selected-base')).toHaveCount(1)

  const viewport = await page.locator('[data-testid="chromatogram-canvas"]').evaluate((canvasEl) => ({
    start: Number((canvasEl as HTMLCanvasElement).getAttribute('data-viewport-start') ?? '0'),
    spp: Number((canvasEl as HTMLCanvasElement).getAttribute('data-viewport-spp') ?? '0'),
  }))
  expect(viewport.start).toBeCloseTo(180, 6)
  expect(viewport.spp).toBeCloseTo(3.5, 6)
})

test('share button copies permalink and performs no network requests', async ({ page }) => {
  await page.addInitScript(() => {
    const copied: string[] = []
    Object.defineProperty(window, '__copiedPermalinks', { value: copied, configurable: true })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (text: string) => copied.push(text) },
      configurable: true,
    })
  })
  await page.goto('')
  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const requests: string[] = []
  page.on('request', (request) => {
    requests.push(`${request.method()} ${request.url()}`)
  })
  const before = requests.length
  await page.getByRole('button', { name: 'Share this view' }).click()
  await expect(page.locator('#share-status')).toContainText('Link copied')
  await page.waitForTimeout(250)
  expect(requests.length).toBe(before)

  const copied = await page.evaluate(() => (window as unknown as { __copiedPermalinks: string[] }).__copiedPermalinks)
  expect(copied).toHaveLength(1)
  expect(copied[0]).toContain('#sv=')
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`share button shows visible focus ring in ${colorScheme} mode`, async ({ page }) => {
    await page.emulateMedia({ colorScheme })
    await page.goto('')
    await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
    await expect(page.locator('#status')).toContainText('Loaded')
    const shareButton = page.getByRole('button', { name: 'Share this view' })
    await shareButton.focus()
    const outlineWidth = await shareButton.evaluate((node) => getComputedStyle(node).outlineWidth)
    expect(outlineWidth).toBe('3px')
  })
}
