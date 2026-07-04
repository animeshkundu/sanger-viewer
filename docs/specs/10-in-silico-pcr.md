# 10 — In-silico PCR

## Summary
Add an in-silico PCR workflow that tests a primer pair against a user-supplied reference, predicts the expected amplicon, and connects that expectation to observed Sanger reads.

## Why this is a differentiator
This closes the loop between assay design and trace interpretation. Users can validate whether the experiment should have produced the read they are seeing and whether a failed read might come from an incorrect target or primer pairing problem.

## Current baseline
The app has no assay simulation or expected-amplicon concept today.

## Goals
- Predict amplicons from a primer pair and a reference sequence.
- Show expected product size, orientation, and sequence.
- Link predicted products to aligned traces and contigs.

## Non-goals
- No whole-genome off-target enumeration at internet scale.
- No unsupported claims about wet-lab yield or efficiency.

## User workflows
1. User selects a forward and reverse primer pair.
2. User chooses a reference sequence.
3. App finds compatible binding sites and predicts one or more amplicons.
4. User compares the expected product with actual traces or a reviewed contig.
5. User exports the assay summary for lab records.

## Spec
### Input model
- forward primer
- reverse primer
- reference sequence
- optional mismatch tolerance setting
- optional expected size range

### Product prediction behavior
- Search both strands for primer binding candidates.
- Allow a small configurable mismatch tolerance, with strict defaults.
- Rank products by primer compatibility and mismatch burden.
- Mark the primary expected amplicon and any secondary candidate products.

### Product record
- `productId`
- `referenceId`
- `forwardPrimerId`
- `reversePrimerId`
- `forwardSite`
- `reverseSite`
- `strand`
- `ampliconLength`
- `productSequence`
- `warningFlags[]`

### UX
- Assay builder fed directly from the primer workspace.
- Product list with size, site, and warning summary.
- Reference view overlay for primer sites and amplicon span.
- Compare mode that shows predicted amplicon versus trace/contig alignment coverage.

### Output
- amplicon FASTA
- assay summary JSON/CSV
- reusable handoff into reference alignment as an expected target region

## Acceptance criteria
- A primer pair and reference can produce predicted amplicons entirely client-side.
- Multiple candidate products are visible when specificity is imperfect.
- Predicted amplicons link into downstream alignment and review flows.
- Exported assay summaries capture primer inputs, chosen settings, and product warnings.

## Parallel build slices
1. Primer-site search engine.
2. Product ranking and record model.
3. Assay builder and product UI.
4. Alignment handoff and exports.

## Dependencies
- Depends on primer records.
- Becomes especially useful once reference alignment is available.
