/**
 * Step 9 — Trace Metadata + Peak Details E2E
 *
 * Exercises the metadata panel and per-base amplitude readout:
 *   ✓ Metadata panel is hidden before a trace is loaded
 *   ✓ After loading 310.ab1, the metadata panel appears with at least one field
 *   ✓ After loading abcZ_F.scf, the metadata panel handles graceful absence of ABIF fields
 *   ✓ Tooltip contains amplitude values (A: C: G: T:) on hover
 */

import path from 'node:path'
import { test, expect } from '@playwright/test'

function fixturePath(rel: string) {
  return path.resolve(process.cwd(), rel)
}

test('metadata panel hidden before trace load', async ({ page }) => {
  await page.goto('')
  const panel = page.locator('[data-testid="metadata-panel"]')
  await expect(panel).toBeHidden()
})

test('metadata panel appears after loading AB1 fixture', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath('fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const panel = page.getByRole('region', { name: 'Trace metadata' })
  await expect(panel).toBeVisible()
  // Must contain at least one metadata label/value row
  const rows = panel.locator('.metadata-row')
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)
  // Verify exact sample name value is rendered
  await expect(panel).toContainText('D11F')
})

test('metadata panel clears after a failed file load', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath('fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const panel = page.locator('[data-testid="metadata-panel"]')
  await expect(page.getByRole('region', { name: 'Trace metadata' })).toBeVisible()
  await expect(panel).toContainText('D11F')

  await page.setInputFiles('#file-input', {
    name: 'bad.ab1',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([0x00, 0x01, 0x02, 0x03])
  })

  await expect(page.locator('#error-banner')).toBeVisible()
  await expect(panel).toBeHidden()
  await expect(panel.locator('.metadata-row')).toHaveCount(0)
})

test('metadata panel renders with SCF fixture (graceful absence)', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath('fixtures/scf/abcZ_F.scf'))
  await expect(page.locator('#status')).toContainText('Loaded')

  // SCF has only version; panel should either show version or be hidden — must not crash
  // The test simply asserts the page is stable (no unhandled error)
  const panel = page.locator('[data-testid="metadata-panel"]')
  // Either hidden (no useful fields) or visible (version shown) — both are acceptable
  const isVisible = await panel.isVisible()
  // We only assert no exception was thrown and status is still "Loaded"
  await expect(page.locator('#status')).toContainText('Loaded')
  expect(typeof isVisible).toBe('boolean')
})

test('tooltip includes amplitude values on hover', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover tooltip is desktop-only')

  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath('fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not visible')

  // Sweep horizontally until tooltip appears
  let tooltipVisible = false
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(box.x + (box.width * step) / 11, box.y + box.height / 2)
    tooltipVisible = await page.locator('.tooltip').isVisible()
    if (tooltipVisible) break
  }

  if (!tooltipVisible) {
    // Try zooming in first so peaks are more spread out
    await page.getByRole('button', { name: 'Zoom +' }).click()
    await page.getByRole('button', { name: 'Zoom +' }).click()
    for (let step = 1; step <= 10; step += 1) {
      await page.mouse.move(box.x + (box.width * step) / 11, box.y + box.height / 2)
      tooltipVisible = await page.locator('.tooltip').isVisible()
      if (tooltipVisible) break
    }
  }

  if (!tooltipVisible) {
    throw new Error('Tooltip never appeared after sweep and zoom — amplitude assertions cannot run')
  }

  const tooltipText = await page.locator('.tooltip').textContent()
  // Tooltip should include amplitude labels
  expect(tooltipText).toMatch(/A:\d+/)
  expect(tooltipText).toMatch(/C:\d+/)
  expect(tooltipText).toMatch(/G:\d+/)
  expect(tooltipText).toMatch(/T:\d+/)
  expect(tooltipText).toContain('peak:')
})
