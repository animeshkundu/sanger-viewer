# 01 — Shareable permalinks

## Goal
Let a biologist share an exact Sanger review state as a browser URL so a collaborator opens the same trace, viewport, strand, trim mode, search hits, annotations, edits, and review callouts with zero desktop-project setup.

## Why this is a differentiator
SnapGene Viewer, FinchTV, and Chromas still center on local files and screenshots. A browser-native permalink turns every review state into a sendable artifact for lab chat, ELNs, issue trackers, and manuscript review.

## Current foundation
- Single-page client-side app deployed on GitHub Pages.
- Existing viewer state already includes strand, trim, search, annotations, mixed-base threshold, edits, and workspace slot state.
- No backend is allowed.

## User outcomes
- Copy a link from the current trace and reopen the same state later.
- Send a link to a colleague and have them land on the same reviewed region.
- Generate stable links for sample traces, published traces, and future reference/contig review states.

## In scope
- A canonical URL schema that works under the GitHub Pages `/sanger-viewer/` base path.
- URL-fragment state serialization for single-trace review state.
- Two share modes:
  1. **State-only link** for traces already available at a stable URL.
  2. **Portable embedded link** for small traces/session payloads that can safely fit in the URL fragment.
- Clear handling when a link references a local-only file that is not embedded.
- Versioned payloads for forward compatibility.

## UX specification
- Add a primary **Share** action near export/compare actions.
- Share dialog shows:
  - link type
  - what is included
  - payload size / portability status
  - copy button
- Landing from a permalink should:
  - restore the trace or prompt for the missing local file
  - restore viewport and active base/region context
  - restore trim, strand, mixed-base threshold, edits, and reviewer notes
- If the payload version is unsupported, show a readable upgrade/downgrade message instead of failing silently.

## Technical shape
- Keep all permalink data in the URL fragment, not query params, to avoid server involvement and reduce accidental logging.
- Define a compact, versioned JSON payload with optional compression.
- Reuse the existing workspace/viewer state model rather than inventing a second representation.
- Treat raw trace embedding as opt-in and size-capped.
- Preserve deterministic encoding so the same state yields the same normalized link.

## Validation
- Unit coverage for payload encode/decode, version handling, and size thresholds.
- Browser tests for copy/open/restore flows under the project base path.
- Regression coverage for reverse-complement, trim mode, mixed-base calls, manual edits, and active search hit restoration.

## Dependencies
- None. This can ship independently and should define the canonical share-state schema used by later specs.

## Non-goals
- Server-hosted sharing.
- Real-time collaboration.
- Large multi-trace workspace embedding without size limits.
