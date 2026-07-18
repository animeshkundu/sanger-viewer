import path from 'node:path'
import { expect, test } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

test('reverse-complement toggle explicitly identifies its action and displayed strand', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')

  const forwardToggle = page.getByRole('button', { name: 'Reverse complement (5′→3′)' })
  await expect(forwardToggle).toBeVisible()
  await expect(forwardToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(forwardToggle).toHaveAttribute(
    'title',
    'Showing forward strand — click to show reverse complement',
  )

  const forwardSequence = await page.locator('.sequence-panel').textContent()
  await forwardToggle.click()

  const reverseToggle = page.getByRole('button', { name: 'Reverse complement (3′→5′)' })
  await expect(reverseToggle).toBeVisible()
  await expect(reverseToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(reverseToggle).toHaveAttribute(
    'title',
    'Showing reverse complement — click to show forward strand',
  )
  await expect.poll(() => page.locator('.sequence-panel').textContent()).not.toBe(forwardSequence)
})
