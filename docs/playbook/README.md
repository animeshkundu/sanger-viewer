# Autonomous product operating playbook

## Definition of greatness (verifiable)

A repo is GREAT on the shipping axis only when every claim is externally verifiable by a stranger. The organizing invariant: **version file == git tag == GitHub Release == registry version == CHANGELOG heading == live-site build stamp** — most checkpoints are just cross-checks of this identity.

**Leading vs lagging — the anti-hallucination rule for greatness.** Every checkpoint is either **[LEADING]** (a file/config an agent can add in ONE commit — necessary hygiene, NEVER proof of greatness) or **[LAGGING]** (requires real humans acting over time — response times, repeat contributors, dependents, retained downloads) or **[SOFT]** (real but not deterministically gradeable). An autonomous agent can fabricate every leading artifact while producing zero community. So a repo is GREAT only when at least one LAGGING signal has actually MOVED — not when the leading boxes are merely ticked. Never treat file-presence as evidence of community, adoption, or trust.

## Universal core (every repo)
- **Branch protection via a ruleset** [LEADING] on the default branch: required checks (lint + typecheck + test + build) green, strict (up-to-date), ≥1 review, linear history, conversation resolution. Verify: `gh api repos/$R/rules/branches/main`.
- **Matrix CI** [LEADING] (OS × version) green on the default branch; gate on a synthetic all-green job that `needs:` every matrix cell. Verify: `gh api repos/$R/commits/main/check-runs --jq '[.check_runs[].conclusion]|unique'` == `["success"]`.
- **Supply-chain security** [LEADING]: CodeQL + Dependabot (deps + security + `github-actions`) + secret scanning + push protection on, low/zero open alerts; OpenSSF Scorecard published. Verify: `gh api repos/$R/code-scanning/alerts?state=open`, `.../dependabot/alerts?state=open`, `api.scorecard.dev/projects/github.com/$R`.
- **Security DISCLOSURE posture** [LEADING] (distinct from build hardening): `SECURITY.md` with a disclosure channel + response SLA; GitHub Private Vulnerability Reporting enabled; `/.well-known/security.txt` (RFC 9116) served on the site; an **OpenSSF Best Practices badge** (passing → silver → gold; state is API-readable at bestpractices.openssf.org). [LAGGING] a real advisory/CVE track record + time-to-patch.
- **Workflow hygiene** [LEADING]: `permissions:` least-privilege (default `contents: read`, escalate per-job); every `uses:` pinned to a 40-char SHA; reproducible installs (lockfile + `npm ci`/`--frozen`/`--require-hashes`). Flaky tests QUARANTINED (`continue-on-error`, non-required, tracked as issues) — never retried-until-green.
- **Safe to depend on** [LEADING/verifiable]: a written deprecation/stability/support-window policy + an **API-breaking-change CI gate** (`cargo-semver-checks` / `@microsoft/api-extractor` / `japicmp`) that fails a PR on an undeclared breaking change; migration guides for majors. [LAGGING] unplanned breaking releases trend to ~0.
- **Docs that TEACH, not just rank** [LEADING/verifiable]: Diataxis structure (tutorial / how-to / reference / explanation) + a generated **API reference** + **examples EXECUTED in CI** (doctest / tested code fences — the one docs check that resists rot); a `<5-min` time-to-first-success smoke test from a clean container. [SOFT] whether the quickstart is genuinely clear.
- **Legal & provenance** [LEADING/verifiable]: REUSE/SPDX headers (`reuse lint`), DCO or CLA enforced on PRs, a dependency-license scan in CI, correct `NOTICE`/attribution; `actions/attest-build-provenance` on release artifacts (SLSA Build L3) — verify `gh attestation verify <artifact> --repo $R`.
- **Quality beyond green CI** [LEADING, gate ONLY when the surface applies]: OSS-Fuzz (parsers / security-sensitive), a perf-regression gate (hot paths), accessibility CI (axe-core / Lighthouse a11y ≥ target) for any UI, i18n wired. Track mutation-testing score (Stryker / `cargo-mutants`) — do NOT hard-gate a raw coverage %.
- **Releases** [LEADING]: SemVer single-sourced; **Keep a Changelog** `CHANGELOG.md` (dated, `[Unreleased]`); tagged **GitHub Releases** with generated notes; release automation (release-please / semantic-release). Verify: `gh release view vX.Y.Z --json tagName,isLatest,body,assets`.
- **README media** [LEADING]: theme-adaptive hero (`<picture>`/`#gh-dark-mode-only`) + a demo (GIF / asciinema / linked video) + alt text on every image; repo social-preview set. Verify: `grep` the README + `curl -I` the assets return image 200.

## Community, sustainability & trust (Pillar C — the contributor funnel + who keeps it alive)
Great OSS is a project other humans JOIN, TRUST, and SUSTAIN — not just a well-shipped artifact. Most of this is LAGGING: measure the trajectory, never the file. A great score here REQUIRES a lagging signal to have moved.
- **Contributor funnel** [LAGGING]: time-to-first-response on new issues/PRs (CHAOSS; healthy ≈ ≤2 business days, a HUMAN not a bot), median PR-merge time, and **repeat-contributor rate** (contributors with ≥2 contributions across periods) — the real "is the onramp working" signal. [LEADING] `CONTRIBUTING.md` / `CODE_OF_CONDUCT.md` / `SUPPORT.md` / `CODEOWNERS` / issue + PR templates present (`gh api repos/$R/community/profile`) + good-first-issue / help-wanted labels — a HYGIENE FLOOR only, never proof.
- **Sustainability & governance** [LEADING] `.github/FUNDING.yml`, `GOVERNANCE.md`/`MAINTAINERS.md`, `ADOPTERS.md`; [LAGGING] **Contributor Absence Factor** (bus-factor: min contributors making 50% of contributions) ≥ 2–3, **committers from ≥2 organizations** (CNCF graduated bar), ≥3 real adopters, and **liveness** — recent last-commit / last-release on a predictable cadence (abandonment is the most common death).
- **Adoption verdict** [LAGGING]: **dependents / "Used by" count** (dependency-graph API — the un-fakeable adoption signal funders use), retained-download trend (not a launch-day spike), third-party integrations/tutorials, issue-to-star ratio (stars alone are vanity).

## By final destination (detect from the repo root)
- **Web app / docs → GitHub Pages** (`build_type == "workflow"`, auto-deploy on merge, protected `github-pages` env):
  - **Live-content proof:** stamp `_site/BUILD_SHA.txt`; the live edge must serve it — `curl -fsSL "$SITE/BUILD_SHA.txt?cb=$(date +%s)"` == `git rev-parse HEAD`.
  - **Google-discoverable SEO:** `sitemap.xml` + `robots.txt` (with `Sitemap:`) + self-referential `rel=canonical` + no accidental noindex (custom `404.html` gets `meta robots noindex`); full **OG + Twitter cards** + **JSON-LD `SoftwareApplication`** (+ `WebSite`/`BreadcrumbList`); **Lighthouse SEO ≥ 0.90**; **Core Web Vitals** LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1; HTTPS enforced + correct custom-domain DNS; **Search Console** verified + sitemap submitted + IndexNow ping from the deploy. og-image 1200×630 returns 200. Verify via `curl`/`lighthouse`/PageSpeed API.
  - Content targeting real developer queries (error strings, "X vs Y", tutorials), dated changelog.
- **JS library / CLI → npm:** OIDC Trusted Publishing (`id-token: write`, `--provenance`, NO `NPM_TOKEN`). Verify: `npm view <pkg> version`, `npm install <pkg>`, `npm audit signatures`.
- **Python → PyPI:** Trusted Publisher (`pypa/gh-action-pypi-publish`, `environment: pypi`, no token) + PEP 740 attestation. Verify: `pip install <pkg>==X.Y.Z`.
- **Rust → crates.io:** Trusted Publishing (`rust-lang/crates-io-auth-action`; first publish manual). Verify: `cargo add <crate>@X.Y.Z`.
- **Service / container → GHCR:** multi-arch + `provenance: true` + `sbom: true` + keyless cosign. Verify: `cosign verify` + `verify-attestation` + `docker pull`.
- **GitHub Action → Marketplace:** complete `action.yml` + a floating major tag (`v1`). Verify: `uses: owner/action@v1` resolves; listed publicly.
- **Go module → proxy (tag-driven):** tag `vX.Y.Z` (`/vN` in the module path for major ≥ 2). Verify: `go install ...@vX.Y.Z`; `proxy.golang.org`/`sum.golang.org` have it.

## Publish pipeline (final destination)
End to end: reusable build+test (`workflow_call`) → release automation → tag + GitHub Release → `on: release: published` publish jobs, EACH behind its own protected environment + OIDC (no long-lived tokens) → provenance attestation on every artifact. Gate same-workflow steps with `needs:`; use protected environments + required reviewers so "push to main" becomes "a human approves" while auth stays tokenless. NEVER `pull_request_target` to check out untrusted fork code.

## UI/UX excellence, VERIFIED BY BROWSING (Pillar D — every user-viewable surface, proven by VIEWING the rendered result, never guessed from code)
Governing rule: NEVER infer UI/UX quality from source, markdown, or a returned 200 — DRIVE the running artifact in a real browser (`mcp__browser__*` / Playwright), capture the actual pixels at real viewports (375/768/1280+), light+dark + reduced-motion, walk the real flows, and judge THOSE pixels. Applies to EVERY surface a human sees: the product UI, the README as GitHub RENDERS it, the live Pages site, the docs, the rendered Release page, the social/og share-card as it appears when shared, and the 404. This UPGRADES the curl/grep "README media" + a11y checks above from "the asset exists / a score passed" to "the rendered result was viewed." A captured screenshot proves a state was rendered and viewed, NOT that it is good. No LAGGING item here — the lagging proof of frictionless UX is the activation / time-to-first-value / retention curve in the outcome bar; Pillar D is the LEADING craft that de-risks it.
- **State matrix captured** [LEADING]: every key screen driven through ALL states — empty, loading/skeleton, error, success, first-run/onboarding, partial, edge/overflow (long text, huge/tiny data) — at mobile 375 / tablet 768 / desktop 1280+ × light+dark. Verify: a Playwright spec drives + screenshots each cell, run green.
- **Visual-regression baselines** [LEADING]: `expect(page).toHaveScreenshot()` goldens committed + green in CI (any unintended pixel change fails), render env pinned. Green proves NO CHANGE from a BLESSED baseline, not beauty.
- **Accessibility gate** [LEADING]: `@axe-core/playwright` ZERO serious/critical on each key screen AND state; keyboard reaches every control with a visible focus indicator; pointer targets ≥ 24×24 CSS px (WCAG 2.2 SC 2.5.8 / 2.4.11 / 2.4.13). axe catches ~57% of issues by volume — a floor, not "accessible."
- **Contrast + dark-mode + reduced-motion** [LEADING]: text contrast ≥ 4.5:1 (≥ 3:1 large text / UI) measured from the rendered result; a REAL `prefers-color-scheme` dark theme (not inverted) and `prefers-reduced-motion` (animation actually suppressed), captured via `page.emulateMedia`. WCAG 2.2 SC 1.4.3.
- **CWV + Lighthouse budgets** [LEADING, web surfaces]: LCP ≤ 2.5s / INP ≤ 200ms / CLS ≤ 0.1 (75th pct); Lighthouse Perf/A11y/Best-Practices/SEO ≥ 0.90 asserted in CI (Lighthouse CI). Perf ≠ flow friction — a floor.
- **Rendered README as GitHub shows it** [LEADING]: `mcp__browser__navigate` the repo page + screenshot the RENDERED README in light AND dark — every image/badge loads (no broken-image glyph), theme-adaptive `<picture>` swaps, relative links resolve, no raw-markdown artifacts. A 200 proves reachable, not that the hero reads well.
- **Rendered Pages / docs / Release / og share-card** [LEADING]: each published surface DRIVEN + screenshotted at its real URL — live Pages + docs (nav works, no overflow, consistent chrome), the latest Release page (notes render, links 200), the share-card (og:image exactly 1200×630 or social-preview 1280×640, returns 200, text legible when actually rendered).
- **Is it beautiful, elegant, professional, frictionless?** [SOFT/advisory]: an LLM vision rubric scores the REAL screenshots (never the code) on visual hierarchy, spacing rhythm, type/readability, restrained palette, alignment/grid, consistency, motion-with-purpose, and whether each state genuinely helps (empty guides the next action; error is plain-language + recovery; onboarding lands the aha < 5 min). Cite the exact screenshot per finding. Record as ADVISORY evidence with the images — NEVER a verified checkmark or greatness box-tick.
Anti-cargo-cult (do NOT fake a check): a screenshot file existing, a green `toHaveScreenshot` over an unreviewed baseline, an axe pass on only the happy path, a `<meta viewport>` tag, or a passing CWV score are NECESSARY floors, NOT proof of a beautiful, frictionless UI. The only honest proofs are the deterministic gates (each for its property) and the advisory rubric over real pixels, labeled advisory.

## Soft signals & anti-cargo-cult (do NOT fake a checkmark, do NOT hard-gate)
SEO indexing/ranking is never guaranteed by Google; E-E-A-T/content quality has no exposed score. Proxy via byline/last-updated presence, content architecture, and (with auth) Search Console Performance — record as evidence, not a binary pass. Do NOT hard-gate raw test-coverage %, raw star count, "has a Discord", Diataxis "compliance" as a box-tick, or any `community/profile` file-presence number treated as evidence of community — taken as proof of greatness these ARE the hallucinated-progress trap. The intangibles that separate LOVED from merely-functional — a clear vision/opinion, DX that delights, great error messages, brand/name/story, a maintainer who cares — are real but SOFT: estimate them with an advisory rubric and label the score advisory, never verified.

Run the phases in order. A phase exits only on its externally verifiable checkpoint. Store source links, raw counts, command output, analytics queries, and decisions in issues, plans, research, ADRs, or PRs so another operator can audit the claim.

## Phase 0 — Discover

- Interview people at a concrete struggling moment. Capture the trigger, prior behavior, forces pushing and pulling change, current workaround, and the criteria that would make them hire or fire a solution.
- Mine support threads, issues, communities, searches, and observed workflows for the same job. Separate a repeated behavior from a stated preference.
- Treat pain as real only after at least three independent sources corroborate the same struggling moment and consequence.
- Write the first falsifiable hypothesis and the cheapest test that could disprove it.

Decision criteria: the job is specific, consequential, recurrent, and currently served by a workaround people can describe. Otherwise continue discovery or stop.

Exit checkpoint: an evidence ledger links at least three independent corroborating sources, verbatim hire/fire criteria, and a named owner who can reproduce the evidence.

## Phase 1 — Niche

- Segment candidate customers with Disciplined Entrepreneurship criteria: common job, purchasing process, reachability, urgency, switching friction, competition, and ability to become a reference.
- Estimate a credible path to a 1,000 true-fans floor. Do not use total-addressable-market theater as a substitute for reachable people.
- Run a distribution test in the channels where each segment already gathers before building for it.
- Publish the go/no-go table and select one beachhead.

| Candidate | Urgent job | Reachable now | Will switch/pay | Weak alternatives | Founder advantage | 1,000-fan path | Go/no-go |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <!-- segment --> | <!-- evidence --> | <!-- channel/test --> | <!-- evidence --> | <!-- alternatives --> | <!-- evidence --> | <!-- estimate --> | <!-- decision --> |

Decision criteria: go only when the niche is reachable, has the repeated job from Phase 0, and passes a real distribution test. Kill or narrow otherwise.

Exit checkpoint: the completed table links observed channel responses and names one beachhead; a reviewer can recount real prospects reached and responses received.

## Phase 2 — Position

Apply the Obviously Awesome sequence:

1. List competitive alternatives.
2. Include doing nothing and the status-quo workaround.
3. Identify unique attributes.
4. Translate attributes into customer value.
5. Prove the value with evidence.
6. Identify customers who care most.
7. Choose the market category that makes the value obvious.
8. Add only trends that strengthen relevance.
9. Align product, sales, and marketing language.
10. Test the positioning with beachhead prospects and revise.

| Competitive alternative | Why it is hired now | Where it fails the job | Our differentiated value | Proof |
| --- | --- | --- | --- | --- |
| Do nothing / tolerate it | <!-- reason --> | <!-- cost --> | <!-- value --> | <!-- evidence --> |
| Manual workaround | <!-- reason --> | <!-- cost --> | <!-- value --> | <!-- evidence --> |

One-sentence pitch: For [beachhead] who struggle with [job], [product] is a [category] that [primary value], unlike [main alternative], because [proof-backed differentiator].

Decision criteria: a prospect in the beachhead can accurately repeat who it is for, why it matters, and why the status quo is worse.

Exit checkpoint: recorded or written tests with real beachhead prospects show the pitch was understood without explanation; store the sample size and exact responses.

## Phase 3 — Scope

- Rank assumptions by impact and uncertainty. Design a Riskiest-Assumption Test before implementation.
- Set the numeric kill, pivot, and continue thresholds before collecting results; never move the threshold after seeing data.
- Classify scope with Kano: must-be, performance, and delight. Include every true must-be, the minimum performance needed for the job, and at least one memorable delight.
- Define the aha moment and instrument a path to time-to-first-value under five minutes.
- Freeze a v0.1 cut list. New requests replace an item or wait; they do not silently expand scope.

Decision criteria: the cheapest test clears its pre-set threshold and the cut list can deliver the job end-to-end without speculative platform work.

Exit checkpoint: the repository contains the dated experiment, raw result, threshold decision, instrumented aha event, and frozen v0.1 cut list approved in a plan or issue.

## Phase 4 — Build

- Record every non-trivial architecture or long-lived process decision in an ADR. Prefer radical simplicity.
- Use trunk-based development, short-lived branches, and feature flags for incomplete or reversible exposure.
- Apply the test pyramid: many fast unit checks, focused integration checks, and few critical end-to-end journeys.
- Ship through CI/CD and track all DORA four keys. Speed and stability improve together; do not trade one away by weakening checks.
- Make APIs and developer experience Stripe-grade: coherent names, actionable errors, stable contracts, safe defaults, copy-paste examples.
- Write Diataxis tutorials, how-to guides, reference, and explanation. Time the quickstart from a cold machine and keep it under five minutes.
- Enforce WCAG 2.2 AA and Core Web Vitals budgets in CI. Defaults must just work.
- Verify every user-viewable surface BY BROWSING, never by guessing from code. Drive the running artifact through each state (empty / loading / error / success / first-run / edge) at 375 / 768 / 1280 x light+dark, screenshot the actual pixels, critique them against a professional bar (visual hierarchy, spacing rhythm, type/readability, restrained palette, alignment, motion-with-purpose, and whether each state genuinely helps), fix the top defects at the design-system level, then re-drive and re-capture until the vision rubric is clean and the deterministic gates are green (visual-regression `toHaveScreenshot`, `@axe-core/playwright` zero serious/critical, contrast, CWV). Commit the baselines so polish cannot silently regress.

Decision criteria: the frozen cut list works as one coherent journey and every quality budget has executable or observed evidence.

Exit checkpoint: required CI is green; a cold-start recording/log reaches first value in under five minutes; a real deployment returns HTTP 200; accessibility and Web Vitals reports meet their budgets; the state-matrix Playwright screenshots + visual-regression baselines are committed and green, axe reports zero serious/critical, and the UI was judged from the rendered pixels, not the source.

## Phase 5 — Launch

- Turn the README into the landing page: the beachhead job, proof, five-minute quickstart, examples, limits, and next action above internal architecture detail.
- Publish the GitHub Pages site and complete the Diataxis documentation. Treat docs as marketing because they let prospects experience competence before adoption.
- Launch first where the beachhead persona already lives. Sequence, do not spray: Show HN for Hacker News builders, dev.to for developer education, Product Hunt for its discovery audience, and build-in-public for communities already following the problem.
- Give each channel a channel-native artifact and measurable activation link. Respond to questions and capture objections as discovery input.
- Verify every launch surface as it actually RENDERS, never from markdown or a 200: browse the repo page and screenshot the rendered README in light AND dark (every image/badge loads, the theme-adaptive hero swaps, relative links resolve, no raw-markdown artifacts), the live Pages site and docs (nav works, no overflow), the latest Release page (notes render, links resolve), and the og / social share-card (1200x630, legible when shared). Fix whatever looks off, re-capture, and only then call it launched.

Decision criteria: launch traffic reaches the instrumented aha path and produces conversations or usage from the selected beachhead, not merely impressions.

Exit checkpoint: public URLs return HTTP 200; channel posts are live; analytics record real visitors reaching or failing the aha event; support responses and objections are linked; the rendered README, Pages, docs, Release page, and og-card were driven + screenshotted and read well, not merely reachable.

## Phase 6 — Measure

- Define AARRR with explicit events. Stars and impressions are acquisition signals, never activation.
- Measure the aha moment and median/p90 time-to-first-value; target under five minutes.
- Run the Sean Ellis test with a reported sample size and segment: at least 40% must answer "very disappointed".
- Plot cohort retention over a relevant product interval and require the curve to flatten. The Sean Ellis result and retention shape are both required for a product-market-fit claim.
- Compare outcomes to the pre-registered hypothesis and threshold, including negative results.

Decision criteria: continue only from observed behavior. Strong survey sentiment without retention, or retention without strong dependence, is promising evidence but not product-market fit.

Exit checkpoint: an auditable dashboard/export contains activation, time-to-first-value, AARRR, Sean Ellis responses with real N, and cohort retention; the PMF conclusion cites both required tests.

## Phase 7 — Iterate

- Build a weekly opportunity-solution tree from interviews, support, issues, lost users, and behavioral data: outcome → opportunities → solutions → experiments.
- Validate opportunities before solutions. Use RICE only to sequence options that already cleared validation; a high score cannot make an unvalidated idea true.
- Select the next riskiest assumption, pre-register its threshold, run the smallest experiment, and update the tree.
- Publish a changelog entry for every release and close the loop with affected users.

Decision criteria: each iteration traces from external evidence to opportunity to experiment to measured outcome; vanity requests do not bypass the tree.

Exit checkpoint: the dated tree links source evidence, the selected experiment, threshold, measured result, release, and user follow-up.

## Phase 8 — Grow

- Scale only channels that have produced retained and activated users in the beachhead.
- Create shareable-artifact loops where normal product use produces something useful others can see, reuse, or discuss; measure invites and downstream activation, not raw shares.
- Invest in community infrastructure, examples, integrations, and contribution paths that compound trust.
- Use docs as search and education: answer the real job, alternatives, migration questions, and failure modes with proof.
- Expand to adjacent segments one at a time and rerun niche, positioning, activation, and retention checks.

Decision criteria: growth preserves or improves activation and cohort retention and has bounded, approved economics.

Exit checkpoint: cohort and channel reports show incremental retained users, a measured share/referral loop, and acquisition economics within explicit human-approved limits.

## Governance

Daily OODA inside each phase:

1. **Observe:** collect fresh customer, product, delivery, and distribution evidence.
2. **Orient:** compare it with the current job, segment, assumptions, decision log, and constraints.
3. **Decide:** choose one reversible next action against a pre-set threshold; escalate only destructive, regulated, or economically unauthorized actions.
4. **Act:** delegate bounded work, execute, and capture the result.

At phase scale, run Build-Measure-Learn: build the smallest testable artifact, measure externally observable behavior, learn against the threshold, then persist or pivot. Do not enter the next phase until its checkpoint is independently reproducible.

Decision log format:

| Date | Hypothesis | Experiment | Metric | Pre-set threshold | Outcome/evidence | Decision | Owner/next check |
| --- | --- | --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | <!-- falsifiable claim --> | <!-- smallest test --> | <!-- measure --> | <!-- kill/pivot/continue --> | <!-- URL, query, output, real N --> | <!-- result --> | <!-- owner/date --> |

Hard authority limits: no operator may fabricate evidence, manipulate users, incur spend, start paid acquisition, set or change pricing, issue discounts, enter contracts, expand privileges, or make regulated/legal/privacy commitments unless a human has provided explicit boundaries. Within scope, proceed on best judgment and record assumptions rather than pausing for routine clarification.

## Anti-patterns

- **Over-building without distribution:** run a reachability or channel test before extending product scope.
- **Hallucinated progress:** Project Vend and TheAgentCompany-style evaluations show a 70%+ autonomous-task failure base rate; never convert activity or a narrative into completion. Require real HTTP 200 responses, green CI, observed analytics, deployment state, or a real survey N.
- **No distribution plan:** "build it and they will come" is not a plan. Name the beachhead, channel, artifact, owner, and activation event before launch.
- **Manipulation or unbounded economic judgment:** no dark patterns, fabricated scarcity/social proof, undisclosed persuasion, speculative purchases, autonomous pricing, or spend outside human-set limits.
- **Demo equals reality:** a local screenshot or scripted happy path is not a deployed, accessible, observable product. Verify the production journey cold.
- **Viral equals product-market fit:** attention, stars, posts, and shares do not replace the Sean Ellis threshold plus a flattening cohort retention curve.
- **Metrics after the fact:** choosing thresholds after seeing results destroys the test. Pre-register kill, pivot, and continue criteria.

## One-page operating sequence

1. **DISCOVER:** find a struggling moment; require three corroborated sources; log hire/fire criteria.
2. **NICHE:** choose one reachable beachhead with a credible 1,000-fan path; pass a distribution test and go/no-go table.
3. **POSITION:** map do-nothing, workarounds, and competitors; prove differentiated value; test one sentence with real prospects.
4. **SCOPE:** run the riskiest-assumption test against a pre-set threshold; freeze v0.1 with must-be, performance, and at least one delight.
5. **BUILD:** ADRs, trunk/flags, test pyramid, CI/CD and DORA; verify HTTP 200, green CI, five-minute quickstart, WCAG, and Web Vitals.
6. **LAUNCH:** README and docs sell the job; launch sequentially where the beachhead lives; instrument the aha moment.
7. **MEASURE:** AARRR, time-to-first-value, Sean Ellis ≥40% very disappointed, and a flattening retention curve.
8. **ITERATE:** weekly opportunity-solution tree from real evidence; RICE validated options only; thresholded experiments and changelog.
9. **GROW:** scale retained-user channels and shareable-artifact loops within explicit economics.
10. **GOVERN:** OODA daily inside Build-Measure-Learn; log hypothesis → experiment → metric → threshold → outcome; advance only on externally verifiable checkpoints.
