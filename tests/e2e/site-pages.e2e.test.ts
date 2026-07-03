import { expect, test } from '@playwright/test'

test('home shell links to devlog and blog content is indexable', async ({ page }) => {
  await page.goto('')
  await expect(page.getByRole('link', { name: 'Devlog' })).toBeVisible()

  await page.getByRole('link', { name: 'Devlog' }).click()
  await expect(page).toHaveURL(/\/blog\/$/)
  await expect(page.getByRole('heading', { name: 'Devlog' })).toBeVisible()
  await expect(
    page.getByRole('link', { name: /tablet\/touch pass makes the viewer feel handheld-ready/i })
  ).toBeVisible()

  const entry = page.getByRole('link', { name: /tablet\/touch pass makes the viewer feel handheld-ready/i })
  await expect(entry).toBeVisible()
  await entry.click()

  await expect(page).toHaveURL(/\/blog\/2026-07-03-v1-tablet-touch-pass\/$/)
  await expect(page.getByRole('heading', { name: /belongs on a tablet/i })).toBeVisible()
  await expect(page.getByText(/selected base/i)).toBeVisible()
})
