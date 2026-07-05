import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export type SidebarTab = 'inspect' | 'map' | 'analyze' | 'share'

/**
 * Ensures the sidebar is open and switches to the requested tab,
 * waiting until its panel is visible before returning.
 *
 * Call this in beforeEach (or at the top of each test) whenever a test
 * needs to interact with controls that live inside a non-default sidebar panel.
 */
export async function openSidebarTab(page: Page, tab: SidebarTab): Promise<void> {
  const sidebar = page.locator('.shell-sidebar')
  const isOpen = await sidebar.getAttribute('data-sidebar-open')
  if (isOpen !== 'true') {
    await page.locator('.sidebar-toggle-btn').click()
    await expect(sidebar).toHaveAttribute('data-sidebar-open', 'true')
  }
  await page.locator(`[data-tab="${tab}"]`).click()
  await expect(page.locator(`#sidebar-panel-${tab}`)).toBeVisible()
}
