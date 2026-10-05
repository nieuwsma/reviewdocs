---
name: evidence-review
description: Run or incrementally reassess the repository's formal engineering review using fresh executable evidence and stable finding lifecycle states. Do not use for an isolated feature review or ordinary bug diagnosis.
---

# Evidence-backed engineering review

Treat repository reports as durable review state rather than a transcript.

## Before reviewing

1. Read `docs/review/README.md`, `docs/review/executive-summary.md`, `docs/review/findings-register.md`, and `docs/review/campaign-protocol.md` completely.
2. Read `references/evidence-matrix.md` and adapt its placeholders to the repository before running the campaign.
3. Record the source commit, dirty state, comparison baseline, date, tool versions, and available test infrastructure.
4. Preserve user changes. Do not reset or overwrite unrelated work.

## Review posture

- Verify claims against implementation, schemas, contracts, and executable behavior.
- Keep neutral architecture prose in the System Reference and evaluative conclusions in the review.
- Never export credentials, row data, customer data, private keys, or live identifiers.
- On reassessment, classify every prior finding as fixed, partially fixed, unchanged, superseded, accepted, or unable to verify.
- Retain stable canonical finding IDs and explicit exit conditions.
- A reproducible failing product test is evidence. Contaminated or misleading evidence is a review-process failure.

## Required completion

- Fresh evidence is retained or its absence is explicitly qualified.
- Detailed findings map to the canonical findings register.
- Test totals and finding counts agree across reports.
- `npx reviewdocs check` passes.
- Local Markdown and generated HTML links resolve.
- The final report states limitations and release posture clearly.
