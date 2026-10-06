# Structured campaigns

The consumer's campaign JSON is the canonical structured finding/disposition ledger. Authored track reports retain reasoning and source traces. `{{review-summary}}`, `{{review-findings}}` and `{{review-history}}` render current totals/register/history without duplicated hand-maintained counts.

Record campaign ID and source description, commit/dirty boundary, comparison baseline and tracks. Each evidence entry names its status, proof mode, description and retained path when executed/read. Each finding has a stable canonical ID, title, track, exit condition and dated append-only history containing status, severity, confidence, reason and evidence IDs. Keep source-ID aliases when combining tracks. The packaged campaign schema describes the format.

Configure a previous ledger for reassessment: missing canonical IDs or rewritten history fail validation. Reassess every prior ID explicitly; do not silently carry an old disposition forward as a fresh result. A fixed disposition needs passing evidence with its actual proof boundary. Source reading can establish a narrow correction; it does not establish integration or deployment success.

Populate consumer evidence lanes with argument arrays, production input roots, required outputs and proof modes. `${RUN_DIR}` and `REVIEWDOCS_RUN_DIR` identify the run-qualified output directory. Commands own isolated resources and cleanup. Do not share mutable databases across parallel packages or silently run a weaker lane because a port is occupied. `requireNoSkips` requires a structured result file with skip counts.

Keep executable findings before remediation, history separate from the authoritative current summary, and release acceptance authored. Tests can fail while the review succeeds at reporting the defect; absence of evidence is not a green gate.
