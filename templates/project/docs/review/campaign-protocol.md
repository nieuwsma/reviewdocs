# Review campaign protocol

1. Record the exact source commit, dirty state, comparison baseline, date, and tool versions.
2. Generate fresh machine evidence in isolated output directories. Use the commands in `.agents/skills/evidence-review/references/evidence-matrix.md`, after replacing its placeholders.
3. Perform the code and design review in `.agents/skills/evidence-review/references/review-outline.md`. Do not treat this prose as proof.
4. Reassess every existing finding and search for regressions. Keep each finding ID stable.
5. Keep system description in `docs/reference/` and judgments in `docs/review/`.
6. Run `npx reviewdocs check` and fix any reported link, anchor, or determinism failure.
7. Report failed tests and unavailable evidence explicitly. Say when a command did not run.

A failing product test is evidence. A contaminated or non-reproducible evidence set is a review-process failure. `reviewdocs` rebuilds and checks the sites. It does not decide the findings.
