# 01 — Shareable Permalinks

- **Status:** Proposed
- **Spec type:** Differentiator (docs-only, parallel-safe)
- **PR scope:** This file only

## Problem
Sanger review decisions are hard to reproduce when collaborators cannot reopen the exact same viewport, strand, edits, and flags.

## Outcome
Any analyst can generate a stable URL that restores analysis state exactly in a browser, without backend storage.

## Scope (build wave)
- Encode current workspace state into a compact permalink payload.
- Restore state on load (active trace, zoom, pan, strand, trim mode, manual edits, annotations).
- Add “Copy link” action with success/failure feedback.
- Add URL schema versioning for forward compatibility.

## Non-goals
- Server-side state persistence.
- User authentication/ACL.

## UX
1. User loads trace(s), edits calls, sets trim/strand/zoom.
2. User clicks **Share → Copy permalink**.
3. Collaborator opens URL and sees same state in read-only until they choose to edit.

## Data model
- `PermalinkStateV1`
  - `version`
  - `files[]` (name + checksum + optional embedded sample id)
  - `activeTraceId`
  - `view` (zoom, pan, strand)
  - `analysis` (trim settings, mixed-base settings)
  - `edits[]`
  - `annotations[]`

## Acceptance criteria
- Generated URL restores equivalent state in a new browser session.
- Unknown schema versions fail gracefully with migration/error messaging.
- URLs remain usable on GitHub Pages project base path.
- Copy action works on desktop and touch browsers.

## Risks
- URL length growth with large edit/annotation sets.
- Browser differences in URL/history limits.

## Success metrics
- % sessions with at least one permalink copy.
- Reopen success rate for copied links.
