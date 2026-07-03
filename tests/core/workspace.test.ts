import { describe, expect, it } from 'vitest'
import { TraceWorkspace, makeSlot } from '../../src/workspace/TraceWorkspace'
import type { TraceData } from '../../src/types/trace'

/** Minimal fake TraceData sufficient for workspace slot tests. */
function fakeTrace(name: string, sampleCount = 500): TraceData {
  const empty = new Float32Array(sampleCount)
  return {
    format: 'ab1',
    fileName: name,
    sampleCount,
    channels: { A: empty, C: empty, G: empty, T: empty },
    baseCalls: ['A', 'C', 'G'],
    peakPositions: [50, 150, 250],
    qualities: [30, 40, 50],
    sequence: 'ACG',
    metadata: {},
  }
}

function residentCount(ws: TraceWorkspace): number {
  return ws.getAll().filter((slot) => slot.rawTrace !== null).length
}

describe('TraceWorkspace', () => {
  it('starts empty with no active slot', () => {
    const ws = new TraceWorkspace()
    expect(ws.getAll()).toHaveLength(0)
    expect(ws.getActive()).toBeNull()
  })

  it('add() returns a string id and sets the new slot as active', () => {
    const ws = new TraceWorkspace()
    const trace = fakeTrace('a.ab1')
    const id = ws.add(makeSlot(trace))
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
    const active = ws.getActive()
    expect(active).not.toBeNull()
    expect(active!.id).toBe(id)
    expect(active!.fileName).toBe('a.ab1')
    expect(active!.rawTrace).not.toBeNull()
  })

  it('add() appends slots in order', () => {
    const ws = new TraceWorkspace()
    const idA = ws.add(makeSlot(fakeTrace('a.ab1')))
    const idB = ws.add(makeSlot(fakeTrace('b.ab1')))
    const all = ws.getAll()
    expect(all).toHaveLength(2)
    expect(all[0].id).toBe(idA)
    expect(all[1].id).toBe(idB)
  })

  it('activate() moves the slot to MRU end and sets activeId', () => {
    const ws = new TraceWorkspace()
    const idA = ws.add(makeSlot(fakeTrace('a.ab1')))
    const idB = ws.add(makeSlot(fakeTrace('b.ab1')))
    ws.activate(idA)
    const all = ws.getAll()
    // A is now MRU (end of array)
    expect(all[all.length - 1].id).toBe(idA)
    expect(ws.getActive()!.id).toBe(idA)
    // B was pushed earlier so it is now LRU (index 0)
    expect(all[0].id).toBe(idB)
  })

  it('close() removes a non-active slot', () => {
    const ws = new TraceWorkspace()
    const idA = ws.add(makeSlot(fakeTrace('a.ab1')))
    const idB = ws.add(makeSlot(fakeTrace('b.ab1')))
    ws.close(idA)
    expect(ws.getAll()).toHaveLength(1)
    expect(ws.getActive()!.id).toBe(idB)
  })

  it('close() of the active slot activates the last remaining slot', () => {
    const ws = new TraceWorkspace()
    const idA = ws.add(makeSlot(fakeTrace('a.ab1')))
    const idB = ws.add(makeSlot(fakeTrace('b.ab1')))
    const idC = ws.add(makeSlot(fakeTrace('c.ab1')))
    // idC is now active
    ws.close(idC)
    // Next active should be whatever is last in the remaining array
    const active = ws.getActive()
    expect(active).not.toBeNull()
    expect(active!.id).not.toBe(idC)
    // Should be idA or idB — whichever is at the end
    expect([idA, idB]).toContain(active!.id)
  })

  it('close() of the only slot results in null active', () => {
    const ws = new TraceWorkspace()
    const id = ws.add(makeSlot(fakeTrace('only.ab1')))
    ws.close(id)
    expect(ws.getAll()).toHaveLength(0)
    expect(ws.getActive()).toBeNull()
  })

  it('updateSlot() merges a partial patch', () => {
    const ws = new TraceWorkspace()
    const id = ws.add(makeSlot(fakeTrace('x.ab1')))
    ws.updateSlot(id, { isRevcomp: true, viewport: { startSample: 42, samplesPerPixel: 3 } })
    const slot = ws.getActive()!
    expect(slot.isRevcomp).toBe(true)
    expect(slot.viewport.startSample).toBe(42)
    expect(slot.viewport.samplesPerPixel).toBe(3)
  })

  it('updateSlot() is a no-op for unknown id', () => {
    const ws = new TraceWorkspace()
    expect(() => ws.updateSlot('nonexistent', { isRevcomp: true })).not.toThrow()
  })

  describe('LRU eviction (_evict)', () => {
    it('resident trace count never exceeds cap', () => {
      const ws = new TraceWorkspace(3)
      ws.add(makeSlot(fakeTrace('a.ab1')))
      ws.add(makeSlot(fakeTrace('b.ab1')))
      ws.add(makeSlot(fakeTrace('c.ab1')))
      ws.add(makeSlot(fakeTrace('d.ab1')))
      expect(residentCount(ws)).toBe(3)
    })

    it('keeps the evicted slot shell with rawTrace === null', () => {
      const ws = new TraceWorkspace(2)
      const idA = ws.add(makeSlot(fakeTrace('a.ab1')))
      ws.add(makeSlot(fakeTrace('b.ab1')))
      const residentBefore = residentCount(ws)
      expect(residentBefore).toBe(2)
      // Adding c evicts a (LRU)
      ws.add(makeSlot(fakeTrace('c.ab1')))
      expect(ws.getAll()).toHaveLength(3)
      const evicted = ws.getAll().find((slot) => slot.id === idA)
      expect(evicted).toBeDefined()
      expect(evicted?.rawTrace).toBeNull()
      const residentAfter = residentCount(ws)
      expect(residentAfter).toBe(2)
      expect(ws.getAll().filter((slot) => slot.rawTrace === null)).toHaveLength(1)
      expect(residentAfter).toBe(ws.getAll().length - 1)
    })

    it('active slot is never evicted', () => {
      const ws = new TraceWorkspace(2)
      const idA = ws.add(makeSlot(fakeTrace('a.ab1')))
      ws.add(makeSlot(fakeTrace('b.ab1')))
      ws.activate(idA)  // a is now active AND LRU position is b
      ws.add(makeSlot(fakeTrace('c.ab1')))
      // b should have been evicted (LRU non-active), a should survive.
      const all = ws.getAll()
      expect(all).toHaveLength(3)
      expect(all.some((s) => s.id === idA)).toBe(true)
      // The active slot still has rawTrace
      const activeSlot = all.find((s) => s.id === idA)!
      expect(activeSlot.rawTrace).not.toBeNull()
      expect(residentCount(ws)).toBe(2)
    })

    it('keeps exactly cap resident traces after many adds', () => {
      const ws = new TraceWorkspace(3)
      for (let i = 0; i < 10; i += 1) {
        ws.add(makeSlot(fakeTrace(`trace${i}.ab1`)))
      }
      expect(ws.getAll()).toHaveLength(10)
      expect(residentCount(ws)).toBe(3)
    })
  })
})
