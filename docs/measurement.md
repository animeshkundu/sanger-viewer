# Measurement framework

How we observe whether sanger-viewer is earning real usage, using only
GitHub-native, server-side signals. We never add user telemetry: the app stays
100% client-side and no trace data or analytics beacon ever leaves a visitor's
browser (see the privacy boundary below).

## Aha moment

**First successful trace render.** A visitor reaches value the moment an
`.ab1`/`.scf` file they opened renders as a readable chromatogram on the live
site (<https://animesh.kundus.in/sanger-viewer/>). Everything before that is
setup; everything after is inspection, sharing, and analysis.

Because we run no client analytics, the aha moment is not directly counted. We
proxy it with observable GitHub-native signals and the funnel below, and we
treat a rising ratio of returning visitors to new visitors as evidence that
first-render is landing.

## AARRR funnel (GitHub-native proxies)

| Stage | Question | Observable signal (server-side only) |
| --- | --- | --- |
| Acquisition | Are people finding it? | Repo traffic API **views** and **unique visitors**; **clones** |
| Activation | Do they open the live app? | Live-site opens inferred from referrer views to the Pages path; README quickstart clicks |
| Retention | Do they come back? | **Returning** unique visitors week over week (uniques trend in `docs/metrics/traffic-history.json`) |
| Referral | Do they tell others / contribute? | **Stars**, **forks**, and issues opened via the template chooser |
| Revenue | n/a | Free, MIT, no monetization in scope |

The rolling snapshot in [`docs/metrics/traffic-history.json`](metrics/traffic-history.json)
is appended weekly by [`.github/workflows/traffic-snapshot.yml`](../.github/workflows/traffic-snapshot.yml),
which reads the GitHub repo traffic API server-side with the built-in
`GITHUB_TOKEN`. GitHub only retains 14 days of traffic data, so the committed
history is our durable record.

## Pre-registered thresholds

Registered before collecting results, so the read is honest. Evaluated on a
rolling 4-week window once at least 4 weekly snapshots exist:

- **Continue** if unique visitors/week is trending up (>= 25 uniques/week
  sustained) **and** returning-visitor share is flat-to-up (not collapsing to
  ~0), i.e. the retention curve is not a cliff.
- **Iterate** (adjust positioning/onboarding, keep building) if uniques hold
  between 5 and 25/week but returning share is weak (< 15%).
- **Pivot / re-evaluate the beachhead** if uniques stay < 5/week for 4
  consecutive weeks with no star/fork/issue traction — distribution, not
  product, is the bottleneck and more features will not fix it.

## Privacy boundary (non-negotiable)

- No client-side analytics, cookies, fingerprinting, or phone-home of any kind.
- No trace file, sequence, or filename ever leaves the browser.
- The only measurement is **server-side GitHub repo traffic**, which counts
  requests to GitHub, not anything about a user's data. It is collected by a
  scheduled Action using `GITHUB_TOKEN`, never by shipped site code.
