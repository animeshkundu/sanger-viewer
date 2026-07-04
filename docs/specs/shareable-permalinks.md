# Spec: Shareable permalinks

## Goal
Make any review state in `sanger-viewer` easy to send as a URL so a collaborator lands on the same trace, viewport, strand, trim state, compare state, and focused evidence without installing desktop software or recreating steps by hand.

## Why this is a differentiator
- FinchTV and Chromas are fast locally but weak at browser-native sharing.
- SnapGene and Benchling win on collaboration because context travels with the record.
- `sanger-viewer` can be better for trace review if the app is shareable without adding a backend.

## User outcomes
- A user can copy a link after trimming, searching, editing, or comparing traces.
- A reviewer opening the link sees the same analysis context, not just the home screen.
- Public traces can fully hydrate from the link; local-only traces degrade safely with a clear reattach flow.

## Scope
### In scope
- URL-fragment state format (`#sv=...`) so GitHub Pages base-path support is preserved.
- Captured state for:
  - active workspace tab
  - ordered trace refs
  - viewport window and zoom
  - reverse-complement state
  - trim mode and threshold
  - mixed-base threshold
  - search query and active match
  - selected base / inspector position
  - consensus/compare drawer state when multiple traces are open
- Two trace-source modes:
  - `public-url`: HTTPS trace URLs that can be fetched by the browser
  - `local-file`: file-name-only placeholders that require reattachment
- “Copy link” and “Open permalink” entry points in the workspace shell.
- Explicit hydration banners for missing files, fetch failures, and version mismatches.

### Out of scope
- Embedding raw AB1/SCF bytes in the URL.
- Any server-side storage, auth, or link-shortening service.
- Cross-user persistence of private files without an exported session bundle.

## UX
1. User opens one or more traces and works normally.
2. User clicks **Copy Link**.
3. App serializes workspace state into the fragment and copies a full URL.
4. Recipient opens the URL:
   - if all traces are `public-url`, the app restores automatically
   - if some traces are `local-file`, the app restores layout/state and shows a reattach sheet keyed by expected file name, size, and optional checksum
5. Restored views show a “Permalink” badge so users know they are in a hydrated shared state.

## State model
```text
PermalinkState
- version
- createdAt
- activeSlotId
- slots[]
  - slotId
  - fileName
  - sourceType: public-url | local-file
  - sourceRef
  - optional checksum
  - strand
  - trim settings
  - mixed-base threshold
  - search query + active index
  - viewport
- compare
- selectedBase
```

## Technical approach
- Serialize compact JSON, gzip-compatible in structure, then base64url-encode into `location.hash`.
- Keep fragment parsing/versioning in a dedicated pure module so the viewer and future session features can share it.
- Use fragment state instead of query params to avoid server rewrites and preserve static hosting.
- Never auto-fetch non-HTTP(S) sources.
- Validate restored state defensively; clamp invalid numeric values to safe defaults.

## PR slices
1. Add pure permalink schema/parser/serializer with unit tests.
2. Add restore-on-load flow for state-only URLs and public trace refs.
3. Add copy-link UI and reattach UX for local-file placeholders.
4. Add multi-trace/consensus restore coverage and E2E tests.

## Acceptance criteria
- Copying a link from a loaded public trace restores the same visible state in a fresh tab.
- Multi-trace links restore slot order, active slot, and compare state.
- Local-file links never claim full restoration; they prompt for reattachment and preserve non-file state.
- Invalid or stale fragments fail with a user-visible recovery message, not a blank app.

## Dependencies
- Reuses existing workspace, trim, mixed-base, search, and consensus state.
- Pairs with the batch/session spec for portable offline handoff, but does not depend on it.
