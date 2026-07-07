import fs from 'node:fs/promises'
import path from 'node:path'
import { test, expect, type Page } from '@playwright/test'
import { parseTrace } from '../../src/parsers'
import { openSidebarTab } from './helpers/sidebar'

const FIXTURE = path.resolve(process.cwd(), 'fixtures/ab1/310.ab1')
const TEXT_DECODER = new TextDecoder('utf-8', { fatal: false })

function bufferWindows(buffer: Buffer): Buffer[] {
  const starts = [0, 128, 1024, Math.max(0, buffer.length - 1024)]
  return starts
    .map((start) => buffer.subarray(start, Math.min(buffer.length, start + 64)))
    .filter((window) => window.length >= 32 && window.some((byte) => byte !== 0))
}

function sequenceWindows(sequence: string): string[] {
  const upper = sequence.toUpperCase()
  const starts = [0, 40, 120, Math.max(0, upper.length - 80)]
  return starts
    .map((start) => upper.slice(start, start + 28))
    .filter((window) => window.length >= 20)
}

function encodedForms(value: string): string[] {
  return [value, encodeURIComponent(value), Buffer.from(value, 'utf-8').toString('base64')]
}

async function assertCanvasNonBlank(page: Page) {
  const painted = await page.locator('[data-testid="chromatogram-canvas"]').evaluate((el) => {
    const canvas = el as HTMLCanvasElement
    const ctx = canvas.getContext('2d')
    if (!ctx || canvas.width === 0 || canvas.height === 0) return false
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0 || data[i + 3] !== 0) {
        return true
      }
    }
    return false
  })
  expect(painted).toBeTruthy()
}

async function warmPwaCache(page: Page) {
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    const urls = new Set<string>([window.location.href])
    performance.getEntriesByType('resource').forEach((entry) => {
      const url = new URL(entry.name)
      if (url.origin === window.location.origin) urls.add(url.href)
    })
    ;(navigator.serviceWorker.controller ?? registration.active)?.postMessage({
      type: 'SV_WARM_CACHE',
      urls: [...urls],
    })
  })
  await page.waitForTimeout(500)
}

test('trace and sequence bytes never leave the browser during parse → align → export', async ({ page }) => {
  const fixture = await fs.readFile(FIXTURE)
  const trace = parseTrace(fixture.buffer.slice(fixture.byteOffset, fixture.byteOffset + fixture.byteLength), '310.ab1')
  const referenceSequence = `${trace.sequence.slice(0, 180)}ACGTACGTACGT`

  const rawByteWindows = bufferWindows(fixture)
  const base64Windows = bufferWindows(fixture).map((window) => window.toString('base64').slice(0, 48))
  const textSignatures = [
    ...sequenceWindows(trace.sequence),
    ...sequenceWindows(referenceSequence),
  ].flatMap(encodedForms)
  const violations: string[] = []

  page.on('request', (request) => {
    const url = request.url()
    for (const signature of textSignatures) {
      if (signature.length >= 20 && url.includes(signature)) {
        violations.push(`${request.method()} ${url} contains sequence text in the URL`)
      }
    }

    const body = request.postDataBuffer()
    if (!body?.length) return

    for (const window of rawByteWindows) {
      if (body.includes(window)) {
        violations.push(`${request.method()} ${url} contains raw trace bytes`)
      }
    }

    const bodyText = TEXT_DECODER.decode(body).toUpperCase()
    for (const signature of [...base64Windows, ...textSignatures]) {
      if (signature.length >= 20 && bodyText.includes(signature.toUpperCase())) {
        violations.push(`${request.method()} ${url} contains trace or sequence text`)
      }
    }
  })

  await page.goto('')
  await expect(page.locator('[data-testid="privacy-offline-badge"]')).toContainText('Runs entirely in your browser')

  await page.setInputFiles('#file-input', FIXTURE)
  await expect(page.locator('#status')).toContainText('Loaded 310.ab1')
  await assertCanvasNonBlank(page)

  await openSidebarTab(page, 'analyze')
  await page.locator('#reference-sequence-input').fill(`>private_reference\n${referenceSequence}`)
  await page.locator('[data-testid="align-btn"]').click()
  await expect(page.locator('[data-testid="reference-status"]')).toContainText(/Aligned|variant/)

  await page.getByRole('button', { name: 'Export menu' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Export FASTA' }).click()
  await download

  expect(violations).toEqual([])
})

test('PWA cache reloads the app shell and sample chromatogram while offline', async ({ page, context }) => {
  await page.goto('')
  await expect(page.locator('[data-testid="privacy-offline-badge"]')).toContainText('nothing is uploaded')
  await expect(page.locator('#status')).toContainText('Loaded sample.ab1')
  await assertCanvasNonBlank(page)

  await warmPwaCache(page)
  await context.setOffline(true)
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-testid="privacy-offline-badge"]')).toContainText('Offline-ready after first load')
    await expect(page.locator('#status')).toContainText('Loaded sample.ab1')
    await assertCanvasNonBlank(page)
  } finally {
    await context.setOffline(false)
  }
})
