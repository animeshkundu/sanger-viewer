import { test, expect } from '@playwright/test'

test('keyboard shortcuts dialog traps focus, closes on Escape, and restores focus', async ({ page }) => {
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1')

  const traceCanvas = page.locator('[data-testid="chromatogram-canvas"]')
  const returnTarget = page.getByRole('button', { name: 'Export menu' })
  await expect(traceCanvas).toBeVisible()
  await returnTarget.focus()

  await page.keyboard.type('?')

  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  const closeButton = dialog.getByRole('button', { name: 'Close keyboard shortcuts' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog.getByText('Undo')).toBeVisible()
  await expect(dialog.getByText('Next search match')).toBeVisible()
  await expect(closeButton).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(closeButton).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(closeButton).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(returnTarget).toBeFocused()
  await expect(traceCanvas).toBeVisible()
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1')
})

test('? does not open keyboard shortcuts while typing in a text field', async ({ page }) => {
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1')

  const search = page.locator('#search-input')
  await search.focus()
  await page.keyboard.type('?')

  await expect(search).toHaveValue('?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeHidden()
})
