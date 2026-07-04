# Batch processing and session workspace

## Why this matters

Legacy Sanger tools win on throughput because they let users churn through dozens of files and resume work later. A superior browser-native workspace needs both: batch-scale handling and durable session continuity.

## Product outcome

Add a persistent client-side workspace that can ingest many traces, track per-sample status, survive reloads, and batch-export downstream outputs without giving up the fast single-trace review flow.

## Scope

### In scope

- Multi-file import with background parsing and visible progress.
- Persistent session state stored locally in the browser.
- Batch table for sample status, trim state, alignment/assembly status, and review flags.
- Saved/recent sessions with reopen, duplicate, rename, export, and delete actions.
- Batch export of sequences, reports, and images from reviewed items.

### Out of scope

- Multi-user shared projects.
- Backend sync or cloud accounts.
- Laboratory information management features beyond lightweight sample metadata.

## Primary user workflows

1. A user drags in a plate’s worth of AB1/SCF files and watches them parse in the background.
2. The app groups files into a session, shows ready/error/review-needed states, and lets the user filter to what matters.
3. The user closes the browser, returns later, and resumes the same session with tabs, edits, and analysis artifacts intact.
4. The user batch-exports reviewed outputs for all passing samples or a filtered subset.

## UX specification

### Workspace shell

- Persistent session switcher in the global bar.
- Batch drawer/table with sortable columns:
  - sample/read name
  - file type
  - parse status
  - trim status
  - assembly/reference status
  - unresolved issues
  - last reviewed timestamp

### Session actions

- **New session**
- **Resume recent**
- **Rename**
- **Duplicate**
- **Export session**
- **Delete local session**

### Batch actions

- **Run trim on selected**
- **Assemble grouped reads**
- **Align selected to reference**
- **Export selected**
- **Mark reviewed / needs follow-up**

## Data and persistence model

### Local persistence

- IndexedDB stores uploaded binaries, parsed summaries, derived analysis artifacts, and workspace state.
- Lightweight local settings live separately so large sessions do not depend on one monolithic blob.

### Session structure

- Session metadata
- asset inventory
- workspace slot state
- analysis results
- review flags and notes
- export history summary

### Recovery rules

- On app start, restore the most recent unfinished session unless the user opts out.
- If stored binaries are missing or corrupted, salvage remaining metadata and mark affected items explicitly.

## Implementation shape

### Slice 1 — Persistence layer

- Add IndexedDB-backed asset/session storage and recovery logic.

### Slice 2 — Batch ingest and status model

- Add parser queue, progress UI, and per-item state tracking.

### Slice 3 — Session manager UI

- Add recent sessions, resume/delete/export controls, and session naming.

### Slice 4 — Batch actions and exports

- Connect trim/assembly/alignment/export operations to filtered selections.

## Validation requirements

- Reloading the page restores the active session without data loss.
- Large imports remain responsive and visibly progressive.
- Deleting a session removes local binaries and derived state cleanly.
- Batch actions report partial failures per item rather than aborting silently.

## Acceptance criteria

- A user can ingest many traces, review them across sessions, and resume work later entirely client-side.
- Local persistence is durable enough for normal browser restarts and refreshes.
- Batch-level visibility makes it obvious which samples are done, blocked, or still need review.
- Batch export works on filtered subsets and reflects the latest edits/analysis state.

## Non-goals and risks

- Browser storage quotas vary; the UX must surface available-space failures clearly.
- Very large sessions may require lazy loading and eviction rules for derived artifacts.
- Persistence must preserve privacy expectations because data stays on the user’s machine unless explicitly exported.
