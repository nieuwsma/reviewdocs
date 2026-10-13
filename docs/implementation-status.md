# Documentation capability implementation

Historical snapshot: version 0.2.0 development package, 2026-10-06. Implemented in reviewdocs; not
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

Publication boundary updated in 0.4.1: collection assets accept illustrations only, source/evidence/archive links fail builds, raw source files fail retained-output checks, campaign evidence is no longer copied, screenshots stay inline, and schema producers remove source dumps/download links. Preview HTTP delivery refuses source, raw evidence and archives even when present. Authoring skills require plain filename citations. All 36 tests and example publication checks pass; an HTTP probe confirmed forbidden files return 404 while documentation remains available.


## 0.5.0 reliability implementation status (2026-10-13)

The working tree now contains the planned reliability and agent-refinement implementation. This is a local development result, not a published package or remote CI result.

| Area | Current implementation |
| --- | --- |
| RD-001 evidence timeout | Timeouts fail regardless of exit code; bounded UTF-8 logs, output hashes, and retained passing pointer checks have regression coverage. |
| RD-002 publication boundary | Provenance, inventories, and evidence use private `.reviewdocs/` state. Generated directories declare public files; export and portal serving consult that manifest. OpenAPI raw JSON and campaign ledger copies are omitted. |
| RD-003 transactions | Unique staging paths, a shared project publication lock, output/proof journal, rollback and stale-owner recovery are implemented. |
| RD-004 CI/runtime | CI pins current actions, tests Node 20/22/24 with npm 11.6.0 and limits token permissions. Remote GitHub CI has not run on this unpushed working tree. |
| RD-005 package consumer | Package test installs a produced tarball and declared dependencies into an isolated consumer. The registry-enabled run passed. |
| RD-006 CLI | Global help/version, doctor JSON/human modes, and explicit migration command exist. |
| RD-007 configuration | Filesystem guards, producer settings validation and a dependency-selection module are extracted; global graph checks remain centralized in loadConfig. |
| RD-008/009 skills | Review paths resolve from configuration, and common policy is in a packaged reference used by the three skills. |
| RD-010 review coverage | The evidence-review skill distinguishes full and scoped reviews and includes an authored coverage record template. Judgment remains human-authored. |
| RD-011 maintainer guidance | Root `AGENTS.md` documents boundaries, consumer ownership and verification/release expectations. |
| RD-012 docs | Usage, README and this status page distinguish private evidence from public interpretation and retain the dated historical snapshot. |
| RD-013 doctor | Versioned read-only JSON and human output report freshness, missing state and producer prerequisites. It executes trusted config code by loading `.mjs`. |
| Comparison | `docs/tool-comparison.md` compares six established tools and is included in the package manifest. |

Final local verification: `npm ci --omit=optional` passed with npm 11.6.0; `npm run check` passed all 60 tests plus example build/determinism/link checks; `npm run check:browser` passed navigation, keyboard glossary access, narrow layout, print, finite help and the synthetic save/approve/invalidation workflow. The packed tarball installed into an isolated consumer with its declared dependencies and passed init/check/verify/upgrade-dry-run. An isolated translation-server fixture installed the packed 0.5.0 package, validated and applied migration of 15 old proof/evidence paths, reported the migrated 0.4.x proof stale, then rebuilt, checked 118 linked pages and 19 screenshots, and verified freshness. Its Foundation presentation assets and application help were present. Public export in that fixture correctly stopped on links to the optional, separately generated SchemaSpy pages because Docker/images are unavailable; the standalone export regression passes. Docker images and Mermaid CLI are unavailable here, so those producer gates remain unrun. The original translation-server worktree was not migrated or modified by this integration check. The 0.5.0 release requires green GitHub CI for its committed revision before tagging and publishing; the GitHub release notes record the final CI result. Added release regressions cover spawn failure, missing/malformed/mismatched results, skipped tests, forced termination, changing inputs, two independent CLI builds, failed installation rename, and recovery after killing a publisher. Package installation failures no longer fall back to copied development dependencies.
