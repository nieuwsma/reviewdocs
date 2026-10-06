# Evidence lane selection

The consumer-owned commands are in `docs/review/evidence-matrix.md` and `reviewdocs.config.mjs`. Adapt those files, not this managed procedure. Keep commands comparable across campaigns and declare production input roots, retained outputs, proof mode and required gates.

Choose applicable unit, concurrency, integration, browser/accessibility, static analysis, contract, schema, inventory, documentation, canary and deployment lanes. A product without a relational store or browser does not need those lanes; record omissions. Database evidence uses empty isolated databases and source migration paths. Deployed schema comparison is read-only and schema-only when available.

Run explicit lanes with `reviewdocs evidence --only <lane-id>`. Document passed, failed, partial, unavailable and not-run outcomes. Retain failures under their run-qualified directory; use complete passing pointers only within their source/proof boundary. Mocked browser rendering, source reading and skipped SQL fixtures are not full-stack proof. The toolkit checks fingerprints and structure, not release judgment.
