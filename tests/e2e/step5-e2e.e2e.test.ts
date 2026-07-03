/**
 * Step 5 — True E2E + Validation
 *
 * Explicitly exercises every acceptance criterion across BOTH the desktop Chrome
 * project and the emulated iPad tablet project defined in playwright.config.ts:
 *
 *   ✓ All 4 real fixtures loaded through the UI
 *   ✓ Canvas renders NON-BLANK (pixel-sampling) per fixture
 *   ✓ Zoom-in shrinks the visible span (both projects)
 *   ✓ Pan-left shifts the viewport start (both projects)
 *   ✓ Hover tooltip shows "peak:" data (desktop only — skipped on tablet)
 *   ✓ Tap selects a base and opens tooltip (tablet only — skipped on desktop)
 *   ✓ File-switch replaces canvas content (pixel-sum differs)
 *   ✓ PNG export: filename ends .png AND file opens as a valid PNG (magic bytes)
 *   ✓ FASTA export: filename ends .fasta AND content is valid FASTA (>header + ACGTN)
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect, type Page, type Locator } from '@playwright/test'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURES = [
  { rel: 'fixtures/ab1/310.ab1', label: '310.ab1' },
  { rel: 'fixtures/ab1/3100.ab1', label: '3100.ab1' },
  { rel: 'fixtures/scf/abcZ_F.scf', label: 'abcZ_F.scf' },
  { rel: 'fixtures/large/3730.ab1', label: '3730.ab1' },
]

function fixturePath(rel: string) {
  return path.resolve(process.cwd(), rel)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * A blank white canvas fills every pixel with (255, 255, 255) so raw RGB
 * sums are always large even when nothing is drawn.  Instead, sum the
 * *deviation from white* for every pixel: a pure-white canvas returns 0
 * while any coloured trace returns a large positive value.
 */
const INK_THRESHOLD = 1000

async function canvasInkSum(page: Page): Promise<number> {
  return page.locator('[data-testid="chromatogram-canvas"]').evaluate((el) => {
    const canvas = el as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let sum = 0
    for (let i = 0; i < data.length; i += 4) {
      sum += Math.abs(255 - data[i]) + Math.abs(255 - data[i + 1]) + Math.abs(255 - data[i + 2])
    }
    return sum
  })
}

/** Read the position-readout component and return start/end/span numbers. */
async function readViewport(page: Page): Promise<{ start: number; end: number; span: number }> {
  const text = await page.locator('.position-readout').textContent()
  const match = text?.match(/Position:\s*(\d+)\s*-\s*(\d+)/)
  if (!match) throw new Error(`Unexpected viewport readout: ${text}`)
  const start = Number(match[1])
  const end = Number(match[2])
  return { start, end, span: end - start }
}

/** Dispatch a synthetic pointer event on a locator (used for touch simulation). */
async function dispatchPointer(
  canvas: Locator,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  pointerId: number,
  clientX: number,
  clientY: number,
  isPrimary: boolean
) {
  await canvas.dispatchEvent(type, {
    pointerId,
    pointerType: 'touch',
    clientX: Math.round(clientX),
    clientY: Math.round(clientY),
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    isPrimary,
  })
}

// ---------------------------------------------------------------------------
// Per-fixture canvas validation
// ---------------------------------------------------------------------------

test.describe('per-fixture: load through UI and assert canvas is non-blank', () => {
  for (const fixture of FIXTURES) {
    test(`non-blank canvas after loading ${fixture.label}`, async ({ page }) => {
      await page.goto('')
      await page.setInputFiles('#file-input', fixturePath(fixture.rel))
      await expect(page.locator('#status')).toContainText('Loaded')

      // The trace is drawn via requestAnimationFrame, so poll until ink appears
      // (a blank/broken render returns 0 because we measure deviation from white).
      await expect
        .poll(() => canvasInkSum(page), { timeout: 5000 })
        .toBeGreaterThan(INK_THRESHOLD)
    })
  }
})

// ---------------------------------------------------------------------------
// Zoom + pan (both desktop and tablet)
// ---------------------------------------------------------------------------

test('zoom-in shrinks visible span and pan-left shifts start — all fixtures', async ({ page }) => {
  await page.goto('')

  for (const fixture of FIXTURES) {
    await page.setInputFiles('#file-input', fixturePath(fixture.rel))
    await expect(page.locator('#status')).toContainText('Loaded')

    const before = await readViewport(page)

    // Zoom in — the visible span should narrow
    await page.getByRole('button', { name: 'Zoom +' }).click()
    await expect
      .poll(() => readViewport(page).then((v) => v.span), { timeout: 5000 })
      .toBeLessThan(before.span)

    const afterZoom = await readViewport(page)

    // Pan left — the start position should change
    await page.getByRole('button', { name: '← Pan' }).click()
    await expect
      .poll(() => readViewport(page).then((v) => v.start), { timeout: 5000 })
      .not.toBe(afterZoom.start)
  }
})

// ---------------------------------------------------------------------------
// Hover tooltip — desktop only
// ---------------------------------------------------------------------------

test('hover over canvas shows tooltip with peak data (desktop only)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover tooltip is a pointer/cursor interaction — skipped on tablet')

  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath('fixtures/ab1/3100.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas bounding box unavailable')

  // Sweep across the canvas centre until the tooltip appears
  let tooltipVisible = false
  for (let step = 1; step <= 10; step++) {
    await page.mouse.move(box.x + (box.width * step) / 11, box.y + box.height / 2)
    if (await page.locator('.tooltip').isVisible()) {
      tooltipVisible = true
      break
    }
  }

  expect(tooltipVisible).toBeTruthy()
  await expect(page.locator('.tooltip')).toContainText('peak:')
})

// ---------------------------------------------------------------------------
// Tap to inspect base — tablet only
// ---------------------------------------------------------------------------

test('tap on canvas selects a base (tablet only)', async ({ page, isMobile, browserName }) => {
  test.skip(!isMobile || browserName !== 'chromium', 'tap-to-select is only asserted on the tablet project')

  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath('fixtures/ab1/3100.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const canvas = page.locator('[data-testid="chromatogram-canvas"]')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas bounding box unavailable')

  // Single tap near the centre of the trace
  const tapX = box.x + box.width / 2 + 48
  const tapY = box.y + box.height / 2

  await dispatchPointer(canvas, 'pointerdown', 1, tapX, tapY, true)
  await dispatchPointer(canvas, 'pointerup', 1, tapX, tapY, true)

  // Tooltip must appear with peak info and a base must be marked selected
  await expect(page.locator('.tooltip')).toContainText('peak:')
  const selectedBase = page.locator('.sequence-panel .selected-base')
  await expect(selectedBase).toHaveCount(1)
  await expect(selectedBase).toHaveText(/^[ACGTN]$/)
})

// ---------------------------------------------------------------------------
// File-switch: canvas content changes when a different fixture is loaded
// ---------------------------------------------------------------------------

test('file-switch replaces canvas content', async ({ page }) => {
  await page.goto('')

  await page.setInputFiles('#file-input', fixturePath(FIXTURES[0].rel))
  await expect(page.locator('#status')).toContainText('Loaded')
  // Poll until the rAF-scheduled draw lands; a blank canvas yields 0 ink.
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(INK_THRESHOLD)
  const sum1 = await canvasInkSum(page)

  await page.setInputFiles('#file-input', fixturePath(FIXTURES[1].rel))
  await expect(page.locator('#status')).toContainText('Loaded')
  // Poll again so we capture the new trace, not the previous one.
  await expect.poll(() => canvasInkSum(page), { timeout: 5000 }).toBeGreaterThan(INK_THRESHOLD)
  const sum2 = await canvasInkSum(page)

  // The two traces have different sample counts so their rendered pixel sums differ
  expect(sum1).not.toBe(sum2)
})

// ---------------------------------------------------------------------------
// PNG export — filename + magic bytes validation
// ---------------------------------------------------------------------------

test('PNG export produces a valid PNG file', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath('fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export PNG' }).click(),
  ])

  expect(download.suggestedFilename()).toMatch(/\.png$/i)

  const tmpPath = await download.path()
  expect(tmpPath).toBeTruthy()
  const bytes = await fs.readFile(tmpPath!)

  // Full PNG signature: 89 50 4E 47 0D 0A 1A 0A
  expect(bytes[0]).toBe(0x89)
  expect(bytes[1]).toBe(0x50) // 'P'
  expect(bytes[2]).toBe(0x4e) // 'N'
  expect(bytes[3]).toBe(0x47) // 'G'
  expect(bytes[4]).toBe(0x0d)
  expect(bytes[5]).toBe(0x0a)
  expect(bytes[6]).toBe(0x1a)
  expect(bytes[7]).toBe(0x0a)

  // IHDR chunk starts at byte 8. Width is at bytes 16-19, height at 20-23 (big-endian).
  // Both must be non-zero — this catches a blank/placeholder export.
  const pngWidth = bytes.readUInt32BE(16)
  const pngHeight = bytes.readUInt32BE(20)
  expect(pngWidth).toBeGreaterThan(0)
  expect(pngHeight).toBeGreaterThan(0)

  // Must be at least a minimal valid PNG (signature + IHDR + IDAT + IEND ≥ 67 bytes)
  expect(bytes.length).toBeGreaterThan(67)
})

// ---------------------------------------------------------------------------
// FASTA export — filename + content structure validation
// ---------------------------------------------------------------------------

test('FASTA export produces valid FASTA content', async ({ page }) => {
  await page.goto('')
  await page.setInputFiles('#file-input', fixturePath('fixtures/ab1/310.ab1'))
  await expect(page.locator('#status')).toContainText('Loaded')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export FASTA' }).click(),
  ])

  expect(download.suggestedFilename()).toMatch(/\.fasta$/i)

  const tmpPath = await download.path()
  expect(tmpPath).toBeTruthy()
  const content = await fs.readFile(tmpPath!, 'utf-8')

  // Must start with a FASTA header line (>identifier)
  expect(content.trimStart()).toMatch(/^>/)

  const lines = content.trim().split('\n')
  // First line is the header
  expect(lines[0]).toMatch(/^>[^\s]/)
  // Remaining lines (if any) must contain only valid IUPAC/base characters.
  // In Trimmed mode an all-trimmed read is valid and exports an empty body.
  const seqLines = lines.slice(1)
  for (const line of seqLines) {
    expect(line).toMatch(/^[ACGTNacgtn]+$/)
  }
})
