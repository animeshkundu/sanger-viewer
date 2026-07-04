import type { EditEntry } from '../editing'

export const PERMALINK_VERSION = 1 as const
export const PERMALINK_HASH_PREFIX = 'sv='
export const DEFAULT_MAX_PERMALINK_CHARS = 1800

export type PermalinkSource = {
  kind: 'sample' | 'local'
  value: string
}

export interface PermalinkStateV1 {
  version: typeof PERMALINK_VERSION
  source: PermalinkSource
  view: {
    startSample: number
    samplesPerPixel: number
    strand: 'forward' | 'reverse'
  }
  trim: {
    mode: 'full' | 'trimmed'
    threshold: number
  }
  search: {
    query: string
    activeIndex: number
  }
  selection: {
    baseIndex: number
  } | null
  edits: EditEntry[]
  tracks: {
    quality: boolean
    annotations: boolean
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  if (typeof btoa !== 'function') throw new Error('Base64 encoder unavailable')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
  if (typeof atob !== 'function') throw new Error('Base64 decoder unavailable')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function encodePermalinkState(
  state: PermalinkStateV1,
  options: { maxChars?: number } = {},
): { hash: string | null; oversized: boolean } {
  const bytes = new TextEncoder().encode(JSON.stringify(state))
  const encoded = toBase64Url(bytes)
  const hash = `#${PERMALINK_HASH_PREFIX}${encoded}`
  const maxChars = options.maxChars ?? DEFAULT_MAX_PERMALINK_CHARS
  if (hash.length > maxChars) {
    return { hash: null, oversized: true }
  }
  return { hash, oversized: false }
}

export function decodePermalinkState(hash: string): PermalinkStateV1 | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const params = new URLSearchParams(raw)
  const payload = params.get('sv')
  if (!payload) return null
  try {
    const json = new TextDecoder().decode(fromBase64Url(payload))
    const parsed = JSON.parse(json) as Partial<PermalinkStateV1> | null
    if (!parsed || parsed.version !== PERMALINK_VERSION) return null
    if (!parsed.source || (parsed.source.kind !== 'sample' && parsed.source.kind !== 'local')) return null
    if (!parsed.view || typeof parsed.view.startSample !== 'number' || typeof parsed.view.samplesPerPixel !== 'number') return null
    if (!parsed.trim || (parsed.trim.mode !== 'full' && parsed.trim.mode !== 'trimmed')) return null
    if (!parsed.search || typeof parsed.search.query !== 'string' || typeof parsed.search.activeIndex !== 'number') return null
    if (!parsed.tracks || typeof parsed.tracks.quality !== 'boolean' || typeof parsed.tracks.annotations !== 'boolean') return null
    return parsed as PermalinkStateV1
  } catch {
    return null
  }
}
