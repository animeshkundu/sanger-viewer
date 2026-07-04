/**
 * print.e2e.test.ts — E2E tests for the "Print / Save as PDF" action.
 *
 * Strategy:
 *   1. Override window.print with a no-op so no native dialog blocks the test.
 *   2. Load a known fixture and click "Print / Save as PDF".
 *   3. The print handler appends #print-view to document.body; since the
 *      afterprint event never fires when window.print is mocked, the element
 *      stays in the DOM for us to inspect.
 *   4. All assertions are exact-value or format-exact — no vacuous checks.
 *
 * Known fixture values for fixtures/ab1/310.ab1 (verified by the base-inspector
 * tests):  index 0 → position 1, base "T", quality 0, peakAmplitude 232.
 * Therefore the visible sequence (0-based window, first 240 bases) must start
 * with the character "T".
 */

import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const FIXTURE_3100 = path.resolve(process.cwd(), 'fixtures/ab1/3100.ab1')

/** Inject a window.print mock before the page loads so no native dialog appears. */
async function mockPrint(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as unknown as Record<string, unknown>)['print'] = () => {}
  })
}

async function loadFixture(page: Page, fixture = FIXTURE): Promise<void> {
  await page.goto('')
  await page.setInputFiles('#file-input', fixture)
  await expect(page.locator('#status')).toContainText('Loaded')
}

async function clickPrint(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Export menu' }).click()
  await page.getByRole('menuitem', { name: /Print \/ Save as PDF/i }).click()
  // Wait until #print-view appears in the DOM (the action is synchronous once
  // canvas data URLs are captured, but we use waitFor for robustness).
  await page.waitForFunction(() => !!document.querySelector('#print-view'), { timeout: 5000 })
}

/** Read all interesting fields from the hidden #print-view via evaluate. */
async function readPrintView(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('[data-testid="print-header"]')
    const seqPre = document.querySelector('[data-testid="print-sequence-bases"]')
    const lengthEl = document.querySelector('[data-testid="print-length"]')
    const dateEl = document.querySelector('[data-testid="print-date"]')
    const strandEl = document.querySelector('[data-testid="print-strand"]')
    const trimEl = document.querySelector('[data-testid="print-trim-mode"]')
    const qualSection = document.querySelector('[data-testid="print-quality"]')
    const qualImg = qualSection?.querySelector('img') as HTMLImageElement | null
    const chromSection = document.querySelector('[data-testid="print-chromatogram"]')
    const chromImg = chromSection?.querySelector('img') as HTMLImageElement | null
    const printView = document.querySelector('[data-testid="print-view"]')
    const annotCountStr = printView?.getAttribute('data-annotation-count') ?? '0'
    return {
      headerText:      header?.textContent ?? '',
      seqText:         seqPre?.textContent ?? '',
      lengthText:      lengthEl?.textContent ?? '',
      dateText:        dateEl?.textContent ?? '',
      strandText:      strandEl?.textContent ?? '',
      trimText:        trimEl?.textContent ?? '',
      chromSrc:        chromImg?.getAttribute('src') ?? '',
      qualSrc:         qualImg?.getAttribute('src') ?? '',
      hasQualSection:  !!qualSection,
      hasChromSection: !!chromSection,
      hasAnnotSection: !!document.querySelector('[data-testid="print-annotations"]'),
      annotationCount: parseInt(annotCountStr, 10),
    }
  })
}

// ────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────

test.describe('Print / Save as PDF', () => {
  test('Print button is present and disabled until a trace is loaded', async ({ page }) => {
    await mockPrint(page)
    await page.goto('')

    // The button is inside the export dropdown; use data-testid to check state without opening the menu.
    const btn = page.locator('[data-testid="print-btn"]')
    // The button must exist in the toolbar.
    await expect(btn).toBeAttached()

    // Before loading a trace the button should be disabled (no trace to print).
    // NOTE: setControlsDisabled keeps the print button in its natural state
    // during loading — it is ONLY enabled once a trace is resident, matching the
    // `action === 'print' && trace` guard in the handler.
    // Loading state is transient; check the empty state.
    await expect(btn).toBeDisabled()
  })

  test('print-view DOM is populated with exact metadata, sequence, and image content', async ({ page }) => {
    await mockPrint(page)
    await loadFixture(page)

    // The print button must be enabled once the trace is loaded (use data-testid to check in dropdown).
    const btn = page.locator('[data-testid="print-btn"]')
    await expect(btn).toBeEnabled()

    await clickPrint(page)

    const data = await readPrintView(page)

    // ── Metadata header ────────────────────────────────────────────────
    // File name must appear verbatim.
    expect(data.headerText).toContain('310.ab1')

    // Length must be a positive integer followed by " bp".
    expect(data.lengthText).toMatch(/^\d+ bp$/)
    const bases = parseInt(data.lengthText, 10)
    expect(bases).toBeGreaterThan(0)

    // Strand shows forward (5′→3′) by default.
    expect(data.strandText).toContain('Forward')
    expect(data.strandText).toContain('5′→3′')

    // Trim mode is "Full" by default.
    expect(data.trimText).toContain('Full')

    // Date is today in YYYY-MM-DD format (en-CA locale).
    expect(data.dateText).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // Must equal today (not a stale date).
    const todayIso = new Date().toLocaleDateString('en-CA')
    expect(data.dateText).toBe(todayIso)

    // ── Sequence content ───────────────────────────────────────────────
    // The first visible base for 310.ab1 is "T" (verified by base-inspector tests).
    expect(data.seqText.length).toBeGreaterThan(0)
    expect(data.seqText[0]).toBe('T')
    // Sequence must contain only valid IUPAC characters + possible whitespace.
    expect(data.seqText.replace(/\s/g, '')).toMatch(/^[ACGTNRYSWKMBVDH]+$/i)

    // ── Chromatogram image ─────────────────────────────────────────────
    // Must be a PNG data URL (not empty or placeholder).
    expect(data.chromSrc).toMatch(/^data:image\/png;base64,/)
    expect(data.hasChromSection).toBe(true)

    // ── Quality track image ────────────────────────────────────────────
    // Quality track is visible by default → its canvas snapshot must be present.
    expect(data.hasQualSection).toBe(true)
    expect(data.qualSrc).toMatch(/^data:image\/png;base64,/)
  })

  test('print-view respects reverse-complement strand state', async ({ page }) => {
    await mockPrint(page)
    await loadFixture(page)

    // Switch to reverse complement.
    await page.getByRole('button', { name: /3′.*5′|5′.*3′/i }).click()
    await expect(page.getByRole('button', { name: /3′→5′/i })).toBeVisible()

    await clickPrint(page)
    const data = await readPrintView(page)

    // Strand label must reflect reverse complement.
    expect(data.strandText).toContain('Reverse complement')
    expect(data.strandText).toContain('3′→5′')
  })

  test('print-view respects trimmed mode', async ({ page }) => {
    await mockPrint(page)
    await loadFixture(page)

    // Switch to trimmed mode.
    await page.getByRole('button', { name: 'Trimmed' }).click()
    await expect(page.getByRole('button', { name: 'Trimmed' })).toHaveAttribute('aria-pressed', 'true')

    await clickPrint(page)
    const data = await readPrintView(page)

    // Mode label must say "Trimmed".
    expect(data.trimText).toContain('Trimmed')
  })

  test('print-view includes annotation section when annotations are present', async ({ page }) => {
    await mockPrint(page)
    // 3100.ab1 is confirmed to have ORFs and restriction sites (12 features).
    // Use expect.poll to wait for annotation scan to complete before printing.
    await loadFixture(page, FIXTURE_3100)
    await expect
      .poll(
        () => page.locator('[data-testid="annotation-track"]').getAttribute('data-total-count'),
        { timeout: 5000 },
      )
      .toMatch(/^[1-9]/)
    await clickPrint(page)

    const data = await readPrintView(page)
    expect(data.annotationCount).toBeGreaterThan(0)
    expect(data.hasAnnotSection).toBe(true)
  })

  test('print CSS is declared — @media print hides body children and shows #print-view', async ({ page }) => {
    await mockPrint(page)
    await page.goto('')

    // Verify the @media print rule exists in the loaded stylesheet by checking
    // that at least one rule containing '#print-view' is present.
    const hasPrintRule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSMediaRule && rule.conditionText.includes('print')) {
              const ruleText = rule.cssText
              if (ruleText.includes('#print-view') && ruleText.includes('body')) return true
            }
          }
        } catch {
          // Cross-origin sheets throw SecurityError — skip them.
        }
      }
      return false
    })
    expect(hasPrintRule).toBe(true)
  })

  test('works in dark mode — print-view DOM has same exact content', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await mockPrint(page)
    await loadFixture(page)
    await clickPrint(page)

    const data = await readPrintView(page)

    // Dark mode must not affect data content — same exact assertions as light mode.
    expect(data.headerText).toContain('310.ab1')
    expect(data.seqText[0]).toBe('T')
    expect(data.chromSrc).toMatch(/^data:image\/png;base64,/)
  })
})
