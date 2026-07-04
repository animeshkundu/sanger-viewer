# Next killer features beyond v1.0 (research-grounded)

Date: 2026-07-04

## 1) Scope and method

This report proposes **post-v1.0** features only. v1.0/near-v1.0 scope already covers: permalinks, batch queue, durable sessions, reference context, contig assembly/review, reference alignment, variant calling/review, primer design/Tm, and in-silico PCR ([V1-01]–[V1-10]).

Evidence sources used:
- Competitor docs/pages (SnapGene, Geneious, Benchling, UGENE, Chromas, 4Peaks).
- Bench-scientist pain points from public Q&A/forum-style threads.
- GitHub issues in adjacent Sanger tools (tracy, pearl, CutePeaks, sangerseq_viewer).
- One peer-reviewed methods paper (Tracy) explicitly documenting tool-support gaps.

Scoring model:
- **Need**: 1–5 (frequency + severity of pain in sources)
- **Feasibility**: 1–5 (fit to browser/client-side architecture)
- **Need × Feasibility** used for ranking.

## 2) Candidate features (8) with evidence and validation

| Rank | Candidate feature (post-v1.0) | Need | Feasibility | Score | Effort |
|---|---|---:|---:|---:|---|
| 1 | Plasmid map + restriction overlay linked to trace evidence | 5 | 4 | 20 | M-L |
| 2 | Manual assembly controls (strand override + overlap/fracmatch tuning) | 5 | 4 | 20 | M |
| 3 | Multi-trace synchronized stacked viewer (clone-screen mode) | 5 | 3 | 15 | L |
| 4 | Artifact-aware basecalling resilience (dye-blob handling + missing-basecall fallback) | 5 | 3 | 15 | L |
| 5 | One-click BLAST from selected sequence with provenance panel | 4 | 5 | 20 | S-M |
| 6 | Heterozygous-indel assistant (peak-ratio + homopolymer warnings) | 4 | 3 | 12 | M |
| 7 | Automated clone-screening report (batch pass/fail + mismatch summary) | 4 | 4 | 16 | M |
| 8 | Functional/clinical variant annotation overlay (VEP-backed, optional online mode) | 3 | 3 | 9 | M-L |

### 2.1 Plasmid map + restriction overlay linked to trace evidence

1) **Concrete user need + evidence**  
Plasmid verification is a core Sanger workflow. Competitors market plasmid-map and restriction-centric views as key value: SnapGene highlights plasmid feature visualization plus enzyme sites and reference alignment/contig assembly; Geneious and ChromasPro similarly emphasize plasmid/molecular-cloning context and restriction mapping ([C1], [C3], [C6]).  

2) **Incumbent gap**  
Strong implementations are mostly desktop, install-first, and often paid/subscription-gated (SnapGene/Geneious/ChromasPro), while Chromas free is Windows-only and explicitly pushes multi-read assembly users to ChromasPro ([C2], [C4], [C6]).  

3) **Client-side feasibility + rough effort**  
Feasible with SVG/Canvas circular map rendering from imported reference annotations and local restriction-enzyme lookup (no server dependency). Effort **M-L**.

4) **Score rationale**  
Need 5 (ubiquitous cloning/plasmid workflow in competitor positioning), Feasibility 4 (pure client-side rendering/calculation).

### 2.2 Manual assembly controls (strand override + overlap/fracmatch tuning)

1) **Concrete user need + evidence**  
Users report incorrect auto strand assignment and explicitly request manual direction controls; users also ask for overlap parameter control in consensus workflows ([G5], [G4]).

2) **Incumbent gap**  
Auto-only CLI/web assembly flows can produce wrong orientation/consensus without interactive correction controls ([G5], [G4]).

3) **Client-side feasibility + rough effort**  
High fit to existing browser assembly UX: add per-read strand toggles and overlap thresholds, with live preview. Effort **M**.

4) **Score rationale**  
Need 5 (direct user-reported correctness blocker), Feasibility 4 (UI+parameter plumbing, no backend).

### 2.3 Multi-trace synchronized stacked viewer (clone-screen mode)

1) **Concrete user need + evidence**  
CutePeaks has a long-open request for “multi ab1 view” and aligned multi-file display; Tracy paper notes manual inspection of many traces with limited tooling support in large validation settings ([G6], [P1]).

2) **Incumbent gap**  
Single-trace-first tools increase manual switching overhead for clone screens; free tools have long-standing unresolved requests ([G6], [P1]).

3) **Client-side feasibility + rough effort**  
Feasible using synchronized scrolling across multiple trace canvases + shared coordinate ruler. Effort **L** due to performance/UX complexity.

4) **Score rationale**  
Need 5 (high-throughput validation pain), Feasibility 3 (rendering/perf complexity).

### 2.4 Artifact-aware basecalling resilience (dye-blob handling + missing-basecall fallback)

1) **Concrete user need + evidence**  
Recent Tracy issue describes dye-blob artifacts (10–20× signal spikes) causing N-only outputs; CutePeaks issue documents AB1 files missing PBAS/PLOC/PCON where fallback basecalling is needed ([G2], [G8]).

2) **Incumbent gap**  
Current tools can fail hard on local artifacts or incomplete AB1 metadata, forcing custom scripts/manual workarounds ([G2], [G8]).

3) **Client-side feasibility + rough effort**  
Feasible with local sliding-window normalization/peak calling in JS/WASM and UI region flagging. Effort **L**.

4) **Score rationale**  
Need 5 (analysis can fail completely), Feasibility 3 (algorithmic complexity but still local-compute friendly).

### 2.5 One-click BLAST from selected sequence with provenance panel

1) **Concrete user need + evidence**  
Users request BLAST launch directly from trace tools (CutePeaks issue), and forum users explicitly ask whether/when to BLAST for Sanger troubleshooting ([G7], [F1]). 4Peaks markets quick BLAST from the trace workflow ([C8]).

2) **Incumbent gap**  
Flow is often context-switch heavy (copy/paste to external tools) or inconsistent across platforms/tools ([G7], [C8]).

3) **Client-side feasibility + rough effort**  
Very feasible: generate NCBI BLAST query URL or optional API workflow, track query metadata locally. Effort **S-M**.

4) **Score rationale**  
Need 4 (common downstream action), Feasibility 5 (minimal backend dependency if URL-based flow).

### 2.6 Heterozygous-indel assistant (peak-ratio + homopolymer warnings)

1) **Concrete user need + evidence**  
Forum guidance for indel interpretation emphasizes ~50% signal drop heuristics for true heterozygous events and warns homopolymers degrade read quality; users ask this repeatedly in practical troubleshooting threads ([F1]).

2) **Incumbent gap**  
Heuristics are often expert knowledge, not surfaced as guided UI checks in free tools ([F1]).

3) **Client-side feasibility + rough effort**  
Feasible with peak-ratio calculators, homopolymer run detection, and confidence hints over existing quality tracks. Effort **M**.

4) **Score rationale**  
Need 4 (frequent interpretation pain), Feasibility 3 (requires careful threshold UX and false-positive handling).

### 2.7 Automated clone-screening report (batch pass/fail + mismatch summary)

1) **Concrete user need + evidence**  
Tracy paper explicitly states many validation efforts still require manual chromatogram analysis with limited support; competitors sell batch operations and structured documentation as productivity value ([P1], [C1], [C6]).

2) **Incumbent gap**  
Desktop incumbents provide reporting/history but with install/license/platform constraints; lightweight free tools often stop at per-file inspection ([C2], [C4], [C6]).

3) **Client-side feasibility + rough effort**  
Feasible in-browser by aggregating existing per-trace metrics and exporting CSV/HTML report bundles locally. Effort **M**.

4) **Score rationale**  
Need 4 (high-throughput labs), Feasibility 4 (mostly aggregation/export UX).

### 2.8 Functional/clinical variant annotation overlay (VEP-backed, optional online mode)

1) **Concrete user need + evidence**  
PS Analyzer positions VEP integration and clinical report outputs as key differentiators in Sanger analysis workflows ([G9]).

2) **Incumbent gap**  
Core Sanger viewers frequently stop at raw variant detection/review, not consequence interpretation in-context (supported by v1.0 spec non-goal for clinical interpretation in this repo, [V1-08]).

3) **Client-side feasibility + rough effort**  
Feasible as optional external-annotation mode (user-consented API requests), while preserving default client-side-private local analysis path. Effort **M-L**.

4) **Score rationale**  
Need 3 (important but narrower audience than plasmid/assembly workflows), Feasibility 3 (external API integration, consent/privacy UX needed).

## 3) Recommended TOP 3 for the next build wave

### Top 1 — Plasmid map + restriction overlay linked to traces
Why now: Highest practical impact for cloning verification; clear competitor benchmark; strong browser-native differentiation when delivered with zero install + local-private processing + shareable state ([C1], [C2], [C6]).

### Top 2 — Manual assembly controls (strand override + overlap tuning)
Why now: Directly addresses correctness blockers repeatedly reported by users in adjacent tools; relatively contained engineering effort versus algorithm-heavy new callers ([G5], [G4]).

### Top 3 — Multi-trace synchronized stacked viewer (clone-screen mode)
Why now: Converts sanger-viewer from single-sample analysis to throughput workflow support, matching real bench validation patterns cited in literature and open issues ([G6], [P1]).

## 4) Assumptions and confidence notes

- **A1 (explicit assumption):** BLAST API/rate-limit constraints may require fallback to “open prefilled BLAST URL” mode instead of full inline parsing for reliability.  
- **A2 (explicit assumption):** Clinical annotation should be opt-in online enrichment to preserve default client-side-private promise.  
- **A3 (explicit assumption):** Benchling Sanger-specific depth is partially opaque without authenticated docs; this report only uses publicly accessible “cloud-based notebook/platform” statements ([C5]).

## 5) Source index

### Current repository scope (v1 exclusions)
- **[V1-01]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/01-shareable-permalinks.md  
- **[V1-02]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/02-batch-import-review-queue.md  
- **[V1-03]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/03-session-workspaces.md  
- **[V1-04]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/04-reference-record-context.md  
- **[V1-05]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/05-paired-read-contig-assembly.md  
- **[V1-06]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/06-contig-review-disagreement-resolution.md  
- **[V1-07]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/07-reference-alignment.md  
- **[V1-08]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/08-variant-calling-review.md  
- **[V1-09]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/09-primer-design-and-tm.md  
- **[V1-10]** /home/runner/work/sanger-viewer/sanger-viewer/docs/specs/10-in-silico-pcr.md

### Competitor/product sources
- **[C1]** SnapGene features: https://www.snapgene.com/features  
- **[C2]** SnapGene pricing + Viewer mode note: https://www.snapgene.com/pricing  
- **[C3]** Geneious Sanger feature page: https://www.geneious.com/features/sanger-sequence-analysis/  
- **[C4]** Geneious pricing + restricted mode note: https://www.geneious.com/pricing/  
- **[C5]** Benchling homepage (“collaborative, cloud-based notebook”): https://www.benchling.com/  
- **[C6]** Chromas page (free, Windows, no assembly; points to ChromasPro): https://technelysium.com.au/wp/chromas/  
- **[C7]** ChromasPro page (assembly, restriction maps, trial/license): https://technelysium.com.au/wp/chromaspro/  
- **[C8]** 4Peaks page (Mac app, BLAST, PDF, trace editing): https://nucleobytes.com/4peaks/index.html  
- **[C9]** UGENE downloads/source (desktop packages, GPL/source): https://www.ugene.net/download-all.html

### Forum / Q&A evidence
- **[F1]** Bioinformatics StackExchange indel interpretation thread (50% peak-drop heuristic, homopolymer warning): https://bioinformatics.stackexchange.com/questions/6672/identifying-indels-from-chromatograms  

### GitHub issue evidence (adjacent tools)
- **[G2]** tracy #116 dye-blob artifact/basecalling failure: https://github.com/gear-genomics/tracy/issues/116  
- **[G3]** tracy #98 circular-origin alignment request: https://github.com/gear-genomics/tracy/issues/98  
- **[G4]** tracy #85 consensus overlap control request: https://github.com/gear-genomics/tracy/issues/85  
- **[G5]** pearl #14 manual forward/reverse direction control request: https://github.com/gear-genomics/pearl/issues/14  
- **[G6]** CutePeaks #31 multi-ab1 aligned view request: https://github.com/labsquare/CutePeaks/issues/31  
- **[G7]** CutePeaks #14 BLAST option request: https://github.com/labsquare/CutePeaks/issues/14  
- **[G8]** CutePeaks #50 fallback basecalling when AB1 PBAS/PLOC missing: https://github.com/labsquare/CutePeaks/issues/50  
- **[G9]** PS Analyzer README (VEP integration/local-first positioning): https://github.com/lagosproject/ps-analyzer/blob/main/README.md  
- **[G10]** sangerseq_viewer #2 circular-origin alignment failure report: https://github.com/ponnhide/sangerseq_viewer/issues/2

### Peer-reviewed paper
- **[P1]** Tracy paper (BMC Genomics, 2020): https://doi.org/10.1186/s12864-020-6635-8  
  (Background explicitly notes lack of user-friendly web tools and manual chromatogram analysis burden in large validation workflows.)
