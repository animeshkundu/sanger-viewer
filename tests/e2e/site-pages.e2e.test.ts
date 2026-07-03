import { expect, test } from '@playwright/test'

test('home shell links to devlog and blog content is indexable', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('link', { name: 'Devlog' })).toBeVisible()

  await page.getByRole('link', { name: 'Devlog' }).click()
  await expect(page).toHaveURL(/\/blog\/$/)
  await expect(page.getByRole('heading', { name: 'Devlog' })).toBeVisible()

  const entry = page.getByRole('link', { name: /v0 foundation shipped, next steps mapped/i })
  await expect(entry).toBeVisible()
  await entry.click()

  await expect(page).toHaveURL(/\/blog\/2026-07-03-v0-foundation\/$/)
  await expect(page.getByRole('heading', { name: /v0 foundation shipped/i })).toBeVisible()
  await expect(page.getByText(/tablet and touch support first/i)).toBeVisible()
})
