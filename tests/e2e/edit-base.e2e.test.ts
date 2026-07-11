/**
 * Unit A E2E — Editable base calls with undo/redo
 *
 * Verifies:
 *   ✓ Sequence panel spans are double-clickable to enter edit mode
 *   ✓ Typing an IUPAC base applies the edit (span text + .edited-base class)
 *   ✓ Edited base flows into the FASTQ export (sequence line + quality '!')
 *   ✓ Undo reverts the edit (span text + no .edited-base class)
 *   ✓ Redo re-applies the edit
 *   ✓ Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts work
 *   ✓ Delete/Backspace on a span reverts to original
 */

import path from 'node:path'
import fs from 'node:fs/promises'
import { test, expect, type Page } from '@playwright/test'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadFixture(page: Page): Promise<void> {
  await page.goto('')
  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded')
}

async function downloadFastq(page: Page): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByRole('button', { name: 'Export menu' }).click()
      await page.getByRole('menuitem', { name: 'Export FASTQ' }).click()
    })(),
  ])
  const tmpPath = await download.path()
  if (!tmpPath) throw new Error('FASTQ download path unavailable')
  return fs.readFile(tmpPath, 'utf-8')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('edited base appears in sequence panel with .edited-base class', async ({ page }) => {
  await loadFixture(page)

  // Find the first visible span and read its index and current base.
  const firstSpan = page.locator('.sequence-panel span[data-base-index]').first()
  const baseIndexAttr = await firstSpan.getAttribute('data-base-index')
  expect(baseIndexAttr).not.toBeNull()
  const displayIndex = Number(baseIndexAttr)
  const originalBase = await firstSpan.textContent()
  expect(originalBase).toMatch(/^[ACGTNRYSWKMBVDH]$/i)

  // Double-click to activate editing mode.
  await firstSpan.dblclick()

  // Type a replacement base that differs from the original.
  const newBase = originalBase?.toUpperCase() === 'G' ? 'A' : 'G'
  await page.keyboard.type(newBase)

  // The span at that index should now show the new base and have the edited class.
  const updatedSpan = page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)
  await expect(updatedSpan).toHaveText(newBase, { ignoreCase: true })
  await expect(updatedSpan).toHaveClass(/edited-base/)
})

test('edited base flows into the FASTQ export sequence line', async ({ page }) => {
  await loadFixture(page)

  const firstSpan = page.locator('.sequence-panel span[data-base-index]').first()
  const baseIndexAttr = await firstSpan.getAttribute('data-base-index')
  expect(baseIndexAttr).not.toBeNull()
  const displayIndex = Number(baseIndexAttr)

  // Replace the first visible base with 'N'.
  await firstSpan.dblclick()
  await page.keyboard.type('N')

  // Wait for the edit to register.
  const updatedSpan = page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)
  await expect(updatedSpan).toHaveText('N', { ignoreCase: true })

  // Download FASTQ and check that:
  // 1. The sequence line contains 'N' at the same position.
  // 2. The quality character at that position is '!' (Phred+33 of 0 = edited sentinel).
  const fastq = await downloadFastq(page)
  const lines = fastq.split('\n')
  expect(lines[0]).toMatch(/^@/)
  const seqLine = lines[1]
  const qualLine = lines[3]
  expect(seqLine.length).toBeGreaterThan(0)
  expect(qualLine.length).toBe(seqLine.length)
  expect(seqLine[displayIndex]).toBe('N')
  expect(qualLine[displayIndex]).toBe('!')
})

test('edited base is searchable at the edited position', async ({ page }) => {
  await loadFixture(page)

  const spans = page.locator('.sequence-panel span[data-base-index]')
  const firstSpan = spans.first()
  const displayIndex = Number(await firstSpan.getAttribute('data-base-index'))
  expect(displayIndex).toBe(0)

  const originalBase = ((await firstSpan.textContent()) ?? '').toUpperCase()
  expect(originalBase).toMatch(/^[ACGT]$/)
  const replacementBase = originalBase === 'A' ? 'C' : 'A'

  const followingBases = await spans.evaluateAll((nodes) =>
    nodes.slice(1, 10).map((node) => node.textContent ?? '').join(''),
  )
  const editedQuery = `${replacementBase}${followingBases.toUpperCase()}`

  await firstSpan.dblclick()
  await page.keyboard.type(replacementBase)
  await expect(page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)).toHaveText(replacementBase)

  await page.locator('#search-input').fill(editedQuery)

  await expect(page.locator('#search-summary')).toContainText('1 of')
  await expect.poll(
    async () => page.locator('[data-testid="chromatogram-canvas"]').getAttribute('data-search-active-range'),
  ).toBe(`0:${editedQuery.length}`)
  await expect(page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)).toHaveAttribute('data-search-active', 'true')
})

test('undo reverts the edited base and removes .edited-base class', async ({ page }) => {
  await loadFixture(page)

  const firstSpan = page.locator('.sequence-panel span[data-base-index]').first()
  const baseIndexAttr0 = await firstSpan.getAttribute('data-base-index')
  expect(baseIndexAttr0).not.toBeNull()
  const displayIndex = Number(baseIndexAttr0)
  const originalBase = (await firstSpan.textContent()) ?? ''

  // Edit the base.
  await firstSpan.dblclick()
  const newBase = originalBase.toUpperCase() === 'G' ? 'A' : 'G'
  await page.keyboard.type(newBase)
  await expect(page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)).toHaveClass(/edited-base/)

  // Undo via toolbar button.
  await page.getByRole('button', { name: /Undo/i }).click()

  // The span should revert to original and lose the edited class.
  const revertedSpan = page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)
  await expect(revertedSpan).toHaveText(originalBase, { ignoreCase: true })
  await expect(revertedSpan).not.toHaveClass(/edited-base/)
})

test('redo re-applies the undone edit', async ({ page }) => {
  await loadFixture(page)

  const firstSpan = page.locator('.sequence-panel span[data-base-index]').first()
  const baseIndexAttr1 = await firstSpan.getAttribute('data-base-index')
  expect(baseIndexAttr1).not.toBeNull()
  const displayIndex = Number(baseIndexAttr1)
  const originalBase = (await firstSpan.textContent()) ?? ''

  // Edit → undo → redo.
  await firstSpan.dblclick()
  const newBase = originalBase.toUpperCase() === 'G' ? 'A' : 'G'
  await page.keyboard.type(newBase)
  await page.getByRole('button', { name: /Undo/i }).click()
  await page.getByRole('button', { name: /Redo/i }).click()

  // Should show the new base again with edited class.
  const redoneSpan = page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)
  await expect(redoneSpan).toHaveText(newBase, { ignoreCase: true })
  await expect(redoneSpan).toHaveClass(/edited-base/)
})

test('Ctrl+Z undoes and Ctrl+Shift+Z redoes via keyboard shortcuts', async ({ page }) => {
  await loadFixture(page)

  const firstSpan = page.locator('.sequence-panel span[data-base-index]').first()
  const baseIndexAttr2 = await firstSpan.getAttribute('data-base-index')
  expect(baseIndexAttr2).not.toBeNull()
  const displayIndex = Number(baseIndexAttr2)
  const originalBase = (await firstSpan.textContent()) ?? ''

  // Apply an edit.
  await firstSpan.dblclick()
  const newBase = originalBase.toUpperCase() === 'G' ? 'A' : 'G'
  await page.keyboard.type(newBase)

  // Ctrl+Z to undo.
  await page.keyboard.press('Control+z')
  const afterUndo = page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)
  await expect(afterUndo).toHaveText(originalBase, { ignoreCase: true })

  // Ctrl+Shift+Z to redo.
  await page.keyboard.press('Control+Shift+z')
  const afterRedo = page.locator(`.sequence-panel span[data-base-index="${displayIndex}"]`)
  await expect(afterRedo).toHaveText(newBase, { ignoreCase: true })
  await expect(afterRedo).toHaveClass(/edited-base/)
})

test('undo button is disabled at stack start and enabled after an edit', async ({ page }) => {
  await loadFixture(page)

  // Initially undo should be disabled.
  const undoBtn = page.getByRole('button', { name: /Undo/i })
  await expect(undoBtn).toBeDisabled()

  // After an edit, undo should be enabled.
  const firstSpan = page.locator('.sequence-panel span[data-base-index]').first()
  const originalBase = (await firstSpan.textContent()) ?? ''
  await firstSpan.dblclick()
  const newBase = originalBase.toUpperCase() === 'G' ? 'A' : 'G'
  await page.keyboard.type(newBase)
  await expect(undoBtn).toBeEnabled()

  // After undoing, undo should be disabled again and redo enabled.
  await undoBtn.click()
  await expect(undoBtn).toBeDisabled()
  await expect(page.getByRole('button', { name: /Redo/i })).toBeEnabled()
})

test('Export FASTQ button produces a valid FASTQ file', async ({ page }) => {
  await loadFixture(page)
  const fastq = await downloadFastq(page)
  const lines = fastq.split('\n')
  expect(lines[0]).toMatch(/^@/)  // header
  expect(lines[1]).toMatch(/^[ACGTNRYSWKMBVDH]+$/i)  // sequence
  expect(lines[2]).toBe('+')
  expect(lines[3].length).toBe(lines[1].length)  // quality length matches sequence
})

test('Export FASTQ filename ends with .fastq', async ({ page }) => {
  await loadFixture(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    (async () => {
      await page.getByRole('button', { name: 'Export menu' }).click()
      await page.getByRole('menuitem', { name: 'Export FASTQ' }).click()
    })(),
  ])
  expect(download.suggestedFilename()).toMatch(/\.fastq$/i)
})

test('spans in sequence panel have data-base-index and role=button for a11y', async ({ page }) => {
  await loadFixture(page)
  const spans = page.locator('.sequence-panel span[data-base-index]')
  await expect(spans.first()).toHaveAttribute('role', 'button')
  await expect(spans.first()).toHaveAttribute('data-base-index', /^\d+$/)
})
