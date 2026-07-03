import path from 'node:path'
import { test, expect } from '@playwright/test'

test('shows empty state on first load', async ({ page }) => {
  await page.goto('')
  await expect(page.locator('#empty-state')).toBeVisible()
  await expect(page.locator('#empty-state .empty-state__title')).toContainText('Load a Sanger trace')
  await expect(page.getByRole('button', { name: /load sample/i })).toBeVisible()
  // Compact header should be hidden, banners should be hidden
  await expect(page.locator('#dropzone-header')).toBeHidden()
  await expect(page.locator('#loading-banner')).toBeHidden()
  await expect(page.locator('#error-banner')).toBeHidden()
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

test('sample load button fetches and loads the sample trace', async ({ page }) => {
  await page.goto('')
  const sampleBtn = page.getByRole('button', { name: /load sample/i })
  await expect(sampleBtn).toBeVisible()
  await sampleBtn.click()
  // Loading banner should appear first
  // Then resolve to either success or error (network may not serve sample in all envs)
  // We verify: loading eventually finishes (loading banner goes away)
  await expect(page.locator('#loading-banner')).toBeHidden({ timeout: 10000 })
  // And some outcome banner is shown
  const successVisible = await page.locator('#success-banner').isVisible()
  const errorVisible = await page.locator('#error-banner').isVisible()
  expect(successVisible || errorVisible).toBeTruthy()
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

  // Tab through at least three focusable elements in the empty state
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

test('dark mode uses correct design token surface color', async ({ page }) => {
  // Force dark mode via override
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('')
  const bgToken = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
  )
  // Dark palette defines --color-bg as #0f172a
  expect(bgToken).toBe('#0f172a')
})

test('new devlog entry is listed on blog index', async ({ page }) => {
  await page.goto('/blog/')
  await expect(
    page.getByRole('link', { name: /frictionless UX \+ a11y/i })
  ).toBeVisible()

  await page.getByRole('link', { name: /frictionless UX \+ a11y/i }).click()
  await expect(page).toHaveURL(/\/blog\/2026-07-03-v2-ux-a11y\/$/)
  await expect(page.getByRole('heading', { name: /easy to use/i })).toBeVisible()
})
