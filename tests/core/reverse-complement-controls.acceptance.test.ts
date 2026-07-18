import { describe, expect, it } from 'vitest'
import { strandToggleLabel, strandToggleTitle } from '../../src/components/Controls'

describe('reverse-complement toggle acceptance', () => {
  it('explicitly identifies the reverse-complement action and displayed strand', () => {
    expect(strandToggleLabel(false)).toBe('Reverse complement (5′→3′)')
    expect(strandToggleTitle(false)).toBe(
      'Showing forward strand — click to show reverse complement',
    )

    expect(strandToggleLabel(true)).toBe('Reverse complement (3′→5′)')
    expect(strandToggleTitle(true)).toBe(
      'Showing reverse complement — click to show forward strand',
    )
  })
})
