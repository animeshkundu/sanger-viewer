import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'
import { parseTrace } from '../../src/parsers'
import { callMixedBases, DEFAULT_MIXED_BASE_THRESHOLD } from '../../src/calling/mixedBase'
import { getBaseInspectorInfo } from '../../src/components/BaseInspector'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const KNOWN_INDEX = 0

type ExpectedInspector = {
  position: string
  base: string
  quality: string
  peakAmplitude: string
  ariaLabel: string
}

const expectedInspectorPromise: Promise<ExpectedInspector> = (async () => {
  const fixture = await fs.readFile(FIXTURE)
  const buffer = fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength)
  const trace = parseTrace(buffer, '310.ab1')
  const mixed = callMixedBases(trace, DEFAULT_MIXED_BASE_THRESHOLD)
  const displayTrace = {
    ...trace,
    baseCalls: mixed.baseCalls,
    sequence: mixed.sequence,
  }
  const info = getBaseInspectorInfo(displayTrace, KNOWN_INDEX)
  if (!info) throw new Error('Failed to resolve known base inspector info')
  return {
    position: String(info.position),
    base: info.base,
    quality: String(info.quality ?? 'n/a'),
    peakAmplitude: String(info.peakAmplitude),
    ariaLabel: info.ariaLabel,
  }
})()

async function loadFixture(page: Page): Promise<void> {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
}

async function expectExactInspector(page: Page, expected: ExpectedInspector) {
  const inspector = page.locator('#base-inspector')
  await expect(inspector).toBeVisible()
  await expect(inspector).toHaveAttribute('role', 'dialog')
  await expect(inspector).toHaveAttribute('aria-label', expected.ariaLabel)
  await expect(inspector.locator('[data-field="position"]')).toHaveText(expected.position)
  await expect(inspector.locator('[data-field="base"]')).toHaveText(expected.base)
  await expect(inspector.locator('[data-field="quality"]')).toHaveText(expected.quality)
  await expect(inspector.locator('[data-field="peak-amplitude"]')).toHaveText(expected.peakAmplitude)
}

test('shows exact base inspector data and ARIA semantics for a known base', async ({ page }) => {
  const expected = await expectedInspectorPromise
  await loadFixture(page)
  const target = page.locator(`.sequence-panel span[data-base-index="${KNOWN_INDEX}"]`)

  await target.focus()
  await expect(target).toHaveAttribute('aria-haspopup', 'dialog')
  await expect(target).toHaveAttribute('aria-expanded', 'true')
  await expect(target).toHaveAttribute('aria-describedby', 'base-inspector')
  await expectExactInspector(page, expected)

  await page.keyboard.press('Escape')
  await expect(page.locator('#base-inspector')).toBeHidden()
  await expect(target).toHaveAttribute('aria-expanded', 'false')

  await page.keyboard.press('Enter')
  await expectExactInspector(page, expected)
  await page.keyboard.press('Escape')

  await page.keyboard.press('Space')
  await expectExactInspector(page, expected)
})

test('closes inspector on focus leaving sequence panel and works in dark mode', async ({ page }) => {
  const expected = await expectedInspectorPromise
  await page.emulateMedia({ colorScheme: 'dark' })
  await loadFixture(page)
  const target = page.locator(`.sequence-panel span[data-base-index="${KNOWN_INDEX}"]`)

  await target.focus()
  await expectExactInspector(page, expected)
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
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.locator('.tooltip').waitFor({ state: 'visible', timeout: 3000 })
  await expect(page.locator('.tooltip')).toContainText('peak:')

  // Focus a sequence base via keyboard — tooltip must be dismissed, inspector must appear
  const target = page.locator(`.sequence-panel span[data-base-index="${KNOWN_INDEX}"]`)
  await target.focus()
  await expect(page.locator('.tooltip')).toBeHidden()
  await expect(page.locator('#base-inspector')).toBeVisible()
})
