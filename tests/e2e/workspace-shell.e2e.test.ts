import { test, expect, type Page } from '@playwright/test'

async function waitForSampleLoad(page: Page) {
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1')
}

async function tabUntil(page: Page, selector: string, maxTabs = 120) {
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press('Tab')
    const matches = await page.evaluate((targetSelector) => {
      const active = document.activeElement as HTMLElement | null
      return active?.matches(targetSelector) ?? false
    }, selector)
    if (matches) return
  }
  throw new Error(`Could not focus ${selector} within ${maxTabs} Tabs`)
}

test.describe('Workspace shell', () => {
  test('keeps the chromatogram hero above the fold on load', async ({ page }) => {
    await waitForSampleLoad(page)

    const heroVisibleWithoutScroll = await page.locator('.app-shell').evaluate(() => {
      const canvas = document.querySelector<HTMLElement>('[data-testid="chromatogram-canvas"]')
      const hero = document.querySelector<HTMLElement>('.shell-hero')
      if (!canvas || !hero) return false
      const canvasRect = canvas.getBoundingClientRect()
      const heroRect = hero.getBoundingClientRect()
      return heroRect.top >= 0 && canvasRect.top >= 0 && canvasRect.top < window.innerHeight
    })

    expect(heroVisibleWithoutScroll).toBeTruthy()
  })

  test('sidebar is open by default and toggle closes/reopens it', async ({ page }) => {
    await waitForSampleLoad(page)

    const sidebar = page.locator('.shell-sidebar')
    const toggle = page.locator('.sidebar-toggle-btn')
    const inner = page.locator('.sidebar-inner')

    await expect(sidebar).toHaveAttribute('data-sidebar-open', 'true')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(inner).toBeVisible()

    await toggle.click()
    await expect(sidebar).toHaveAttribute('data-sidebar-open', 'false')
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(inner).toBeHidden()

    await toggle.click()
    await expect(sidebar).toHaveAttribute('data-sidebar-open', 'true')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(inner).toBeVisible()
  })

  test('tab switching reveals inspect, map, analyze, and share panels', async ({ page }) => {
    await waitForSampleLoad(page)

    const inspectPanel = page.locator('#sidebar-panel-inspect')
    const mapPanel = page.locator('#sidebar-panel-map')
    const analyzePanel = page.locator('#sidebar-panel-analyze')
    const sharePanel = page.locator('#sidebar-panel-share')

    await expect(page.getByRole('tab', { name: 'Inspect' })).toHaveAttribute('aria-selected', 'true')
    await expect(inspectPanel).toBeVisible()
    await expect(inspectPanel.locator('#search-input')).toBeVisible()
    await expect(inspectPanel.locator('[data-trim="threshold"]')).toBeVisible()

    await page.getByRole('tab', { name: 'Map' }).click()
    await expect(mapPanel).toBeVisible()
    await expect(mapPanel.locator('[data-testid="plasmid-map"]')).toBeVisible()

    await page.getByRole('tab', { name: 'Analyze' }).click()
    await expect(analyzePanel).toBeVisible()
    await expect(analyzePanel.locator('[data-testid="contig-panel"]')).toBeVisible()

    await page.getByRole('tab', { name: 'Share' }).click()
    await expect(sharePanel).toBeVisible()
    await expect(sharePanel.locator('[data-testid="share-view-btn"]')).toBeVisible()
  })

  test('secondary tools remain keyboard-reachable across panels', { tag: ['@desktop'] }, async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard reachability only asserted on desktop')
    await waitForSampleLoad(page)

    const sidebar = page.locator('.shell-sidebar')

    // Sidebar toggle is keyboard-reachable and operates via Enter.
    await page.focus('body')
    await tabUntil(page, '.sidebar-toggle-btn')
    await expect(page.locator('.sidebar-toggle-btn')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(sidebar).toHaveAttribute('data-sidebar-open', 'false')
    await page.keyboard.press('Enter')
    await expect(sidebar).toHaveAttribute('data-sidebar-open', 'true')

    // Inspect panel: Inspect is the default active tab (tabindex=0).
    // Tab from body reaches the Inspect tab; one more Tab lands on search-input.
    await page.focus('body')
    await tabUntil(page, '[data-tab="inspect"]')
    await tabUntil(page, '#search-input')
    await expect(page.locator('#search-input')).toBeFocused()

    // Map panel: Inspect is still active. ArrowRight from Inspect tab activates Map.
    // Tab past the tablist lands on the first Map-panel control.
    await page.focus('body')
    await tabUntil(page, '[data-tab="inspect"]')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-tab="map"]')).toBeFocused()
    await tabUntil(page, '.plasmid-map__toggle')
    await expect(page.locator('.plasmid-map__toggle').first()).toBeFocused()

    // Analyze panel: Map tab is now active (tabindex=0). Tab from body reaches Map tab,
    // then ArrowRight activates Analyze. First enabled Analyze control is the reference textarea.
    await page.focus('body')
    await tabUntil(page, '[data-tab="map"]')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-tab="analyze"]')).toBeFocused()
    await tabUntil(page, '#reference-sequence-input')
    await expect(page.locator('#reference-sequence-input')).toBeFocused()

    // Share panel: Analyze tab is now active (tabindex=0). Tab from body reaches Analyze tab,
    // then ArrowRight activates Share. Tab past the tablist lands on share-view-btn.
    await page.focus('body')
    await tabUntil(page, '[data-tab="analyze"]')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('[data-tab="share"]')).toBeFocused()
    await tabUntil(page, '[data-testid="share-view-btn"]')
    await expect(page.locator('[data-testid="share-view-btn"]')).toBeFocused()
  })
})
