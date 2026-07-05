/**
 * workspace-polish.e2e.test.ts
 *
 * Genuine behavior tests for the v28 workspace polish:
 *  1. prefers-reduced-motion disables shell transitions
 *  2. Narrow-viewport (<= 900 px) drawer collapses / re-expands gracefully
 *  3. Permalink round-trips the active sidebar tab + open/closed state exactly
 */

import { test, expect } from '@playwright/test'
import { encodePermalinkState } from '../../src/workspace/permalink'
import { openSidebarTab } from './helpers/sidebar'

async function waitForSampleLoad(page: import('@playwright/test').Page) {
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1', { timeout: 10000 })
}

// ── 1. prefers-reduced-motion: sidebar and tab transitions are suppressed ──

test('prefers-reduced-motion: sidebar-toggle-btn has no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await waitForSampleLoad(page)

  const transitionDuration = await page.locator('.sidebar-toggle-btn').evaluate((el) => {
    return getComputedStyle(el).transitionDuration
  })
  // All transition durations should be 0s when motion is reduced
  const durations = transitionDuration.split(',').map((s) => s.trim())
  for (const d of durations) {
    expect(d).toBe('0s')
  }
})

test('prefers-reduced-motion: shell-sidebar has no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await waitForSampleLoad(page)

  const transitionDuration = await page.locator('.shell-sidebar').evaluate((el) => {
    return getComputedStyle(el).transitionDuration
  })
  const durations = transitionDuration.split(',').map((s) => s.trim())
  for (const d of durations) {
    expect(d).toBe('0s')
  }
})

test('prefers-reduced-motion: sidebar-tab has no transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await waitForSampleLoad(page)

  const transitionDuration = await page.locator('.sidebar-tab').first().evaluate((el) => {
    return getComputedStyle(el).transitionDuration
  })
  const durations = transitionDuration.split(',').map((s) => s.trim())
  for (const d of durations) {
    expect(d).toBe('0s')
  }
})

// ── 2. Narrow-viewport (≤ 900 px) collapse behavior ───────────────────────

test('narrow-viewport: sidebar toggle is full-width at ≤ 900 px', { tag: ['@desktop'] }, async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 })
  await waitForSampleLoad(page)

  const toggleWidth = await page.locator('.sidebar-toggle-btn').evaluate((el) => el.getBoundingClientRect().width)
  const shellWidth = await page.locator('.shell-sidebar').evaluate((el) => el.getBoundingClientRect().width)

  // Toggle should span (approximately) the full sidebar width on narrow viewports
  expect(toggleWidth).toBeGreaterThanOrEqual(shellWidth - 4)
})

test('narrow-viewport: sidebar collapses and expands without exceeding 60 vh', { tag: ['@desktop'] }, async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 700 })
  await waitForSampleLoad(page)

  const toggle = page.locator('.sidebar-toggle-btn')
  const inner = page.locator('.sidebar-inner')

  // Sidebar starts open — inner should be visible and capped at 60 vh
  await expect(inner).toBeVisible()
  const innerHeight = await inner.evaluate((el) => el.getBoundingClientRect().height)
  const viewportHeight = 700
  expect(innerHeight).toBeLessThanOrEqual(viewportHeight * 0.6 + 1) // +1 for rounding

  // Toggle closes it
  await toggle.click()
  await expect(inner).toBeHidden()

  // Toggle reopens it
  await toggle.click()
  await expect(inner).toBeVisible()
})

test('narrow-viewport: sidebar tabs remain sticky (visible) while panel content scrolls', { tag: ['@desktop'] }, async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 500 })
  await waitForSampleLoad(page)

  // Switch to Analyze which has many items, making the panel overflow
  await openSidebarTab(page, 'analyze')

  const tabsRectBefore = await page.locator('.sidebar-tabs').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom }
  })
  const innerRect = await page.locator('.sidebar-inner').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top }
  })

  // Scroll the content; sticky tabs should stay pinned at the top of sidebar-inner.
  const scrollState = await page.locator('.sidebar-inner').evaluate((el) => {
    el.scrollTop = 180
    return { scrollTop: el.scrollTop, maxScroll: el.scrollHeight - el.clientHeight }
  })
  expect(scrollState.maxScroll).toBeGreaterThan(0)
  expect(scrollState.scrollTop).toBeGreaterThan(0)

  const tabsRectAfter = await page.locator('.sidebar-tabs').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom }
  })

  // Tabs remain visible and pinned to the inner container top after scrolling.
  expect(Math.abs(tabsRectAfter.top - innerRect.top)).toBeLessThanOrEqual(1)
  expect(Math.abs(tabsRectAfter.top - tabsRectBefore.top)).toBeLessThanOrEqual(1)
  expect(tabsRectAfter.bottom).toBeGreaterThanOrEqual(tabsRectAfter.top)
})

// ── 3. Permalink round-trips active sidebar tab and open/closed state ──────

test('permalink backward-compat: legacy hash without ui defaults to open Inspect tab', async ({ page }) => {
  const encoded = encodePermalinkState(
    {
      source: { kind: 'sample', value: 'sample.ab1' },
      view: { startSample: 0, samplesPerPixel: 6 },
      strand: 'forward',
      trim: { mode: 'full', threshold: 20 },
      search: { query: '', activeIndex: -1 },
      selection: { baseIndex: null },
      edits: [],
      overlays: { quality: true, annotations: true, mixedBases: true },
    },
    { maxChars: 1800 },
  )
  if (!encoded.hash) throw new Error(encoded.error ?? 'Failed to encode test permalink')

  await page.goto(`/${encoded.hash}`)
  await expect(page.locator('#status')).toContainText('Loaded', { timeout: 10000 })
  await expect(page.locator('.shell-sidebar')).toHaveAttribute('data-sidebar-open', 'true')
  await expect(page.locator('[data-tab="inspect"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#sidebar-panel-inspect')).toBeVisible()
})

test('permalink round-trip: restores closed sidebar state', async ({ page }) => {
  const encoded = encodePermalinkState(
    {
      source: { kind: 'sample', value: 'sample.ab1' },
      view: { startSample: 0, samplesPerPixel: 6 },
      strand: 'forward',
      trim: { mode: 'full', threshold: 20 },
      search: { query: '', activeIndex: -1 },
      selection: { baseIndex: null },
      edits: [],
      overlays: { quality: true, annotations: true, mixedBases: true },
      ui: { sidebarOpen: false, activeTab: 'inspect' },
    },
    { maxChars: 1800 },
  )
  if (!encoded.hash) throw new Error(encoded.error ?? 'Failed to encode test permalink')

  await page.goto(`/${encoded.hash}`)
  await expect(page.locator('#status')).toContainText('Loaded', { timeout: 10000 })

  // Sidebar should be closed
  await expect(page.locator('.shell-sidebar')).toHaveAttribute('data-sidebar-open', 'false')
  await expect(page.locator('.sidebar-inner')).toBeHidden()
})

test('permalink round-trip: restores open sidebar with Map tab active', async ({ page }) => {
  const encoded = encodePermalinkState(
    {
      source: { kind: 'sample', value: 'sample.ab1' },
      view: { startSample: 0, samplesPerPixel: 6 },
      strand: 'forward',
      trim: { mode: 'full', threshold: 20 },
      search: { query: '', activeIndex: -1 },
      selection: { baseIndex: null },
      edits: [],
      overlays: { quality: true, annotations: true, mixedBases: true },
      ui: { sidebarOpen: true, activeTab: 'map' },
    },
    { maxChars: 1800 },
  )
  if (!encoded.hash) throw new Error(encoded.error ?? 'Failed to encode test permalink')

  await page.goto(`/${encoded.hash}`)
  await expect(page.locator('#status')).toContainText('Loaded', { timeout: 10000 })

  // Sidebar should be open
  await expect(page.locator('.shell-sidebar')).toHaveAttribute('data-sidebar-open', 'true')
  await expect(page.locator('.sidebar-inner')).toBeVisible()

  // Map tab should be active
  await expect(page.locator('[data-tab="map"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#sidebar-panel-map')).toBeVisible()
  await expect(page.locator('#sidebar-panel-inspect')).toBeHidden()
})

test('permalink round-trip: restores open sidebar with Analyze tab active', async ({ page }) => {
  const encoded = encodePermalinkState(
    {
      source: { kind: 'sample', value: 'sample.ab1' },
      view: { startSample: 0, samplesPerPixel: 6 },
      strand: 'forward',
      trim: { mode: 'full', threshold: 20 },
      search: { query: '', activeIndex: -1 },
      selection: { baseIndex: null },
      edits: [],
      overlays: { quality: true, annotations: true, mixedBases: true },
      ui: { sidebarOpen: true, activeTab: 'analyze' },
    },
    { maxChars: 1800 },
  )
  if (!encoded.hash) throw new Error(encoded.error ?? 'Failed to encode test permalink')

  await page.goto(`/${encoded.hash}`)
  await expect(page.locator('#status')).toContainText('Loaded', { timeout: 10000 })

  await expect(page.locator('.shell-sidebar')).toHaveAttribute('data-sidebar-open', 'true')
  await expect(page.locator('[data-tab="analyze"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#sidebar-panel-analyze')).toBeVisible()
})

test('permalink round-trip: toggling sidebar then reloading from updated hash preserves closed state', async ({ page }) => {
  await waitForSampleLoad(page)

  // Close the sidebar
  const toggle = page.locator('.sidebar-toggle-btn')
  await toggle.click()
  await expect(page.locator('.shell-sidebar')).toHaveAttribute('data-sidebar-open', 'false')

  // Wait for hash to update via rAF persist
  await page.waitForFunction(() => location.hash.includes('#sv='), { timeout: 2000 })
  const hash = await page.evaluate(() => location.hash)

  // Reload from that hash in a fresh page
  await page.goto(`/${hash}`)
  await expect(page.locator('#status')).toContainText('Loaded', { timeout: 10000 })
  await expect(page.locator('.shell-sidebar')).toHaveAttribute('data-sidebar-open', 'false')
  await expect(page.locator('.sidebar-inner')).toBeHidden()
})

test('permalink round-trip: switching to Share tab is captured in hash and restored', async ({ page }) => {
  await waitForSampleLoad(page)

  // Switch to Share tab
  await openSidebarTab(page, 'share')
  await expect(page.locator('[data-tab="share"]')).toHaveAttribute('aria-selected', 'true')

  // Wait for permalink persist
  await page.waitForFunction(() => location.hash.includes('#sv='), { timeout: 2000 })
  const hash = await page.evaluate(() => location.hash)

  // Reload from that hash
  await page.goto(`/${hash}`)
  await expect(page.locator('#status')).toContainText('Loaded', { timeout: 10000 })
  await expect(page.locator('[data-tab="share"]')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#sidebar-panel-share')).toBeVisible()
})
