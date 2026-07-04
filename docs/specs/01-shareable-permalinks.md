# 01 — Shareable permalinks

- Status: Proposed
- Build wave: D1
- Depends on: none
- Enables: review-by-link, reproducible bug reports, teaching/demo flows

## Goal
Make every browser state that matters to a biologist shareable as a copyable URL, without any server dependency.

## Why this matters
Current desktop tools are awkward to review asynchronously. A browser-native viewer becomes materially better when a user can hand a collaborator a URL that opens the same trace, viewport, strand, search hit, trim state, mixed-base threshold, and selected base.

## User outcomes
- A user can click **Copy link** and send a reproducible review state.
- A collaborator opening the link sees the same analytical context, not just the raw file.
- Shared links work on GitHub Pages under `/sanger-viewer/` and in local development.

## Scope
- Encode viewer state in the URL hash or query string with a versioned schema.
- Support single-trace state first, then workspace/session references when multiple traces are loaded.
- Restore state on initial load and on browser back/forward.
- Expose a compact share action in the toolbar and workspace bar.

## URL contract
- Include schema version, active trace identifier, strand, zoom window, selected base, trim mode/threshold, mixed-base threshold, search query, active search match, annotation visibility, and quality-track visibility.
- Use stable, human-debuggable keys.
- Strip transient UI-only state such as hover position or loading banners.
- Reject invalid or stale payloads gracefully and fall back to defaults.

## UX requirements
- Copy action gives explicit success/failure feedback.
- Restored state is announced in accessible status text.
- If the underlying file is missing, the app preserves the analytical state and prompts the user to attach the matching local file.
- Long URLs degrade to a shareable compressed form before the feature is considered complete.

## Implementation notes
- Use a versioned state serializer so future specs can extend the payload without breaking old links.
- Keep the share layer browser-only; no backend link shortener is required.
- Preserve GitHub Pages base-path support when generating links.

## Acceptance criteria
- A copied permalink round-trips the supported state fields with no manual reconfiguration.
- Opening a malformed link never crashes the viewer.
- Browser navigation restores prior analytical states.
- Automated tests cover serializer compatibility, state restoration, and base-path-safe link generation.

## Non-goals
- Cloud-hosted storage of trace files.
- Authentication or access control.
