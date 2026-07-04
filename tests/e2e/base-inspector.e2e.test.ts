import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const KNOWN_INDEX = 0

// Golden values for fixtures/ab1/310.ab1 at index 0 (forward strand, default mixed-base threshold).
// Verified by running getBaseInspectorInfo against the parsed fixture:
//   position=1, base="T", quality=0, peakAmplitude=232
// Update this block if the fixture or parsing logic changes.
const EXPECTED = {
  position: '1',
  base: 'T',
  quality: '0',
  peakAmplitude: '232',
  ariaLabel: 'Base inspector: position 1, base T, PHRED 0, peak amplitude 232',
} as const

async function loadFixture(page: Page): Promise<void> {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
}

async function expectExactInspector(page: Page) {
  const inspector = page.locator('#base-inspector')
  await expect(inspector).toBeVisible()
  await expect(inspector).toHaveAttribute('role', 'dialog')
  await expect(inspector).toHaveAttribute('aria-label', EXPECTED.ariaLabel)
  await expect(inspector.locator('[data-field="position"]')).toHaveText(EXPECTED.position)
  await expect(inspector.locator('[data-field="base"]')).toHaveText(EXPECTED.base)
  await expect(inspector.locator('[data-field="quality"]')).toHaveText(EXPECTED.quality)
  await expect(inspector.locator('[data-field="peak-amplitude"]')).toHaveText(EXPECTED.peakAmplitude)
}

test('shows exact base inspector data and ARIA semantics for a known base', async ({ page }) => {
  await loadFixture(page)
  const target = page.locator(`.sequence-panel span[data-base-index="${KNOWN_INDEX}"]`)

  await target.focus()
  await expect(target).toHaveAttribute('aria-haspopup', 'dialog')
  await expect(target).toHaveAttribute('aria-expanded', 'true')
  await expect(target).toHaveAttribute('aria-describedby', 'base-inspector')
  await expectExactInspector(page)

  await page.keyboard.press('Escape')
  await expect(page.locator('#base-inspector')).toBeHidden()
  await expect(target).toHaveAttribute('aria-expanded', 'false')

  await page.keyboard.press('Enter')
  await expectExactInspector(page)
  await page.keyboard.press('Escape')

  await page.keyboard.press('Space')
  await expectExactInspector(page)
})

test('closes inspector on focus leaving sequence panel and works in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await loadFixture(page)
  const target = page.locator(`.sequence-panel span[data-base-index="${KNOWN_INDEX}"]`)

  await target.focus()
  await expectExactInspector(page)
  await expect.poll(async () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-inspector-bg').trim())
  ).toBe('#0f172a')

  await page.getByRole('button', { name: 'Zoom +' }).focus()
  await expect(page.locator('#base-inspector')).toBeHidden()
})

test('hover tooltip still renders peak data text', { tag: ['@desktop'] }, async ({ page, isMobile }) => {
  test.skip(isMobile, 'tablet/touch project does not support mouse hover checks')
  await loadFixture(page)
  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not visible')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('.tooltip')).toContainText('peak:')
})

test('only the focused span carries active ARIA attributes - other spans remain inactive', async ({ page }) => {
  await loadFixture(page)
  const span0 = page.locator(`.sequence-panel span[data-base-index="0"]`)
  const span1 = page.locator(`.sequence-panel span[data-base-index="1"]`)

  // Focus span 0 — it should become active; span 1 must stay inactive
  await span0.focus()
  await expect(span0).toHaveAttribute('aria-expanded', 'true')
  await expect(span0).toHaveAttribute('aria-describedby', 'base-inspector')
  await expect(span1).toHaveAttribute('aria-expanded', 'false')
  await expect(span1).not.toHaveAttribute('aria-describedby')

  // Move focus to span 1 — span 1 becomes active, span 0 must be cleared
  await span1.focus()
  await expect(span1).toHaveAttribute('aria-expanded', 'true')
  await expect(span1).toHaveAttribute('aria-describedby', 'base-inspector')
  await expect(span0).toHaveAttribute('aria-expanded', 'false')
  await expect(span0).not.toHaveAttribute('aria-describedby')
})

test('tooltip is hidden when keyboard inspector opens', { tag: ['@desktop'] }, async ({ page, isMobile }) => {
  test.skip(isMobile, 'tablet/touch project does not support mouse hover checks')
  await loadFixture(page)

  // Show the hover tooltip via mouse
  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not visible')
  await page.mouse.move(box.x + 8, box.y + box.height / 2)
  await page.locator('.tooltip').waitFor({ state: 'visible', timeout: 3000 })
  await expect(page.locator('.tooltip')).toBeVisible()
  await expect(page.locator('.tooltip')).toContainText('peak:')

  // Focus a rendered sequence base via keyboard — tooltip must be dismissed, inspector must appear.
  const target = page.locator(`.sequence-panel span[data-base-index="${KNOWN_INDEX}"]`)
  await target.scrollIntoViewIfNeeded()
  await expect(target).toBeVisible()
  await target.evaluate(() =>
    new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  await expect(target).toHaveAttribute('tabindex', '0')
  await target.focus()
  await expect(page.locator('.tooltip')).toBeHidden()
  await expect(page.locator('#base-inspector')).toBeVisible()
})
