import { expect, test } from '@playwright/test'

test('home page exposes canonical and social metadata with SoftwareApplication data', async ({ page }) => {
  await page.goto('')

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://animesh.kundus.in/sanger-viewer/'
  )
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Sanger Viewer — Private In-Browser Chromatogram Viewer'
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://animesh.kundus.in/sanger-viewer/og-image.png'
  )

  const jsonLdText = await page.locator('script[type="application/ld+json"]').textContent()
  expect(jsonLdText).not.toBeNull()
  const jsonLd = JSON.parse(jsonLdText ?? '') as Record<string, unknown>
  expect(jsonLd['@context']).toBe('https://schema.org')
  expect(jsonLd['@type']).toBe('SoftwareApplication')
})

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
