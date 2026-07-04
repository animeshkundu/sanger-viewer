import { describe, expect, it } from 'vitest'
import { BaseEditModel, EDITED_BASE_QUALITY_SENTINEL } from '../../src/editing/BaseEditModel'

// ---------------------------------------------------------------------------
// EDITED_BASE_QUALITY_SENTINEL
// ---------------------------------------------------------------------------

describe('EDITED_BASE_QUALITY_SENTINEL', () => {
  it('equals 0 (Phred+33 encodes as "!" — the lowest printable ASCII character)', () => {
    expect(EDITED_BASE_QUALITY_SENTINEL).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Basic substitution
// ---------------------------------------------------------------------------

describe('BaseEditModel — basic substitution', () => {
  it('apply replaces the base at the given index', () => {
    const model = new BaseEditModel()
    model.apply(2, 'G', 'A')
    expect(model.applyToBaseCalls(['A', 'C', 'A', 'T'])).toEqual(['A', 'C', 'G', 'T'])
  })

  it('apply normalises to uppercase', () => {
    const model = new BaseEditModel()
    model.apply(1, 'g', 'C')
    expect(model.applyToBaseCalls(['A', 'C', 'G', 'T'])).toEqual(['A', 'G', 'G', 'T'])
  })

  it('editedIndices reflects active edits', () => {
    const model = new BaseEditModel()
    model.apply(2, 'G', 'A')
    expect(model.editedIndices).toEqual(new Set([2]))
  })

  it('applying the original base removes the edit entry', () => {
    const model = new BaseEditModel()
    model.apply(2, 'G', 'A')
    model.apply(2, 'A', 'A')  // second apply uses original base → should clear
    expect(model.editedIndices).toEqual(new Set())
    expect(model.applyToBaseCalls(['A', 'C', 'A', 'T'])).toEqual(['A', 'C', 'A', 'T'])
  })

  it('multiple positions can be edited independently', () => {
    const model = new BaseEditModel()
    model.apply(0, 'T', 'A')
    model.apply(3, 'C', 'T')
    expect(model.applyToBaseCalls(['A', 'C', 'G', 'T'])).toEqual(['T', 'C', 'G', 'C'])
    expect(model.editedIndices).toEqual(new Set([0, 3]))
  })
})

// ---------------------------------------------------------------------------
// No-op edit guard
// ---------------------------------------------------------------------------

describe('BaseEditModel — no-op edit guard', () => {
  it('reverting an unedited position leaves undo/redo stacks unchanged', () => {
    const model = new BaseEditModel()
    // Applying the original base to a position that has no edit must be a no-op.
    model.apply(0, 'A', 'A')
    expect(model.canUndo).toBe(false)
    expect(model.canRedo).toBe(false)
    expect(model.editedIndices).toEqual(new Set())
  })

  it('re-applying the identical base at an already-edited position does not push a duplicate undo step', () => {
    const model = new BaseEditModel()
    model.apply(1, 'G', 'C')          // real edit → undo stack grows to 1
    model.apply(1, 'G', 'C')          // same base again → must be a no-op
    expect(model.canUndo).toBe(true)
    // Only one undo step recorded — after undo the edit is gone.
    model.undo()
    expect(model.canUndo).toBe(false)
    expect(model.editedIndices).toEqual(new Set())
  })
})

// ---------------------------------------------------------------------------
// canUndo / canRedo at stack ends
// ---------------------------------------------------------------------------

describe('BaseEditModel — canUndo / canRedo disabled-state transitions', () => {
  it('canUndo is false before any edit', () => {
    const model = new BaseEditModel()
    expect(model.canUndo).toBe(false)
  })

  it('canRedo is false before any undo', () => {
    const model = new BaseEditModel()
    expect(model.canRedo).toBe(false)
  })

  it('canUndo is true after an edit', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    expect(model.canUndo).toBe(true)
  })

  it('canRedo is false immediately after an edit', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    expect(model.canRedo).toBe(false)
  })

  it('canRedo is true after undo', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    model.undo()
    expect(model.canRedo).toBe(true)
  })

  it('canUndo is false after undoing all edits', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    model.undo()
    expect(model.canUndo).toBe(false)
  })

  it('canRedo is false after redo', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    model.undo()
    model.redo()
    expect(model.canRedo).toBe(false)
  })

  it('canUndo is true after redo', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    model.undo()
    model.redo()
    expect(model.canUndo).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Undo restores original
// ---------------------------------------------------------------------------

describe('BaseEditModel — undo', () => {
  it('undo restores the pre-edit sequence', () => {
    const model = new BaseEditModel()
    model.apply(2, 'G', 'A')
    model.undo()
    expect(model.applyToBaseCalls(['A', 'C', 'A', 'T'])).toEqual(['A', 'C', 'A', 'T'])
  })

  it('undo clears editedIndices', () => {
    const model = new BaseEditModel()
    model.apply(2, 'G', 'A')
    model.undo()
    expect(model.editedIndices).toEqual(new Set())
  })

  it('undo is a no-op when stack is empty', () => {
    const model = new BaseEditModel()
    model.undo() // should not throw
    expect(model.applyToBaseCalls(['A', 'C', 'G', 'T'])).toEqual(['A', 'C', 'G', 'T'])
  })

  it('multiple undos restore each prior state in reverse order', () => {
    const model = new BaseEditModel()
    model.apply(0, 'T', 'A')   // state 1: T at 0
    model.apply(1, 'G', 'C')   // state 2: T at 0, G at 1
    model.undo()                // back to state 1: T at 0 only
    expect(model.applyToBaseCalls(['A', 'C', 'G', 'T'])).toEqual(['T', 'C', 'G', 'T'])
    expect(model.editedIndices).toEqual(new Set([0]))
    model.undo()                // back to empty
    expect(model.applyToBaseCalls(['A', 'C', 'G', 'T'])).toEqual(['A', 'C', 'G', 'T'])
    expect(model.editedIndices).toEqual(new Set())
  })
})

// ---------------------------------------------------------------------------
// Redo re-applies
// ---------------------------------------------------------------------------

describe('BaseEditModel — redo', () => {
  it('redo re-applies the undone edit', () => {
    const model = new BaseEditModel()
    model.apply(2, 'G', 'A')
    model.undo()
    model.redo()
    expect(model.applyToBaseCalls(['A', 'C', 'A', 'T'])).toEqual(['A', 'C', 'G', 'T'])
    expect(model.editedIndices).toEqual(new Set([2]))
  })

  it('redo is a no-op when redo stack is empty', () => {
    const model = new BaseEditModel()
    model.redo() // should not throw
    expect(model.applyToBaseCalls(['A', 'C', 'G', 'T'])).toEqual(['A', 'C', 'G', 'T'])
  })

  it('a new edit clears the redo stack', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    model.undo()
    model.apply(1, 'T', 'C') // new edit should clear redo
    expect(model.canRedo).toBe(false)
    model.redo() // should be a no-op
    expect(model.applyToBaseCalls(['A', 'C', 'G', 'T'])).toEqual(['A', 'T', 'G', 'T'])
  })
})

// ---------------------------------------------------------------------------
// applyToQualities
// ---------------------------------------------------------------------------

describe('BaseEditModel — applyToQualities', () => {
  it('substitutes EDITED_BASE_QUALITY_SENTINEL at edited positions', () => {
    const model = new BaseEditModel()
    model.apply(1, 'G', 'C')
    const result = model.applyToQualities([30, 35, 40, 20])
    expect(result).toEqual([30, EDITED_BASE_QUALITY_SENTINEL, 40, 20])
  })

  it('returns null when input is null', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    expect(model.applyToQualities(null)).toBeNull()
  })

  it('returns a copy of the array when no edits', () => {
    const model = new BaseEditModel()
    const q = [30, 35, 40]
    const result = model.applyToQualities(q)
    expect(result).toEqual([30, 35, 40])
    // Must be a new array
    expect(result).not.toBe(q)
  })

  it('edited quality reverts to original after undo', () => {
    const model = new BaseEditModel()
    model.apply(1, 'G', 'C')
    model.undo()
    expect(model.applyToQualities([30, 35, 40, 20])).toEqual([30, 35, 40, 20])
  })
})

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('BaseEditModel — reset', () => {
  it('reset clears all edits', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    model.reset()
    expect(model.editedIndices).toEqual(new Set())
    expect(model.applyToBaseCalls(['A', 'C', 'G', 'T'])).toEqual(['A', 'C', 'G', 'T'])
  })

  it('reset clears undo and redo stacks', () => {
    const model = new BaseEditModel()
    model.apply(0, 'G', 'A')
    model.reset()
    expect(model.canUndo).toBe(false)
    expect(model.canRedo).toBe(false)
  })
})
