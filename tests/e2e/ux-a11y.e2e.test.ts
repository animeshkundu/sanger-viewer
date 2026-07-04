import fs from 'node:fs/promises'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

const MAX_TABS_TO_FILE_INPUT = 15
const SAMPLE_BASE_COUNT = 868
const SAMPLE_BASE_AT_POSITION_100 = 'C'

async function tabToFileInput(page: Page) {
  for (let i = 0; i < MAX_TABS_TO_FILE_INPUT; i++) {
    await page.keyboard.press('Tab')
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? '')
    if (focusedId === 'file-input') return
  }
  throw new Error('Could not focus #file-input via keyboard navigation')
}

test('auto-loads the bundled sample trace on first load', async ({ page }) => {
  await page.goto('')
  await expect(page.locator('#status')).toContainText(`Loaded sample.ab1 (${SAMPLE_BASE_COUNT} bases)`, { timeout: 10000 })
  await expect(page.locator('#empty-state')).toBeHidden()
  await expect(page.locator('#dropzone-header')).toBeVisible()
  await expect(page.locator('#success-banner')).toContainText(`Loaded sample.ab1 (${SAMPLE_BASE_COUNT} bases)`)
  await expect(page.locator('[data-testid="chromatogram-canvas"]')).toHaveAttribute('data-viewport-start', /\d/)
  await expect(page.locator('[data-testid="quality-track-canvas"]')).toHaveAttribute('data-bar-count', /\d+/)
  await expect(page.locator('.sequence-panel [data-base-index="99"]')).toHaveText(SAMPLE_BASE_AT_POSITION_100)
  await expect(page.locator('.sequence-panel [data-base-index="99"]')).toHaveAttribute('aria-label', 'C at position 100')
  await expect(page.locator('[data-testid="sample-ribbon"]')).toBeVisible()
})

test('shows loading indicator then success banner after file load', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')
  // After successful load: empty state hidden, success banner visible
  await expect(page.locator('#empty-state')).toBeHidden()
  await expect(page.locator('#success-banner')).toBeVisible()
  await expect(page.locator('#success-banner')).toContainText('Loaded')
})

test('shows error banner for invalid file and does not crash', async ({ page }) => {
  await page.goto('')

  // Intercept any uncaught errors
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  // Simulate an invalid file via DataTransfer drop
  await page.evaluate(async () => {
    const badBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03])
    const file = new File([badBytes], 'bad.ab1', { type: 'application/octet-stream' })
    const transfer = new DataTransfer()
    transfer.items.add(file)
    const dropzone = document.querySelector('[data-testid="dropzone"]')!
    dropzone.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }))
  })

  await expect(page.locator('#error-banner')).toBeVisible({ timeout: 5000 })
  await expect(page.locator('#error-banner')).not.toBeEmpty()
  // Page must not have crashed
  expect(errors).toHaveLength(0)
})

test('sample ribbon is dismissible and hides when a user file loads', async ({ page }) => {
  await page.goto('')
  const ribbon = page.locator('[data-testid="sample-ribbon"]')
  await expect(ribbon).toBeVisible({ timeout: 10000 })
  await page.locator('[data-testid="sample-ribbon-dismiss"]').click()
  await expect(ribbon).toBeHidden()

  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded 310.ab1')
  await expect(ribbon).toBeHidden()
})

test('controls have accessible names', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  // All buttons should have an accessible name (aria-label or visible text)
  const buttons = page.locator('.controls button')
  const count = await buttons.count()
  for (let i = 0; i < count; i++) {
    const btn = buttons.nth(i)
    const ariaLabel = await btn.getAttribute('aria-label')
    const textContent = await btn.textContent()
    expect((ariaLabel ?? textContent ?? '').trim().length).toBeGreaterThan(0)
  }
})

test('keyboard focus order is logical and focus rings are visible', { tag: ['@desktop'] }, async ({ page, isMobile }) => {
  test.skip(isMobile, 'tablet/touch project does not support keyboard focus testing')
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1', { timeout: 10000 })

  await tabToFileInput(page)
  await expect(page.locator(':focus')).toHaveId('file-input')
  const initialFocusOutline = await page.locator('.dropzone-header__label').evaluate((node: Element) => {
    return window.getComputedStyle(node).outlineWidth
  })
  expect(initialFocusOutline).not.toBe('0px')

  // Tab through at least three focusable elements in the loaded state
  const handles: string[] = []
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Tab')
    const focused = page.locator(':focus')
    await expect(focused).toBeVisible()
    const text = (await focused.textContent()) ?? ''
    const label = (await focused.getAttribute('aria-label')) ?? ''
    handles.push(text + '|' + label)
  }

  // Each Tab press should have moved to a different element
  expect(new Set(handles).size).toBeGreaterThan(1)

  // Verify focused elements receive an outline (focus ring) — re-Tab to refresh :focus
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
  const outline = await focused.evaluate((node: Element) => {
    return window.getComputedStyle(node).outlineWidth
  })
  expect(outline).not.toBe('0px')
})

test('drag-drop shows dragging class then clears it', async ({ page }) => {
  await page.goto('')
  const dropzone = page.locator('[data-testid="dropzone"]')

  // Simulate dragover
  await dropzone.dispatchEvent('dragover', { bubbles: true, cancelable: true })
  await expect(dropzone).toHaveClass(/dragging/)

  // Simulate dragleave from the dropzone itself
  await dropzone.dispatchEvent('dragleave', { bubbles: true, relatedTarget: null })
  await expect(dropzone).not.toHaveClass(/dragging/)
})

test('dark mode paints the chromatogram canvas with the dark surface color instead of white', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  const sampleBytes = await fs.readFile(path.resolve(process.cwd(), 'public/sample.ab1'))
  await page.route('**/sample.ab1', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: sampleBytes,
    })
  })
  await page.goto('')
  await expect(page.locator('#loading-banner')).toBeVisible()

  const { surface, expectedPixel, pixel } = await page.locator('[data-testid="chromatogram-canvas"]').evaluate((canvasEl) => {
    const canvas = canvasEl as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D context unavailable')
    const surface = getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim()
    const parser = document.createElement('div')
    parser.style.color = surface
    document.body.append(parser)
    const expectedPixel = getComputedStyle(parser).color.match(/\d+/g)?.map(Number) ?? []
    parser.remove()
    const pixel = Array.from(ctx.getImageData(1, 1, 1, 1).data)
    return { surface, expectedPixel, pixel }
  })

  expect(surface).toBe('#1e293b')
  expect(pixel).toEqual([...expectedPixel, 255])
  expect(pixel).not.toEqual([255, 255, 255, 255])
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1', { timeout: 10000 })
})

test('new devlog entry is listed on blog index', async ({ page }) => {
  await page.goto('/blog/')
  await expect(
    page.getByRole('link', { name: /first-impression overhaul/i })
  ).toBeVisible()

  await page.getByRole('link', { name: /first-impression overhaul/i }).click()
  await expect(page).toHaveURL(/\/blog\/2026-07-04-v18-first-impression\/$/)
  await expect(page.getByRole('heading', { name: /first-impression overhaul/i })).toBeVisible()
})
