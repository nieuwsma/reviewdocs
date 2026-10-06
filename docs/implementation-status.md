# Documentation capability implementation

Version: 0.2.0 development package, 2026-10-06. Implemented in reviewdocs; not
published or installed into translation-server. Existing worktree changes were
preserved. See [usage and installation](usage.md).

| Planned area | Delivered |
| --- | --- |
| T1 portable links | Global source/output graph, cross-collection anchors, nested paths, machine-link rejection, relocated export validation |
| T2 reader shell | Grouped/filterable navigation, section contents, guide previous/next, shared glossary, full-size images, narrow/print styles |
| T3 ERD presentation | Full-schema SVG viewer with pan/zoom/fit, keyboard scrolling, static/full-size fallback and real/implied relationship explanation |
| T4 complete profiles | Domain/architecture/state/data/API/operations/codebase/worked-example templates, review tracks, task guides, topic omissions and strict placeholder checks |
| T5 provenance | Per-artifact input/output hashes and toolkit/Git metadata, read-only freshness verification, source-change-during-build detection, qualified legacy DB behavior |
| T6 campaign state | Canonical ledger, append-only dispositions/evidence, source aliases, prior-ID continuity, fresh reassessment dispositions, counts/history projections, published track analysis checks |
| T7 evidence | Explicit argument-array commands, unique retained run directories/index, proof boundaries, no-skip/count checks, timeouts, redacted logs, unchanged passing pointer on failed/partial runs, retained output hashes |
| T8 screenshots | Input/image hashes, asset/chapter reconciliation, alt-text illustration checks, explicit product-owned capture contract and staged example capture command |
| T9 app help | Shared user sources with explicit audience blocks and finite help projection; missing help paths return 404 in the toolkit server |
| T10 delivery | Root landing page, loopback serve/open commands and verified offline export |
| T11 inventory | Pruned nested generated/dependency mirrors, first-party include/exclude scope, language/directory/test breakdowns |
| T12 installation | Dry-run adoption, version/base manifest, unchanged managed-skill upgrades, three-way proposals, reviewed CI/routing recipes and packaged-consumer smoke test |

The package includes `system-reference`, upgraded `evidence-review` and
`user-guide` skills, supporting references and JSON schemas. Consumer command
matrices stay outside managed skill resources. The Note Desk example demonstrates
all three categories, an actual synthetic browser application, structured review
state, glossary/diagrams and finite help. No EXAMPLE product data or controls were
transplanted.

## Validation and limits

- `npm run check`: 28 tests passed, plus complete example generation, deterministic
  rendering and link checks across 38 HTML pages.
- Package smoke test packed the toolkit and exercised init/check/verify/dry-run
  upgrade from a repository-local consumer layout. Existing local dependencies
  were supplied offline; no mutable toolkit checkout was used by the consumer.
- The synthetic example's explicit workflow evidence lane passed. It exercises
  real example state functions in Node and is classified synthetic/mocked.
- All three skills passed the skill-creator validator; skill frontmatter and
  reference checks also run in the package's test suite.
- Browser test/capture scripts and a separate Chromium CI job are included.
  Chromium launch was blocked by the implementation session's macOS sandbox;
  real-browser acceptance and new raster captures were not completed here.
- Docker database generation and Mermaid/Puppeteer rendering were not run here.
  The existing optional generators remain available; the ERD controls were
  exercised at the JavaScript/DOM seam without claiming browser/DB proof.
- Publication, translation-server adoption, application Help integration and authored
  translation-server manuals remain separate follow-on work.

## 0.2.1 consumer-install correction

Schema artifacts now dispatch to the database producer instead of failing as an unknown artifact. A CLI regression uses an unavailable Docker fixture and verifies that prior schema proof remains untouched. The Media consumer installs the patched package; real Docker/schema execution still requires its own gate.
