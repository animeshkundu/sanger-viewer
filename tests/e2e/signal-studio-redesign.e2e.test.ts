import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { assertCanvasNonBlank } from './helpers/ux-gallery'

async function waitForSampleLoad(page: Page) {
  await page.goto('')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1', { timeout: 30_000 })
}

test.describe('Signal studio redesign', () => {
  test('presents a private trace-first workspace with truthful live metrics', async ({ page }) => {
    await waitForSampleLoad(page)

    await expect(page.getByRole('heading', { name: 'Read every peak. Trust every call.' })).toBeVisible()
    await expect(page.locator('.site-nav__privacy')).toContainText('Local & private')
    await expect(page.locator('.viewer')).toHaveAttribute('data-viewer-state', 'loaded')
    await expect(page.locator('.canvas-wrap')).toHaveAttribute('data-trace-ready', 'true')
    await expect(page.locator('#trace-stage-file')).toHaveText('sample.ab1')
    await expect(page.locator('#trace-stage-format')).toHaveText('AB1')
    await expect(page.locator('#trace-stage-bases')).toHaveText('868 bases')
    await expect(page.locator('#trace-stage-samples')).not.toHaveText('0 samples')
    await expect(page.locator('.trace-stage__legend span')).toHaveCount(4)
    await assertCanvasNonBlank(page)
  })

  test('turns the empty state into a clear three-step local workflow', async ({ page }) => {
    await waitForSampleLoad(page)
    await page.locator('.workspace-bar__tab-close').click()

    await expect(page.locator('.viewer')).toHaveAttribute('data-viewer-state', 'empty')
    await expect(page.locator('#empty-state')).toBeVisible()
    await expect(page.locator('.empty-state__signal')).toBeVisible()
    await expect(page.locator('.empty-state__steps li')).toHaveCount(3)
    await expect(page.locator('.empty-state__steps')).toContainText('Open')
    await expect(page.locator('.empty-state__steps')).toContainText('Inspect')
    await expect(page.locator('.empty-state__steps')).toContainText('Decide')
    await expect(page.locator('.empty-state__body')).toContainText('nothing is uploaded')
    await expect(page.locator('.canvas-wrap')).toBeHidden()
    await expect(page.locator('.quality-track')).toBeHidden()
    await expect(page.locator('.controls')).toBeHidden()
    await expect(page.locator('.sequence-panel')).toBeHidden()

    const primaryActionsAreAboveFold = await page.locator('#empty-state').evaluate(() => {
      const selectors = ['.empty-state__file-label', '#sample-load-btn']
      return selectors.every((selector) => {
        const action = document.querySelector<HTMLElement>(selector)
        if (!action) return false
        const rect = action.getBoundingClientRect()
        return rect.top >= 0 && rect.bottom <= window.innerHeight
      })
    })
    expect(primaryActionsAreAboveFold).toBeTruthy()
  })

  test('keeps the redesigned trace stage genuine with a large real AB1', async ({ page, isMobile }) => {
    test.skip(isMobile, 'large-file picker evidence is captured on the desktop project')
    await waitForSampleLoad(page)

    await page.setInputFiles(
      '#file-input',
      path.resolve(process.cwd(), 'fixtures/large/3730.ab1'),
    )

    await expect(page.locator('#status')).toContainText('Loaded 3730.ab1 (1165 bases)', { timeout: 30_000 })
    await expect(page.locator('#trace-stage-file')).toHaveText('3730.ab1')
    await expect(page.locator('#trace-stage-bases')).toHaveText('1165 bases')
    await assertCanvasNonBlank(page)
  })

  test('keeps multiple large traces contained on the narrow workspace', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'narrow-mobile', 'narrow viewport containment contract')
    await waitForSampleLoad(page)

    await page.setInputFiles('#file-input', path.resolve(process.cwd(), 'fixtures/large/3730.ab1'))
    await expect(page.locator('#status')).toContainText('Loaded 3730.ab1 (1165 bases)', {
      timeout: 30_000,
    })
    await page.setInputFiles(
      '#file-input',
      path.resolve(process.cwd(), 'fixtures/large/synth-longread-5kbp.ab1'),
    )
    await expect(page.locator('#status')).toContainText(
      'Loaded synth-longread-5kbp.ab1 (5000 bases)',
      { timeout: 30_000 },
    )
    await expect(page.locator('.workspace-bar__tab')).toHaveCount(2)

    const viewportWidth = await page.evaluate(() => window.innerWidth)
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(documentWidth).toBeLessThanOrEqual(viewportWidth)
    await assertCanvasNonBlank(page)
  })
})
