# 03 — Session persistence and resume

- Status: Proposed
- Build wave: D1
- Depends on: 02-batch-intake-and-qc-queue.md (recommended, not required)
- Enables: stop-and-resume review, offline continuity, analyst handoff on one machine

## Goal
Persist workspace metadata locally so a user can close the tab and later reopen the same analytical session without rebuilding context from scratch.

## Why this matters
A browser-native workspace becomes preferable to desktop viewers when it behaves like a durable notebook instead of a transient canvas.

## User outcomes
- A user can explicitly save a session and reopen it later on the same device.
- Recent sessions appear in a lightweight launcher with timestamps and file counts.
- Reopened sessions restore queue order, reviewed state, annotations, edits, and viewer state when source files are available.

## Scope
- Local-only session manifests stored in browser storage.
- Session metadata: title, created/updated timestamps, loaded file fingerprints, per-trace analytical state, queue state, and notes about missing files.
- Manual save, auto-save, duplicate session, rename session, and clear session.
- Recovery path when a session references files the browser can no longer access.

## Data contract
- Store only metadata and derived state by default; do not silently persist raw trace binaries unless the user opts in.
- Fingerprint files using name, size, and a content hash where available.
- Version the session schema to support future migrations.

## UX requirements
- Auto-save is visible but unobtrusive.
- Missing-file recovery lets users relink files individually or in bulk.
- Session storage usage is surfaced before the browser quota becomes a problem.
- Privacy messaging makes it clear that session data stays in the browser.

## Implementation notes
- Favor IndexedDB for manifests and optional cached traces.
- Keep the feature client-side only and offline-friendly.

## Acceptance criteria
- Reloading the page restores the most recent autosaved session when the user opts in.
- Reopening a saved session restores analytical state without corrupting newer schemas.
- Missing files do not make the session unusable.
- Automated tests cover schema migration, relink flows, and autosave recovery.

## Non-goals
- Multi-user collaboration.
- Remote database storage.
