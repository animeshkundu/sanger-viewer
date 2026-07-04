import fs from 'node:fs/promises'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

const MAX_TABS_TO_FILE_INPUT = 15

async function tabToFileInput(page: Page) {
  for (let i = 0; i < MAX_TABS_TO_FILE_INPUT; i++) {
    await page.keyboard.press('Tab')
    const focusedId = await page.evaluate(() => document.activeElement?.id ?? '')
    if (focusedId === 'file-input') return
  }
  throw new Error('Could not focus #file-input via keyboard navigation')
}

async function waitForInitialSampleLoad(page: Page) {
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1 (868 bases)')
  await expect(page.locator('#sample-ribbon')).toBeVisible()
}

test('shows the bundled sample trace on first load', async ({ page }) => {
  await waitForInitialSampleLoad(page)
  await expect(page.locator('#empty-state')).toBeHidden()
  await expect(page.locator('#dropzone-header')).toBeVisible()
  await expect(page.locator('#loading-banner')).toBeHidden()
  await expect(page.locator('#error-banner')).toBeHidden()
  await expect(page.locator('#success-banner')).toContainText('Loaded sample.ab1 (868 bases)')
})

test('first user file replaces the sample slot and hides the sample ribbon', async ({ page }) => {
  await waitForInitialSampleLoad(page)
  await expect(page.locator('.workspace-bar__tab')).toHaveCount(1)

  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded 310.ab1')
  await expect(page.locator('#sample-ribbon')).toBeHidden()
  await expect(page.locator('.workspace-bar__tab')).toHaveCount(1)
  await expect(page.locator('.workspace-bar__tab')).toContainText('310.ab1')
})

test('sample ribbon is dismissible and returns on a fresh sample load', async ({ page }) => {
  await waitForInitialSampleLoad(page)
  await page.getByRole('button', { name: 'Dismiss sample trace notice' }).click()
  await expect(page.locator('#sample-ribbon')).toBeHidden()

  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1 (868 bases)')
  await expect(page.locator('#sample-ribbon')).toBeVisible()
})

test('shows loading indicator then success banner after file load', async ({ page }) => {
  await waitForInitialSampleLoad(page)
  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')
  await expect(page.locator('#empty-state')).toBeHidden()
  await expect(page.locator('#success-banner')).toBeVisible()
  await expect(page.locator('#success-banner')).toContainText('Loaded')
  await expect(page.locator('#sample-ribbon')).toBeHidden()
})

test('shows error banner for invalid file and does not crash', async ({ page }) => {
  await waitForInitialSampleLoad(page)

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

test('sample autoload renders a painted canvas', async ({ page }) => {
  await waitForInitialSampleLoad(page)
  const isCanvasPainted = await page.locator('[data-testid="chromatogram-canvas"]').evaluate((canvasEl) => {
    const ctx = (canvasEl as HTMLCanvasElement).getContext('2d')
    if (!ctx) return false
    const { width, height } = canvasEl as HTMLCanvasElement
    if (width === 0 || height === 0) return false
    const pixels = ctx.getImageData(0, 0, width, height).data
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0 || pixels[i + 3] !== 0) {
        return true
      }
    }
    return false
  })
  expect(isCanvasPainted).toBeTruthy()
})

test('controls have accessible names', async ({ page }) => {
  await waitForInitialSampleLoad(page)
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
  await waitForInitialSampleLoad(page)

  await tabToFileInput(page)
  await expect(page.locator(':focus')).toHaveId('file-input')
  const headerFocusOutline = await page.locator('.dropzone-header__label').evaluate((node: Element) => {
    return window.getComputedStyle(node).outlineWidth
  })
  expect(headerFocusOutline).not.toBe('0px')

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

  await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')
  await page.focus('body')
  await tabToFileInput(page)
  await expect(page.locator(':focus')).toHaveId('file-input')
  const refreshedHeaderFocusOutline = await page.locator('.dropzone-header__label').evaluate((node: Element) => {
    return window.getComputedStyle(node).outlineWidth
  })
  expect(refreshedHeaderFocusOutline).not.toBe('0px')
})

test('drag-drop shows dragging class then clears it', async ({ page }) => {
  await waitForInitialSampleLoad(page)
  const dropzone = page.locator('[data-testid="dropzone"]')

  // Simulate dragover
  await dropzone.dispatchEvent('dragover', { bubbles: true, cancelable: true })
  await expect(dropzone).toHaveClass(/dragging/)

  // Simulate dragleave from the dropzone itself
  await dropzone.dispatchEvent('dragleave', { bubbles: true, relatedTarget: null })
  await expect(dropzone).not.toHaveClass(/dragging/)
})

test('dark mode uses correct design token surface color', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  const sample = await fs.readFile(path.resolve(process.cwd(), 'public/sample.ab1'))
  await page.route('**/sample.ab1', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250))
    await route.fulfill({
      status: 200,
      contentType: 'application/octet-stream',
      body: sample,
    })
  })

  await page.goto('')
  await expect(page.locator('#loading-banner')).toBeVisible()

  const [surfaceToken, canvasSurface, pixel] = await Promise.all([
    page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim()),
    page.locator('[data-testid="chromatogram-canvas"]').getAttribute('data-surface-color'),
    page.locator('[data-testid="chromatogram-canvas"]').evaluate((canvasEl) => {
      const ctx = (canvasEl as HTMLCanvasElement).getContext('2d')
      if (!ctx) return null
      const data = ctx.getImageData(0, 0, 1, 1).data
      return `rgb(${data[0]}, ${data[1]}, ${data[2]})`
    }),
  ])

  expect(surfaceToken).toBe('#1e293b')
  expect(canvasSurface).toBe('#1e293b')
  expect(canvasSurface).not.toBe('#fff')
  expect(pixel).toBe('rgb(30, 41, 59)')
})

test('new devlog entry is listed on blog index', async ({ page }) => {
  await page.goto('/blog/')
  await expect(
    page.getByRole('link', { name: /first impression/i })
  ).toBeVisible()

  await page.getByRole('link', { name: /first impression/i }).click()
  await expect(page).toHaveURL(/\/blog\/2026-07-04-v18-first-impression\/$/)
  await expect(page.getByRole('heading', { name: /first impression/i })).toBeVisible()
})
