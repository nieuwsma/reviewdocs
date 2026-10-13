# ReviewDocs compared with other documentation tools

Assessment date: 2026-10-13. This is a comparison of inspected implementation
and documented capabilities, not a performance benchmark or a claim of unique
invention. Other tools can be extended with plugins and repository scripts.

## ReviewDocs baseline

The review baseline was the local 0.4.1 tree and public committed 0.4.0 at `edffdc3`. This working tree implements the listed reliability changes as a 0.5.0 draft. They are not yet shipped on GitHub.

ReviewDocs coordinates maintained Markdown, architecture/API/schema artifacts,
source inventories, append-only review findings, retained evidence runs,
screenshot contracts, and finite application-help projections. Input/output
fingerprints establish configured freshness and integrity; they do not establish
that prose is true, a product is correct, or a deployment is accepted.

Its present reading interface offers page filtering, glossary links, print and
narrow layouts. It does not provide a built-in full-text search index, a
documentation release/version switcher, localization workflow, or an
organization-wide software catalog.

## Tool comparison table

| Tool | Documented focus and strengths | Relationship to ReviewDocs | Practical implication |
| --- | --- | --- | --- |
| ReviewDocs | Source/evidence freshness, explicit proof boundaries, append-only finding history, authored reference/review/user collections, and bundled help. | Evidence-aware documentation with configured freshness, authored findings and finite help. The 0.5.0 implementation adds private proof, allowlisted export, recoverable publication and read-only diagnostics. | Use when retaining review/evidence context alongside documentation matters. A green generator is not a release judgment. |
| [Docusaurus](https://github.com/facebook/docusaurus) | React-customizable documentation websites, localization, and preserved documentation versions; see its [versioning guide](https://docusaurus.io/docs/versioning). | More developed website/versioning capabilities. ReviewDocs concentrates on repository evidence and review dispositions. | Consider a Docusaurus presentation adapter if website/versioned-content requirements grow; retain evidence validation independently. |
| [Material for MkDocs](https://github.com/squidfunk/mkdocs-material) | Markdown documentation and a developed reading/search experience; see its [site-search guide](https://squidfunk.github.io/mkdocs-material/setup/setting-up-site-search/). | Stronger search capability than ReviewDocs' current navigation filter. Its docs-site focus differs from ReviewDocs' evidence/finding model. | Prefer integration over recreating a large reading-feature ecosystem. Reassess maintenance and compatibility before adopting a specific version. |
| [docToolchain](https://github.com/docToolchain/docToolchain) | AsciiDoc-based architecture documentation and a docs-as-code workflow built around arc42. | Substantial overlap in documentation orchestration and authoring discipline. ReviewDocs adds its own retained evidence and finding-lifecycle contracts. | This is an important comparable tool; position ReviewDocs around verifiable review context rather than claiming documentation orchestration is new. |
| [Backstage TechDocs](https://backstage.io/docs/features/techdocs/) in [Backstage](https://github.com/backstage/backstage) | Documentation associated with services in a software catalog, search/discovery, MkDocs integration, and extension points. | Covers portfolio-wide discovery that ReviewDocs currently lacks. ReviewDocs could supply documentation and freshness information to that portal. | For many systems, use a catalog integration rather than turning ReviewDocs into fleet management. |
| [Allure Report](https://github.com/allure-framework/allure2) | Detailed test reporting across multiple frameworks/languages and CI systems; see the [official documentation](https://allurereport.org/docs/). | Richer test-result presentation. ReviewDocs connects retained proof to source inputs, authored findings, and documentation. | An adapter can summarize Allure results with their actual proof boundary; do not replace detailed test reporting with bare pass counts. |
| [SchemaSpy](https://github.com/schemaspy/schemaspy) | Database structure, relationship diagrams, and schema anomaly reports; supports structural analysis of empty database replicas. | A focused producer that ReviewDocs already invokes, rather than a replacement for the complete toolkit. | Keep using the producer through an isolated adapter. ReviewDocs owns freshness, publication policy, and integration into explanatory chapters. |

The descriptions above come from the projects' linked repositories and official
documentation. The relationship and practical-implication columns are this
review's assessment, not claims made by those projects. No head-to-head runtime,
accessibility, or scalability benchmark was performed.

## Where ReviewDocs should concentrate

The strongest product direction is evidence-aware documentation: make it easy to
identify which reference, review, screenshot, or schema artifact is stale, what
input scope changed, and which authorized command refreshes it. Keep human
judgment explicit and preserve historical findings instead of inferring quality
from successful rendering.

Near-term work is evidence outcome correctness, private/public separation,
recoverable publication, clean installation/CI, portable agent instructions,
and read-only doctor/JSON diagnostics. The full plan and exit conditions are in
the [reliability and agent refinement plan](planning/reliability-and-agent-refinement-plan.md).

Full-text search, release-version browsing, localization, multi-repository
aggregation, and adapters for existing portals/renderers are potential later
enhancements. Their value depends on adopter requirements; they are not all
necessary for the current toolkit.

## Validation and publication limits

The reviewed local tree passed 36 tests, example determinism/link checks, and
Chromium checks for navigation, glossary access, narrow layout, print, finite
help, and the synthetic example workflow. The 0.5.0 local implementation adds regression tests for timeout false passes, interrupted publication recovery and unowned export files; all 42 tests and example checks pass. These results describe the local draft, not the public package.

The latest public GitHub run inspected, `37520173477`, failed clean dependency
installation. The local current-manifest dry-run passed using npm 11; matching
the GitHub toolchain and restoring actual green CI remain acceptance work.
Real Docker/SchemaSpy and Mermaid generation were not exercised in the review.

Update the baseline, result dates, and limitations when implementation is
validated. Preserve historical observations explicitly rather than silently
relabeling proposed behavior as shipped functionality.
