# 10 — Session projects

## Goal
Persist a full browser-native project so a user can leave and return to an analysis workspace without rebuilding context from scratch.

## Why this wins
Desktop tools rely on local files and ad hoc notes. A durable browser session creates a real workspace advantage while keeping the app client-side.

## User outcomes
- A user can save a named project containing traces, derived contigs, references, primers, snapshots, and review state.
- A user can close the browser and reopen the project later on the same machine.
- A user can export a portable session bundle for transfer to another browser.

## In scope
- Browser persistence for named projects.
- Session manifest covering all first-party analysis artifacts.
- Import/export of a portable bundle with schema validation.
- Recovery flows for missing local raw files referenced by the session.

## Out of scope
- Cloud sync.
- Multi-user shared editing.
- End-to-end encryption key management.

## Product behavior
1. Add a `Projects` surface for create, duplicate, rename, archive, and reopen actions.
2. Persist lightweight metadata eagerly and larger assets through browser storage designed for offline use.
3. Distinguish between embedded assets, bundled samples, and external local-file references.
4. When reopening a project with missing local files, preserve the session shell and guide the user through relinking.
5. Exported bundles include a manifest, analysis artifacts, and optional embedded raw traces when the user chooses a portable package mode.

## Data contract
- Project manifest version, title, timestamps, and app build metadata.
- Lists of traces, contigs, references, primers, snapshots, variants, and queue review tags.
- Asset provenance markers: embedded, sample, or external-local.

## Delivery notes
- Keep storage adapters abstract so IndexedDB and file-based export can share the same manifest model.
- Reuse the permalink and snapshot schemas instead of duplicating viewer-state storage.
- Treat session import/export as the foundation for future reproducibility stories.

## Acceptance criteria
- Users can save and reopen named projects in the same browser.
- Portable exports round-trip across fresh browser sessions.
- Missing local files are recoverable without corrupting the rest of the project.
- The entire feature remains compatible with static GitHub Pages hosting.

## Dependencies
- Benefits from `01-shareable-permalinks.md` and `02-review-snapshots.md`, but can define the manifest independently.
