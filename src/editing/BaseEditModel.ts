/**
 * Quality sentinel used for any base position that has been manually edited.
 * Phred+33 encodes this as '!' (chr(33)), the lowest possible FASTQ quality character.
 */
export const EDITED_BASE_QUALITY_SENTINEL = 0

export interface EditEntry {
  forwardIndex: number
  base: string
  originalBase: string
}

/**
 * Pure edit model for in-place base-call editing.
 *
 * All coordinates are forward-strand indices into the raw trace's baseCalls array.
 * When the viewer is showing the reverse complement, the caller is responsible for
 * mapping display indices to forward-strand indices before calling apply().
 *
 * The undo/redo stacks store full snapshots of the edits map so that each
 * transition is O(edits) rather than O(sequence-length).
 */
export class BaseEditModel {
  private edits: Map<number, EditEntry> = new Map()
  private undoStack: Map<number, EditEntry>[] = []
  private redoStack: Map<number, EditEntry>[] = []

  /**
   * Apply an edit at the given forward-strand index.
   * Clears the redo stack and pushes the current state onto the undo stack.
   * If newBase equals originalBase the edit entry is removed (revert to original).
   */
  apply(forwardIndex: number, newBase: string, originalBase: string): void {
    this.undoStack.push(new Map(this.edits))
    this.redoStack = []
    if (newBase.toUpperCase() === originalBase.toUpperCase()) {
      this.edits.delete(forwardIndex)
    } else {
      this.edits.set(forwardIndex, {
        forwardIndex,
        base: newBase.toUpperCase(),
        originalBase: originalBase.toUpperCase(),
      })
    }
  }

  /** Undo the last edit, restoring the previous edits snapshot. */
  undo(): void {
    if (this.undoStack.length === 0) return
    this.redoStack.push(new Map(this.edits))
    this.edits = this.undoStack.pop()!
  }

  /** Redo the previously undone edit. */
  redo(): void {
    if (this.redoStack.length === 0) return
    this.undoStack.push(new Map(this.edits))
    this.edits = this.redoStack.pop()!
  }

  /**
   * Return a new baseCalls array with all edits applied.
   * Positions without edits retain their original base.
   */
  applyToBaseCalls(baseCalls: string[]): string[] {
    if (this.edits.size === 0) return baseCalls.slice()
    return baseCalls.map((base, i) => {
      const entry = this.edits.get(i)
      return entry ? entry.base : base
    })
  }

  /**
   * Return a new qualities array with EDITED_BASE_QUALITY_SENTINEL substituted
   * at each edited position.  Returns null if input is null.
   */
  applyToQualities(qualities: number[] | null): number[] | null {
    if (qualities === null) return null
    if (this.edits.size === 0) return qualities.slice()
    return qualities.map((q, i) =>
      this.edits.has(i) ? EDITED_BASE_QUALITY_SENTINEL : q,
    )
  }

  /** The set of forward-strand indices that currently have an active edit. */
  get editedIndices(): Set<number> {
    return new Set(this.edits.keys())
  }

  /** True when there is at least one state to undo. */
  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  /** True when there is at least one state to redo. */
  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Clear all edits and stacks.  Call this when loading a new trace. */
  reset(): void {
    this.edits.clear()
    this.undoStack = []
    this.redoStack = []
  }
}
