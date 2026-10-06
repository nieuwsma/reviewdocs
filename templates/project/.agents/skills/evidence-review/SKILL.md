---
name: evidence-review
description: Run a thorough code and design review of the repository, or reassess the previous one, using fresh executable evidence and stable finding IDs. Do not use for an isolated feature review or ordinary bug diagnosis.
---

# Evidence-backed engineering review

Reuse the product’s selected visual system when publishing docs. Inspect its installed components and tokens before changing the renderer. When Foundation is selected, use the `reviewdocs/foundation` adapter with actual Foundation components and local compiled assets; keep extra styles limited to prose, diagrams and print. Include theme producer inputs and installed component hashes in freshness checks, and carry those assets inside bundled help.

Treat repository reports as durable review state rather than a transcript. `reviewdocs` publishes the review. It does not write the judgments.

## Before reviewing

1. Read `docs/review/README.md`, `docs/review/executive-summary.md`, `docs/review/findings-register.md`, and `docs/review/campaign-protocol.md` completely.
2. Read `.agents/skills/evidence-review/references/evidence-matrix.md` and `.agents/skills/evidence-review/references/review-outline.md`. Populate the consumer-owned `docs/review/evidence-matrix.md` and configured lanes before running the campaign.
3. Record the source commit, dirty state, comparison baseline, date, tool versions, and available test infrastructure.
4. Preserve user changes. Do not reset or overwrite unrelated work.

## Review posture

- Follow `references/review-outline.md`. Trace the implementation. Do not review the documents alone.
- Keep neutral architecture prose in the System Reference and evaluative conclusions in the review.
- Never export credentials, row data, customer data, private keys, or live identifiers.
- On reassessment, classify every prior finding as fixed, partially fixed, unchanged, superseded, accepted, or unable to verify.
- Retain stable canonical finding IDs and explicit exit conditions.
- A reproducible failing product test is evidence. Contaminated or misleading evidence is a review-process failure.

## Required completion

- `docs/review/design-review.md` and `docs/review/code-review.md` exist, use the outline's headings, and are published pages.
- Coverage in `references/review-outline.md` is satisfied: every first-party production file was opened, and imported code was not reviewed.
- Every finding is in the canonical register and an authored track report or design/code synthesis. Configure each track's report so the toolkit can check ID coverage.
- Fresh evidence is retained or its absence is explicitly qualified.
- Test totals and finding counts agree across the summary, the register, and the write-ups.
- `npx reviewdocs check` passes, or the repository's documented equivalent passes.
- The final report states limitations and release posture clearly.


## Structured campaigns and review tracks

Use [structured campaigns](references/structured-campaigns.md) when adopting or reassessing a campaign ledger. Keep prior canonical IDs and dated history intact. Configure product-specific tracks, including data/contracts, workflow/recovery, frontend/operations and testing/acceptance where relevant. Use design/code pages as synthesis rather than concentrating every topic into two reports.

Keep the neutral system manual independently understandable. Trace findings through implementation entry points, preconditions, effects and failure/retry; cite source and retained evidence. Distinguish a verified defect from a design risk, test gap, accepted tradeoff or observation. Never invent a finding to fill a track.

Evidence lanes run only through explicit `reviewdocs evidence --only <lane>` invocation after inspecting the consumer's commands and isolated-resource conventions. HTML builds do not execute product tests. Classify source-read, mocked, integration, canary, deployment and manual proof separately. Failed/partial runs remain retained and must not replace the last complete proof. Read-only `reviewdocs verify` detects stale configured artifacts; it is not a release judgment.

When migrating a Markdown register, compare every imported ID, severity, confidence, disposition and exit condition with the source. Keep the historical campaign before starting a fresh reassessment. A documentation refresh must not silently mark product findings fixed or certify a newer deployment.
