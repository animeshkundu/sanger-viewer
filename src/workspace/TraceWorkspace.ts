/**
 * TraceWorkspace — LRU-capped multi-trace session model.
 *
 * Keeps up to `cap` trace slots in memory (default 5).  When a new slot would
 * exceed the cap the least-recently-used slot whose rawTrace is non-null (and
 * which is not currently active) has its rawTrace set to null so the
 * Float32Arrays can be GC-ed.  The slot shell (fileName, id, search/trim/viewport
 * state) is kept so the UI can still display the tab name.
 */

import type { TraceData } from '../types/trace'
import type { TrimResult, TrimSettings } from '../quality/mottTrim'
import { DEFAULT_TRIM_SETTINGS } from '../quality/mottTrim'
import type { SubsequenceMatch } from '../search/findSubsequence'

export interface WorkspaceSearchState {
  query: string
  matches: SubsequenceMatch[]
  activeIndex: number
}

export interface TraceSlot {
  /** Stable UUID for this slot. */
  id: string
  /** Original file name (always kept, even when evicted). */
  fileName: string
  /**
   * The parsed trace.  null when the slot has been LRU-evicted to free memory.
   * The shell (id, fileName, etc.) is preserved so the tab can still be shown.
   */
  rawTrace: TraceData | null
  /** Whether the trace is displayed as reverse-complement. */
  isRevcomp: boolean
  /** Quality-trim settings at the time of last save. */
  trimSettings: TrimSettings
  /** Last computed trim result (null when not yet computed or evicted). */
  trimResult: TrimResult | null
  /** Subsequence-search state. */
  searchState: WorkspaceSearchState
  /** Chromatogram viewport state. */
  viewport: { startSample: number; samplesPerPixel: number }
}

function generateId(): string {
  // Prefer crypto.randomUUID when available (browser + Node 14.17+).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Simple fallback for test environments without crypto.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export class TraceWorkspace {
  /** Ordered array of slots; last element is most-recently-used (MRU). */
  private slots: TraceSlot[] = []
  /** Id of the currently active (displayed) slot, or null when empty. */
  private activeId: string | null = null

  constructor(private readonly cap: number = 5) {}

  /**
   * Add a new slot for the given trace.  The new slot becomes the active one.
   * If adding it would exceed `cap` the LRU eviction runs after insertion.
   *
   * @returns The newly created slot's id.
   */
  add(slotData: Omit<TraceSlot, 'id'>): string {
    const id = generateId()
    const slot: TraceSlot = { id, ...slotData }
    this.slots.push(slot)   // push to end → MRU
    this.activeId = id
    this._evict()
    return id
  }

  /**
   * Activate a slot by id, promoting it to MRU position.
   * No-op when the id does not exist.
   */
  activate(id: string): void {
    const idx = this.slots.findIndex((s) => s.id === id)
    if (idx === -1) return
    const [slot] = this.slots.splice(idx, 1)
    this.slots.push(slot)   // promote to MRU end
    this.activeId = id
  }

  /** Return the currently active slot, or null when the workspace is empty. */
  getActive(): TraceSlot | null {
    if (!this.activeId) return null
    return this.slots.find((s) => s.id === this.activeId) ?? null
  }

  /** Return all slots (LRU-first, MRU-last). */
  getAll(): readonly TraceSlot[] {
    return this.slots
  }

  /**
   * Close a slot.  If it was the active slot, the next candidate becomes
   * active (prefer the last slot in the array; fall back to null).
   */
  close(id: string): void {
    const idx = this.slots.findIndex((s) => s.id === id)
    if (idx === -1) return
    this.slots.splice(idx, 1)
    if (this.activeId === id) {
      const last = this.slots[this.slots.length - 1]
      this.activeId = last?.id ?? null
    }
  }

  /**
   * Merge a partial patch into an existing slot (used by TraceViewer to save
   * viewport / search / trim state before switching away from a slot).
   * No-op when the id is not found.
   */
  updateSlot(id: string, patch: Partial<TraceSlot>): void {
    const slot = this.slots.find((s) => s.id === id)
    if (!slot) return
    Object.assign(slot, patch)
  }

  /**
   * LRU eviction: while total slot count exceeds cap, null out the rawTrace
   * of the oldest slot that is not the active one.
   *
   * Invariant: the active slot is NEVER evicted.
   */
  _evict(): void {
    while (this.slots.length > this.cap) {
      // Find the first (oldest / LRU) slot that is not active.
      const idx = this.slots.findIndex((s) => s.id !== this.activeId)
      if (idx === -1) break  // all remaining slots are active — shouldn't happen
      this.slots[idx].rawTrace = null
      this.slots.splice(idx, 1)
    }
  }
}

/** Build a fresh slot from a loaded trace with default per-slot state. */
export function makeSlot(trace: TraceData): Omit<TraceSlot, 'id'> {
  return {
    fileName: trace.fileName,
    rawTrace: trace,
    isRevcomp: false,
    trimSettings: { ...DEFAULT_TRIM_SETTINGS },
    trimResult: null,
    searchState: { query: '', matches: [], activeIndex: -1 },
    viewport: { startSample: 0, samplesPerPixel: Math.max(1, trace.sampleCount / 300) },
  }
}
