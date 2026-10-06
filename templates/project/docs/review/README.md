# Engineering Review

This directory is the review record. It holds findings and release posture, not a transcript of how the review was performed and not a description of how the system works. System behavior belongs in `docs/reference/`.

- [Executive summary](executive-summary.md)
- [Design review](design-review.md)
- [Code review](code-review.md)
- [Findings register](findings-register.md)
- [Campaign protocol](campaign-protocol.md)

These files are published because they are listed in `reviewdocs.config.mjs`. Add any new review page to that `pages` list or it will not appear in `docs/generated/review/`. Rebuild with `npx reviewdocs build` and open `docs/generated/review/index.html`.

The method is `.agents/skills/evidence-review/references/review-outline.md`. Record repository commands in [the consumer-owned evidence matrix](evidence-matrix.md) and configured lanes. Replace placeholders before the first campaign. Canonical state is in `campaign.json`; authored track reports explain the judgments.
