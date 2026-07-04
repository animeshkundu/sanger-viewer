# 02 — Batch import review queue

**Status:** Proposed  
**Outcome:** Biologists can load dozens of Sanger reads at once, triage them quickly, and jump straight to the failures.

## Why this matters
Chromas is remembered for simple batch conversion, but not for browser-native triage. A batch queue turns `sanger-viewer` into a practical bench workflow instead of a one-file-at-a-time demo.

## Scope
- Multi-file import for `.ab1` and `.scf`.
- Queue/table view with per-read QC summary.
- Fast filters for failed trim, low quality, ambiguous base burden, short usable length, and parse failures.
- Keyboard-first navigation from queue row to detailed trace review.

## Non-goals
- No server-side sample registry.
- No LIMS integration in the first wave.
- No contig assembly in this spec; that belongs to the contig specs.

## UX spec
- Add a **Batch** entry point beside existing open/sample actions.
- Show a left or drawer-based queue with one row per trace.
- Each row exposes: filename, direction guess, usable length, mean quality, ambiguous-base count, trim status, and review status.
- Filters: `All`, `Needs review`, `Passed`, `Failed to parse`, `Contains ambiguities`.
- `Enter` opens the selected read in the main stage; `J/K` or arrow keys move through rows.

## Data model
```ts
interface BatchQueueItem {
  id: string
  fileName: string
  source: TraceSource
  metrics: {
    usableLength: number
    meanQuality: number | null
    ambiguousCount: number
    trimStart: number
    trimEnd: number
  }
  flags: Array<'parse-error' | 'low-quality' | 'short-read' | 'ambiguous'>
  review: { status: 'unreviewed' | 'accepted' | 'needs-review'; notes?: string }
}
```

## Implementation slice
- Extend workspace state with an optional batch queue collection.
- Reuse existing parse pipeline and trimming logic to compute summary metrics after import.
- Add queue UI separate from the main trace toolbar so single-read review stays uncluttered.
- Persist row selection and filters in session state.

## Acceptance criteria
- Importing many traces does not block the UI; rows populate progressively.
- A user can sort/filter to the problematic reads in one interaction.
- Opening a row preserves the batch queue context instead of replacing it.
- Parse failures remain inspectable as queue items with an error reason.

## Validation plan
- Unit tests for metric/flag derivation.
- E2E test covering multi-file upload, filtering, row opening, and keyboard navigation.
- Performance check with a representative multi-file fixture set.
