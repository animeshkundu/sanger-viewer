# 01 — Shareable permalinks

**Status:** Proposed  
**Outcome:** A reviewer can open the same trace, viewport, edits, search state, and analysis context from a URL without needing a backend.

## Why this matters
`sanger-viewer` is already browser-native and client-side only. A shareable URL is the fastest differentiator versus desktop-only tools because it turns a trace review into something that can be sent in chat, issues, ELNs, and lab docs.

## Scope
- Add a canonical URL state model for a single trace or multi-tab workspace.
- Support permalinkable state for bundled samples, remote trace URLs, and future browser-saved sessions.
- Preserve GitHub Pages base-path compatibility and work fully client-side.
- Carry analysis state: active tab, zoom window, strand, trim mode, search query, selected base, edits, and enabled overlays.

## Non-goals
- No backend upload service.
- No requirement to inline arbitrarily large local AB1 payloads into the URL.
- No cross-user sync beyond the shared link itself.

## UX spec
- Add a **Share** action in the workspace/global area.
- Generated links use `location.hash` so static hosting and base paths keep working.
- If the source is a bundled sample or CORS-fetchable remote URL, opening the link fully restores the review surface.
- If the source is a local file, the link restores review state and shows a clear “reattach source file” banner if the raw trace bytes are unavailable.
- The copied link should be stable: opening it twice yields the same visible state.

## URL/data model
```ts
interface PermalinkState {
  version: 1
  workspace: Array<{
    id: string
    source: { kind: 'sample' | 'remote' | 'session'; value: string }
    view: { start: number; end: number; strand: 'forward' | 'reverse' }
    trim: { mode: 'full' | 'trimmed'; threshold: number }
    search?: { query: string; activeIndex: number }
    selection?: { baseIndex: number }
    edits: Array<{ baseIndex: number; value: string }>
    overlays: { quality: boolean; annotations: boolean; mixedBases: boolean }
  }>
  activeTabId: string
}
```
- Serialize JSON to UTF-8, compress, then base64url encode into the hash.
- Reserve `?src=` only for explicit remote launches; all mutable viewer state lives in the hash.
- Reject oversized states with a user-facing message and offer “Save session” instead of emitting a broken URL.

## Implementation slice
- New state codec under `src/workspace/`.
- URL hydration/persistence in the main app boot path and workspace store.
- Share UI in `WorkspaceBar`/viewer chrome.
- Tests in workspace/core plus one E2E round-trip case.

## Acceptance criteria
- Copying a permalink and opening it in a fresh tab restores the same visible state for a sample trace.
- Remote URLs round-trip without breaking GitHub Pages deployment.
- Edit/search/selection state survive a reload when the source can be resolved.
- Local-file links degrade honestly instead of pretending the trace is available.

## Validation plan
- Unit tests for encode/decode, versioning, and oversize handling.
- E2E test: open sample, zoom, trim, edit, search, copy link, reload from link, verify state.
- Manual check on production build under `/sanger-viewer/`.
