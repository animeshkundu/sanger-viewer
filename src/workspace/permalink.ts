import type { EditEntry } from '../editing'

export type PermalinkSource =
  | { kind: 'sample'; value: string }
  | { kind: 'local'; value: string }

export interface PermalinkStateV1 {
  version: 1
  source: PermalinkSource
  view: { startSample: number; samplesPerPixel: number }
  strand: 'forward' | 'reverse'
  trim: { mode: 'full' | 'trimmed'; threshold: number }
  search: { query: string; activeIndex: number }
  selection: { baseIndex: number | null }
  edits: Array<{ forwardIndex: number; base: string; originalBase: string }>
  overlays: { quality: boolean; annotations: boolean; mixedBases: boolean }
}

const PREFIX = '#sv='
const VERSION = 1 as const

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(input: string): string | null {
  if (!/^[A-Za-z0-9_-]+$/.test(input)) return null
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  try {
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

function normalizeEdits(edits: unknown): EditEntry[] {
  if (!Array.isArray(edits)) return []
  return edits
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null
      const forwardIndex = (entry as { forwardIndex?: unknown }).forwardIndex
      const base = (entry as { base?: unknown }).base
      const originalBase = (entry as { originalBase?: unknown }).originalBase
      if (!Number.isInteger(forwardIndex) || typeof base !== 'string' || typeof originalBase !== 'string') return null
      return { forwardIndex, base, originalBase }
    })
    .filter((entry): entry is EditEntry => entry !== null)
}

function normalizeState(candidate: unknown): PermalinkStateV1 | null {
  if (typeof candidate !== 'object' || candidate === null) return null
  const value = candidate as Partial<PermalinkStateV1>
  if (value.version !== VERSION) return null
  if (value.source?.kind !== 'sample' && value.source?.kind !== 'local') return null
  if (typeof value.source.value !== 'string' || value.source.value.length === 0) return null
  if (!value.view || !Number.isFinite(value.view.startSample) || !Number.isFinite(value.view.samplesPerPixel)) return null
  if (value.strand !== 'forward' && value.strand !== 'reverse') return null
  if (!value.trim || (value.trim.mode !== 'full' && value.trim.mode !== 'trimmed') || !Number.isFinite(value.trim.threshold)) return null
  if (!value.search || typeof value.search.query !== 'string' || !Number.isInteger(value.search.activeIndex)) return null
  const baseIndex = value.selection?.baseIndex ?? null
  if (!(baseIndex === null || Number.isInteger(baseIndex))) return null
  const overlays = value.overlays
  if (!overlays || typeof overlays.quality !== 'boolean' || typeof overlays.annotations !== 'boolean' || typeof overlays.mixedBases !== 'boolean') return null
  return {
    version: VERSION,
    source: value.source,
    view: {
      startSample: Math.max(0, value.view.startSample),
      samplesPerPixel: Math.max(0.5, value.view.samplesPerPixel),
    },
    strand: value.strand,
    trim: {
      mode: value.trim.mode,
      threshold: Math.max(0, Math.min(40, value.trim.threshold)),
    },
    search: {
      query: value.search.query,
      activeIndex: Math.max(-1, value.search.activeIndex),
    },
    selection: { baseIndex },
    edits: normalizeEdits(value.edits),
    overlays,
  }
}

export function encodePermalinkState(state: Omit<PermalinkStateV1, 'version'>, options: { maxChars: number }): { hash: string | null; error?: string } {
  const normalized = normalizeState({ ...state, version: VERSION })
  if (!normalized) return { hash: null, error: 'Invalid permalink state' }
  const payload = toBase64Url(JSON.stringify(normalized))
  const hash = `${PREFIX}${payload}`
  if (hash.length > options.maxChars) {
    return { hash: null, error: 'View state too large for URL. Sample links are always shareable; local files require reattaching the source file.' }
  }
  return { hash }
}

export function decodePermalinkState(hash: string): PermalinkStateV1 | null {
  const payload = hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : ''
  if (!payload) return null
  const json = fromBase64Url(payload)
  if (!json) return null
  try {
    return normalizeState(JSON.parse(json))
  } catch {
    return null
  }
}

