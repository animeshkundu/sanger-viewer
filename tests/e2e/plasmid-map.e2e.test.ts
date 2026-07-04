import path from 'node:path'
import { expect, test } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

test.describe('plasmid/linear map overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE)
    await expect(page.locator('#status')).toContainText('Loaded')
    await expect(page.locator('[data-testid="plasmid-map"]')).toBeVisible()
  })

  test('shows exact restriction-site metadata and click-to-jump activates exact base range', async ({ page }) => {
    const map = page.locator('[data-testid="plasmid-map"]')
    await expect(map).toHaveAttribute('data-topology', 'circular')
    await expect(map).toHaveAttribute('data-render-mode', 'circular')

    const marker = map.locator(
      '.plasmid-map__marker[data-feature-type="restriction"][data-enzyme="HindIII"][data-start="251"][data-end="257"]',
    ).first()
    await expect(marker).toBeVisible()
    await expect(map.locator('.plasmid-map__marker[data-feature-type="orf"][data-frame="2"]').first()).toBeVisible()

    const sequenceLength = Number(await map.getAttribute('data-sequence-length'))
    const expectedMidAngle = (((251 + 257) / 2) / sequenceLength) * 360 - 90
    await expect(marker).toHaveAttribute('data-position', expectedMidAngle.toFixed(3))

    await marker.click()
    await expect(map).toHaveAttribute('data-active-range', '251:257')
    await expect(page.locator('#base-inspector')).toHaveAttribute('data-base-index', '251')
  })

  test('switches to linear rendering with exact marker coordinates and keyboard activation', async ({ page }) => {
    const map = page.locator('[data-testid="plasmid-map"]')
    await page.getByRole('button', { name: 'Linear' }).click()
    await expect(map).toHaveAttribute('data-topology', 'linear')
    await expect(map).toHaveAttribute('data-render-mode', 'linear')

    const marker = map.locator(
      '.plasmid-map__marker[data-feature-type="restriction"][data-enzyme="HindIII"][data-start="251"][data-end="257"]',
    ).first()
    await expect(marker).toBeVisible()

    const sequenceLength = Number(await map.getAttribute('data-sequence-length'))
    const expectedMidRatio = ((251 + 257) / 2) / sequenceLength
    await expect(marker).toHaveAttribute('data-position', expectedMidRatio.toFixed(6))

    await marker.focus()
    await page.keyboard.press('Enter')
    await expect(map).toHaveAttribute('data-active-range', '251:257')
    await expect(page.locator('#base-inspector')).toHaveAttribute('data-base-index', '251')
  })
})
