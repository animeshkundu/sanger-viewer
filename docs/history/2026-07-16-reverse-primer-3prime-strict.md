# 2026-07-16 — Reverse-primer 3′-end strict rule was applied to the wrong end

## Summary

`findPrimerBindingSites` enforces a stricter, zero-tolerance mismatch rule on the
last `THREE_END_STRICT` (3) bases of a primer — the 3′ end — because a 3′-terminal
mismatch blocks polymerase extension and is the dominant determinant of PCR
specificity. For reverse primers the search matches the reverse complement of the
primer against the top strand left-to-right, which places the primer's 3′ end at
index 0 of the match. `scoreSite` unconditionally treated the *trailing* bases as
the 3′ end, so for reverse primers the strict window landed on the primer's 5′ end.

## Impact

- False positives: reverse binding sites with a real 3′-terminal mismatch (which
  should be rejected) were reported, over-predicting PCR amplicons.
- False negatives: reverse binding sites whose only mismatch was at the 5′ end
  (which should be tolerated) were rejected, hiding valid amplicons.
- Forward primers were unaffected. Exact (0-mismatch) matches were unaffected,
  which is why existing reverse-strand tests (all exact) stayed green.

## Root cause / decision path

`scoreSite` computed `threeEndStart = pLen - THREE_END_STRICT` and always flagged
`k >= threeEndStart`. That is correct only when the supplied string is oriented
5′→3′ with the 3′ end trailing (forward primers). Reverse primers are searched via
`reverseComplement(primerSeq)`, which reverses orientation.

## Fix / outcome

Added a `threeEndAtStart` parameter to `scoreSite`. The reverse search passes
`true`, so the strict window is `k < THREE_END_STRICT` (indices 0..2), matching the
primer's true 3′ end. Forward search keeps the trailing-window behavior.

Verified with three new tests in `tests/core/primers.test.ts`:
- exact reverse site still found (positive control),
- reverse site with a 3′-end-only mismatch is rejected (failed before the fix),
- reverse site with a 5′-end-only mismatch is tolerated (failed before the fix).

Gate: `npm run lint`, `npm run typecheck`, `npm run test` (446 passed), and
`npm run build` all pass.

## Follow-ups

- none

## Links

- PR: <!-- add on open -->
- Issue:
- ADR / plan / research:
