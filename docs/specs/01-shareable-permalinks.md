# 01 — Shareable permalinks

## Summary
Add browser-native permalinks that reopen a workspace in the same analysis state without requiring any server. The feature should support both lightweight state-only links and self-contained share links for small single-trace workspaces.

## Why this is a differentiator
Desktop Sanger tools are hard to share: screenshots lose context and raw files move outside the review flow. A permalink makes the browser workspace reviewable, reproducible, and easy to hand off in chats, tickets, ELNs, and PR descriptions.

## Current baseline
Today the app is local-first: users can load `.ab1`/`.scf`, inspect traces, trim, search, call mixed bases, edit calls, view annotations, and keep a small in-memory multi-trace workspace. None of that state is shareable by URL.

## Goals
- Reopen a workspace with the same viewport, strand, trim, search, mixed-base threshold, annotations, and selected trace.
- Keep the feature client-side only.
- Make links safe to paste into GitHub issues, chat, and lab notes.
- Preserve GitHub Pages base-path compatibility.

## Non-goals
- No hosted backend or account system.
- No mandatory upload of private trace data.
- No multi-user real-time collaboration.

## User workflows
1. User loads one or more traces, adjusts the workspace, and clicks **Copy link**.
2. For state-only links, the recipient sees the exact workspace recipe and is prompted to reattach local trace files that match stored fingerprints.
3. For self-contained links, the recipient opens the exact same single-trace workspace immediately when the payload stays within the size budget.
4. User can choose **Export workspace file** when the payload is too large for a URL.

## Spec
### Link modes
#### A. State-only permalink
- Serialize only workspace metadata and analysis state.
- Include per-trace fingerprint fields: file name, byte size, modified timestamp when available, and a fast content hash.
- Store no raw trace bytes.
- Open directly from `location.hash` so the feature works on static hosting.

#### B. Self-contained share permalink
- Available only for one resident trace and only when the compressed payload is under a defined URL budget.
- Embed compressed raw trace bytes plus the same analysis state as the state-only link.
- Use an explicit confirmation step before generating the link because it may contain private sample content.

#### C. Workspace bundle fallback
- If the state cannot fit in a URL, offer export/import of a `.svws.json` bundle.
- Bundle format must reuse the same schema as the permalink payload so both features share one parser.

### Payload schema
- `version`
- `workspaceMode`: `state-only | self-contained | bundle`
- `activeTraceId`
- `traces[]`
  - `id`
  - `fingerprint`
  - `displayName`
  - `orientation`
  - `trimSettings`
  - `mixedBaseThreshold`
  - `edits`
  - `viewport`
  - `search`
  - `annotationsVisibility`
  - optional embedded raw bytes for self-contained mode
- `createdAt`
- `appBuild`

### UX
- Add **Share** to the workspace bar or primary controls.
- Show a modal with three actions: **Copy state link**, **Copy self-contained link**, **Export workspace file**.
- On open, display a restore panel that clearly distinguishes:
  - restorable now
  - needs local file reattachment
  - incompatible payload version
- If a file fingerprint mismatch occurs, let users manually attach a replacement and show a warning before applying saved edits.

### Guardrails
- Default to state-only mode.
- Require an explicit checkbox before embedding raw trace bytes.
- Never use query parameters for payload data; use the URL hash to avoid server logs.
- Validate payload version and size before writing the URL.

## Acceptance criteria
- A copied state-only link reopens the same workspace state after matching local files are reattached.
- A copied self-contained link reopens the same single-trace workspace without extra files when under budget.
- Oversized workspaces automatically fall back to bundle export.
- Invalid or future-version payloads fail with a user-readable restore message.
- Generated links work under the GitHub Pages `/sanger-viewer/` base path.

## Parallel build slices
1. Shared workspace snapshot schema and serializer.
2. Hash-based restore flow.
3. UI for copy/export/restore.
4. Optional embedded-byte mode with size budget checks.

## Dependencies
- Works well on its own.
- Becomes more valuable once session persistence and batch workflows ship.
