import path from 'node:path'
import { test, expect } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

type Rgb = [number, number, number]

function parseCssColor(color: string): Rgb {
  const trimmed = color.trim().toLowerCase()
  if (trimmed.startsWith('#') && trimmed.length === 7) {
    return [
      Number.parseInt(trimmed.slice(1, 3), 16),
      Number.parseInt(trimmed.slice(3, 5), 16),
      Number.parseInt(trimmed.slice(5, 7), 16),
    ]
  }
  const rgbMatch = trimmed.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (rgbMatch) return [Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3])]
  throw new Error(`Unsupported color format: ${color}`)
}

function luminance([r, g, b]: Rgb): number {
  const linear = [r, g, b].map((channel) => {
    const srgb = channel / 255
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminance(parseCssColor(a))
  const l2 = luminance(parseCssColor(b))
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (lighter + 0.05) / (darker + 0.05)
}

test('plasmid map hides cleanly when no trace is loaded', async ({ page }) => {
  await page.goto('')
  await expect(page.locator('[data-testid="plasmid-map"]')).toBeVisible()

  await page.locator('.workspace-bar__tab .workspace-bar__tab-close').click()
  await expect(page.locator('#status')).toHaveText('No trace loaded.')
  await expect(page.locator('[data-testid="plasmid-map"]')).toBeHidden()
})

test('plasmid map exposes exact deterministic attributes and topology toggle', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded 3100.ab1')

  const map = page.locator('[data-testid="plasmid-map"]')
  await expect(map).toBeVisible()
  await expect(map).toHaveAttribute('data-topology', 'circular')
  await expect(map).toHaveAttribute('data-render-mode', 'circular')
  await expect(map).toHaveAttribute('data-sequence-length', '795')
  await expect(map).toHaveAttribute('data-active-range', /\d+:\d+/)

  const hindIII = map.locator('.plasmid-map__marker[data-feature-type="restriction"][data-enzyme="HindIII"][data-position="252"]').first()
  await expect(hindIII).toBeVisible()
  await expect(hindIII).toHaveAttribute('data-start', '251')

  await map.getByRole('button', { name: 'Linear' }).click()
  await expect(map).toHaveAttribute('data-topology', 'linear')
  await expect(map).toHaveAttribute('data-render-mode', 'linear')
  await expect(hindIII).toBeVisible()
})

test('click and keyboard activation jump to the exact base range start', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded 3100.ab1')

  const map = page.locator('[data-testid="plasmid-map"]')
  const marker = map.locator('.plasmid-map__marker[data-feature-type="restriction"][data-enzyme="HindIII"][data-position="252"]').first()
  await expect(marker).toBeVisible()

  await marker.click()
  await expect(page.locator('#base-inspector')).toHaveAttribute('data-base-index', '251')
  await expect(page.locator('#base-inspector [data-field="position"]')).toHaveText('252')
  await expect(page.locator('.sequence-panel span[data-base-index="251"]')).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('Escape')
  await marker.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#base-inspector')).toHaveAttribute('data-base-index', '251')
})

test('plasmid map meets contrast thresholds in light and dark themes', async ({ page }) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('')
    await page.setInputFiles('#file-input', FIXTURE)
    await expect(page.locator('#status')).toContainText('Loaded 3100.ab1')

    const colors = await page.evaluate(() => {
      const map = document.querySelector<HTMLElement>('[data-testid="plasmid-map"]')
      const title = map?.querySelector<HTMLElement>('.plasmid-map__title')
      const marker = map?.querySelector<HTMLElement>('.plasmid-map__marker')
      if (!map || !title || !marker) throw new Error('plasmid map elements missing')
      const mapStyle = getComputedStyle(map)
      const titleStyle = getComputedStyle(title)
      const markerStyle = getComputedStyle(marker)
      return {
        mapBg: mapStyle.backgroundColor,
        titleFg: titleStyle.color,
        markerBg: markerStyle.backgroundColor,
        markerFg: markerStyle.color,
        markerBorder: markerStyle.borderTopColor,
      }
    })

    expect(contrastRatio(colors.titleFg, colors.mapBg)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.markerFg, colors.markerBg)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(colors.markerBorder, colors.markerBg)).toBeGreaterThanOrEqual(3)
  }
})
