# 04 — Reference record context

**Status:** Proposed  
**Outcome:** A trace can be reviewed against a real reference record with named features instead of as an isolated string of bases.

## Why this matters
SnapGene, Geneious, and Benchling feel more useful because traces live inside sequence context. Reference import is the foundation for alignment, variant review, primer work, and in-silico PCR.

## Scope
- Import FASTA and GenBank reference records.
- Preserve reference name, circular/linear flag, length, and annotated features.
- Allow one workspace or contig to be linked to one active reference.
- Expose feature-aware navigation from the trace workspace.

## Non-goals
- No full plasmid editor.
- No online reference database integration.
- No variant calling in this spec.

## UX spec
- Add **Attach reference** to the compare/analysis surface.
- Show a compact reference summary: name, length, topology, feature count.
- Provide a feature list with search/jump actions that move the alignment/review view to the relevant region.
- Keep reference context collapsible so single-trace reading remains fast.

## Data model
```ts
interface ReferenceRecord {
  id: string
  name: string
  sequence: string
  topology: 'linear' | 'circular'
  features: Array<{
    id: string
    name: string
    type: string
    start: number
    end: number
    strand: 1 | -1
    notes?: Record<string, string>
  }>
}
```

## Implementation slice
- New parser/import path for FASTA and GenBank.
- Reference store in workspace state.
- UI for attaching/detaching a reference and listing features.
- Shared coordinate utilities to support later alignment and PCR specs.

## Acceptance criteria
- FASTA and GenBank references import in-browser with no backend.
- GenBank features remain navigable and human-readable.
- A trace workspace can remember which reference is attached.
- Reference context is reusable by later alignment/primer workflows.

## Validation plan
- Parser tests for FASTA/GenBank fixtures.
- Unit tests for feature normalization and coordinate helpers.
- E2E test for attach-reference, feature jump, and persistence in session state.
