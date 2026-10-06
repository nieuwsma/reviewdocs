# EXAMPLE comparison and reviewdocs enhancement plan

Date: 2026-10-06. Original planning record; see the
[implemented capability and validation status](../implementation-status.md).

## Recommendation

Make reviewdocs a reusable documentation capability with three authoring workflows:
system reference, engineering review, and user guide. Ship the renderer, validators,
templates, and AI procedures together. A consuming repository supplies its own
domain, source evidence, executable commands, UI fixtures, and application integration.

EXAMPLE is the reference for depth, task orientation, and evidence discipline.
The current translation-server deliverable falls substantially short of it. Improving
the renderer alone will not produce the missing domain explanations or user procedures.
The skills must explicitly require those outcomes, and the tools must validate the
parts that can be checked mechanically.

This plan does not run a new product review, change finding dispositions, implement
the toolkit, or install it into translation-server. It records the comparison and a
sequenced implementation and adoption design in the newly moved reviewdocs repository.

## What was inspected

Paths below are relative to this file. The comparison used checked-out source,
generated HTML, configuration, scripts, tests, and skill files. Product correctness
and EXAMPLE's recorded test/release claims were not independently requalified.

| Area | EXAMPLE evidence | Current evidence |
| --- | --- | --- |
| Reference | [Reference index](../../../EXAMPLE/docs/system/README.md), architecture, domain model, relational model, workflow example, glossary, retention, API and codebase pages | [Reference index](../../../translation-server/docs/reference/README.md), [architecture](../../../translation-server/docs/reference/architecture.md), [configuration](../../../translation-server/reviewdocs.config.mjs) |
| Review | [Review index](../../../EXAMPLE/docs/reviews/README.md), track reports, findings register, campaign baseline, remediation plan, coverage report and completion matrix | [Review index](../../../translation-server/docs/review/README.md), design/code reports, executive summary, findings register, campaign protocol and evidence matrix |
| User documentation | [User guide](../../../EXAMPLE/docs/system/user-guide.md), task chapters, [troubleshooting](../../../EXAMPLE/docs/system/user-troubleshooting.md), [maintenance procedure](../../../EXAMPLE/docs/system/user-guide-maintenance.md), screenshot manifest and capture/browser tests | No published user-guide collection or task manual; engineering runbooks and planning material exist |
| Generators | `EXAMPLE/scripts/generate-system-html.mjs`, `generate-review-html.mjs`, `generate-app-help.mjs`, corresponding checkers and Make targets | [Renderer](../../src/site.mjs), [checker](../../src/check.mjs), [initializer](../../src/init.mjs), [CLI](../../bin/reviewdocs.mjs), templates and tests |
| AI procedures | `EXAMPLE/.agents/skills/ais-whoiz-system-docs/`, `ais-whoiz-review/`, `whoiz-code-inventory/` and root routing | One evidence-review skill; no dedicated system-reference or user-guide authoring skill |

At inspection EXAMPLE had 22 system Markdown files, 21 review Markdown files,
12 system Mermaid sources, and 26 guide PNGs. Media-platform had two reference
Markdown files and six review Markdown files. These are scope indicators, not
quality targets. EXAMPLE's screenshot manifest lists 25 captures while 26 PNGs
are present: asset/manifest reconciliation is itself a useful validator.

## Difference across the three categories

| Dimension | What EXAMPLE does | What translation-server currently does | Enhancement needed |
| --- | --- | --- | --- |
| Reference structure | Separate architecture, domain, reconciliation, discovery, hardware workflows, API, data model, retention, codebase and worked example | Concentrates most description in one architecture page | A required topic map adapted to the product, with substantial source-backed chapters |
| Conceptual explanation | Explains planned, observed and accepted facts, coordinate versus identity, and component authority before implementation details | Lists processes, routes and behaviors with little sustained domain explanation | Domain concepts, relationships, invariants, state transitions, ownership and a shared glossary |
| Architecture visuals | Context and sequence diagrams; domain topology and lifecycle diagrams; captions, legends and Mermaid source links | No diagram group configured for the reference | Configured, portable diagrams with purpose, legend, alt text and adjacent explanation |
| Relational explanation | Explains keys, ownership, constraints and intentional decomposition; embeds full ERD viewers with fallback links | Links to generated schema/ERD without a relational-model chapter | An explanatory data-model page and ERD viewer/navigation support |
| Worked workflows | One coherent example follows setup through observation, decisions and outcomes | Short prose describes the main upload/transcribe/approve path | A synthetic project followed through source, translation, speech, approval, export and revision invalidation |
| Review organization | Topic-specific analyses plus synthesis, testing report, remediation checklist and remaining acceptance | Two broad design/code reports containing findings | Configurable review tracks with coverage, evidence and conclusions per track |
| Review continuity | Machine-readable baseline, stable canonical/source IDs, dated dispositions and retained historical evidence | Stable MP IDs and prose lifecycle rules; no comparable structured campaign/evidence model | Validated campaign baseline, finding ledger, evidence index and generated current-state tables |
| Executable evidence | Dedicated isolated SQL lanes, coverage artifacts, browser proof, contracts and deployment qualification | Latest review explicitly did not run its product test gates; prior results are qualified | Adaptable repository commands with isolated execution, retained failure evidence and honest proof boundaries |
| User tasks | Getting started, configuration, routine work, decisions, physical operations and troubleshooting | No user manual; developer/operations notes cannot substitute | Guide with prerequisites, actual UI controls, numbered steps, expected result and recovery for each task |
| User illustrations | Actual application rendered with synthetic fixtures; full-size images and provenance manifest | No published guide captures | Product-owned capture harness plus generic manifest/asset validation |
| Help delivery | Same chapter sources generate a standalone portal and an operator-only `/help/` bundle embedded in the app | No bundled help | Shared source projections and explicit app integration |
| Reader experience | Grouped and filterable navigation, glossary terms, print support, diagram and screenshot treatments | Flat sidebar, basic styling and image sizing | Comparable navigation and reading affordances across all three collections |
| Portability/currentness | Relative portal links; some historical qualifications still require careful reading | Absolute machine paths, old toolkit invocation, visibly stale reference/schema baseline | Portable link graph, provenance and explicit current/historical separation |

### Specific deficiencies to address first

1. Media-platform reference and review indexes invoke `~/repo/reviewdocs`, which
   no longer identifies the moved checkout. Configuration and Markdown also use
   absolute `file:///Users/andrew/...` portal links. These are unsuitable for a
   distributable site; current link validation skips scheme URLs, so it does not
   catch them. The earlier click failure is an additional entry-point problem:
   filesystem links rendered by a chat application are not a dependable browser
   delivery mechanism.
2. The reference still describes migrations through 022, shared worker-token
   behavior and absent enrollment/checkpoints. Its own review identifies drift
   against migration 023/security work. The implementation handover now describes
   a later secure Kind deployment. Refresh from source; do not rewrite the review
   as though its older campaign assessed the newer implementation.
3. The generated database index predates the secure-worker migration. A successful
   Markdown build does not prove fresh schema evidence.
4. `docs/generated/inventory.json` counts `deploy/kind/build/web/dist` outputs,
   including 15,396 nonblank lines of bundled JavaScript. Its source totals and
   test proportion therefore cannot be treated as an accurate product inventory.
5. Current `check` proves two immediate renders agree and checks many local links.
   It does not certify architecture accuracy, campaign completeness, test success,
   screenshot quality or source/evidence freshness. Cross-collection anchors are
   not validated when their target HTML is outside the scanned collection.

### What to preserve and what to improve on EXAMPLE

Preserve implementation-backed explanation, purpose-specific reports, illustrated
tasks, stable IDs, reproducible evidence and the single-source help bundle.

EXAMPLE also accumulates long chronological updates and sometimes contradictory
historical/current statements. Use one clearly authoritative current summary with
linked campaign history. Do not reproduce all that prose in every track. Its help
generator strips paragraphs by regex; use explicit audience metadata/blocks so
projection cannot accidentally remove instructions. Its generators hard-code
product pages, terms and paths; translate those into configuration and adapters.
Do not transplant its fixture IDs, SQL lanes, coverage floors, roles or deployment
commands into translation-server.

## Target capability layout

Keep existing `reference` and `review` identifiers/paths compatible. Add a user
collection and an optional help projection. EXAMPLE combines user chapters into
the system portal; reviewdocs can expose them under a grouped portal while also
offering a dedicated task-oriented user entry point.

```text
reviewdocs/
  src/                         renderer, graph, checks, provenance, adapters
  schemas/                     campaign, findings, evidence, screenshots, install state
  templates/project/
    docs/reference/            architecture/domain/data/workflow topic templates
    docs/review/               tracks, synthesis, campaign and finding sources
    docs/user/                 getting-started/task/troubleshooting templates
    .agents/skills/
      system-reference/
      evidence-review/
      user-guide/
  example/                     neutral runnable three-category demonstration

consumer/
  reviewdocs.config.mjs         collection, artifact and repository adapter configuration
  docs/reference/              authored factual manual
  docs/review/                 authored judgments + structured campaign state
  docs/user/                   authored tasks + screenshot assets/manifests
  docs/generated/              reference, review, user and evidence projections
  .agents/skills/               installed reusable procedures
  .reviewdocs/install.json      toolkit/template version and managed-file checksums
```

These are proposed additions. Existing CLI commands are only `init`, `build`, and
`check`; the commands named below must be implemented before use.

## Hard-tool work packages

| ID | Work | Concrete acceptance |
| --- | --- | --- |
| T1 | Global source-to-output link graph; resolve links between collections, nested pages, assets, diagrams and evidence. Distinguish portable published assets from checkout-only source links. Reject absolute machine file links in a portable profile. | Move a generated site to another directory and serve/copy it without broken internal navigation. Validate cross-collection anchors, encoded paths, query strings, nested output names and duplicate output paths. |
| T2 | Reader shell with configured navigation groups, page filtering, section contents, previous/next guide links, full-size screenshots, glossary expansion, diagram captions and print layouts. | Keyboard and narrow-screen browser checks pass; basic reading/navigation work offline without network requests. Unknown glossary references fail; glossary terms work in user and technical views. |
| T3 | Full schema/ERD presentation with accessible pan/zoom/fit controls, source links and static/print fallback. | Work with multiple configured databases and both real and implied relationship views; make their meanings explicit. Include a neutral fixture and a large-diagram check. |
| T4 | Profile-based scaffolds and typed configuration validation for reference, review and user documentation. Track required topics and mark omitted topics with a reason. | Report missing/unpublished source pages, duplicate IDs, invalid paths and template placeholders. A profile can adapt to products without databases, workers or browsers. Existing configs continue to work. |
| T5 | Input/output provenance manifest and freshness validation for every artifact. Record source hashes, toolkit version, commit and dirty input fingerprint, producer and status. | Changing a migration, contract, diagram, screenshot source or configured production input invalidates dependent evidence. Building Markdown cannot relabel old database/test evidence as current. Stable content hashes preserve render determinism; volatile execution dates belong to run records. |
| T6 | Structured campaign baseline, canonical findings with append-only dispositions, track/source-ID aliases, exit conditions, confidence and evidence references. Render summary counts, current register and remediation tables from this ledger. | Detect duplicate/dropped IDs, missing evidence, contradictory counts and invalid lifecycle transitions. Import existing MP findings for human comparison without inventing or changing conclusions. Keep narrative track analysis authored. |
| T7 | Evidence adapters and a run index. Consumer defines argument arrays, prerequisites, disposable-resource ownership and expected outputs. Record command, producer, source fingerprint, exit code, duration, skips and proof mode. | Explicit execution command; normal HTML builds do not run product tests. Preserve failed/partial runs; promote complete results atomically. Never silently substitute mocked proof for integration proof or use an unrelated occupied port. |
| T8 | Screenshot manifest and guide checks. Consumer-owned Playwright harness captures the actual UI with synthetic data and assertions. | Validate chapter/asset/manifest correspondence, hashes, viewport, capture mode and source fingerprint. Flag unexplained extra files and stale captures. Require meaningful alt text and manual visual inspection; a screenshot run alone never proves a mutation or authentication path. |
| T9 | Audience projections from shared sources: standalone reference/user portal and finite app-help bundle. Explicit audience blocks/frontmatter replace destructive regex stripping. | User help retains all procedural steps, prerequisites and recovery; excludes contributor sections by declaration. All help links stay within the bundle or explicitly allowed destinations. Unknown app-help URLs return 404 in the consumer. |
| T10 | Portable delivery: generated root landing page, offline bundle/export, and optional loopback `serve`/`open` command with printed exact URL. | Open all three entry points from one URL. Do not expose repository/private files or bind public interfaces by default. If binding/opening is unavailable, print a usable local-file path and report the limitation. |
| T11 | Repair inventory scope and generate useful codebase summaries: configurable first-party roots, generated exclusions, language/package/test breakdowns and documented classification. | Exclude the translation-server Kind build mirror and fixtures/dependencies as configured. Synthetic tests demonstrate stable counts; expose excluded roots so reviewers can audit scope. |
| T12 | Installation/adoption/update commands with dry-run, version manifest, checksums and conflict reporting. Integrate consumer CI through a reviewed patch. | Adopt a populated repository without overwriting docs, findings, config or AGENTS.md. Upgrade unmodified managed skill files; report local modifications and propose a three-way patch. Root package.json is optional. |

Package `schemas/` and skill/template resources in the npm distribution; the
current `files` allowlist must be updated if resources move outside `templates/`.
Ship a synthetic executable example that exercises all supported projections.
Do not require Docker, Mermaid or Playwright to perform a Markdown-only build.

## AI skill work packages

The skills own research, explanation and judgment. The tools own rendering,
structured-state validation and repeatable checks. A passing tool gate cannot
substitute for a human or AI assessment of whether a manual is useful and true.

| Skill | Required procedure and outputs | Supporting references |
| --- | --- | --- |
| `system-reference` (new) | Discover authority and audiences; read implementation and contracts; build a topic/claim/source matrix; explain domain before persistence; trace success, failure and retry; create diagrams and a worked example; verify currentness; regenerate the factual manual. | Topic outline, domain/relationship checklist, diagram conventions, evidence/source rules, current-versus-planned guidance and maintenance checklist |
| `evidence-review` (upgrade) | Record exact scope/baselines; adapt track map and evidence lanes; inspect source and executable behavior; evaluate contracts, data, trust, concurrency, recovery, operations, frontend and tests; reconcile findings; classify every prior ID; qualify release/acceptance evidence and missing proof. | Campaign protocol, track outlines, command matrix, finding schema/lifecycle, coverage and permission matrices, independent verification guidance when delegation is authorized |
| `user-guide` (new) | Identify readers and real tasks; inspect current controls/routes/permissions; create a task index and complete procedures; build/adapt synthetic capture fixtures; inspect captures alongside text; explain expected state and recovery; generate standalone and app-help views. | Task template, UI terminology checklist, screenshot/capture manifest contract, troubleshooting template, role/access matrix, guide acceptance and maintenance procedure |

For each skill, distinguish mandatory outputs from optional product-specific
topics. Route durable system-doc requests, formal review/reassessment requests
and user-guide requests through a small proposed AGENTS.md section. Preserve
existing working rules. Installation does not automatically execute a review,
remediate findings, deploy an application or claim approval.

Skill acceptance is outcome-based. Trial them against a small synthetic product
with deliberate documentation drift and failed/unavailable evidence, then use
translation-server as the real adoption case. Check whether a reader can explain
ownership and failure, whether a reviewer can trace a finding, and whether a
user can finish a task without source-code knowledge.

## Implementation sequence and release gates

| Stage | Deliverables | Gate |
| --- | --- | --- |
| 1. Portable foundation | T1, T4, T5, T10 and T11; config/backward-compatibility tests; neutral three-category example | Relocated site has valid navigation; stale inputs and generated-code contamination are detected; existing build/check commands retain documented semantics |
| 2. Architecture capability | T2/T3, complete reference templates and `system-reference` skill | Neutral manual explains domain, ownership, state and failure with diagrams and a worked example; peer reading and browser/print checks |
| 3. Review capability | T6/T7 and upgraded `evidence-review` skill | Synthetic repeat campaign preserves every ID/history and exposes failed, skipped and stale evidence; counts agree without prose duplication |
| 4. User capability | T8/T9, guide templates and `user-guide` skill | Real fixture-rendered UI captures, readable tasks and finite standalone/app-help bundles; illustration proof kept separate from workflow acceptance |
| 5. Installable release | T12, packaged resources, migrations, CLI/docs and CI recipes | Pack/install into a temporary populated consumer; dry-run and upgrade conflict tests; no unrequested overwrites; all three skills available |
| 6. Media-platform adoption | Consumer integration and authored content below | Toolkit is pinned, commands work from the moved root, architecture reflects current source, review history survives, users can find/help complete tasks |

Each stage should leave a demonstrable artifact. Architecture/reference work
and the user-guide pilot can begin as soon as the shared renderer/profile work
exists; do not make useful user documentation wait for every advanced review
adapter. Completion is the resulting manuals and usable workflow, not merely
the presence of templates or a new CLI command.

## Installing into translation-server

Use a repository-local installation. Global skills or an absolute sibling path
are unnecessary. For this Go/React/Python repository, prefer a dedicated
`tools/reviewdocs/package.json` and lockfile, analogous to EXAMPLE's tool packages,
so documentation dependency management does not collide with `web/package.json`.

During development, package the updated sibling toolkit into a versioned tarball
and install it into that tool directory. Record its version/integrity; avoid a
mutable `npm link` as the CI dependency. For reproducible CI, move to an immutable
published package version or a pinned accessible repository revision with a lockfile.
A local tarball path alone is not a remote CI installation strategy.

Proposed adoption command:

```sh
# Future CLI; not implemented yet.
reviewdocs adopt --profile complete --skills --dry-run
reviewdocs adopt --profile complete --skills
```

Adoption adds missing capabilities and reports conflicts; it must never require
`init --force` over an existing campaign. Existing Markdown remains consumer-owned.
Installed generic skill files are toolkit-managed, and product-specific evidence
commands/configuration live in separate consumer-owned files. Future upgrades
use the install manifest and never silently overwrite local customizations.

Add consumer Make targets that invoke the installed binary with the root config,
not `~/repo/reviewdocs`. The invocation can be explicit:

```sh
# After the local package has been installed.
node tools/reviewdocs/node_modules/reviewdocs/bin/reviewdocs.mjs check \
  --config reviewdocs.config.mjs --only reference,review,user
```

Wire the existing `.github/workflows/check.yaml` to install with
`npm ci --prefix tools/reviewdocs` and call those targets. Provide separate heavy
evidence lanes for DB generation and product/browser tests. Do not copy the
current root-`npm ci` starter workflow into a repository without a root manifest.

## Media-platform content to produce after installation

### System reference

Produce architecture/context and trust boundaries; domain model/glossary;
projects/media/artifact identity; revisions/approval/dependency invalidation;
operation leases/capabilities/recovery; source and target QA; translation and
speech timing; archives/import/releases/retention; relational model; API/BFF
contract; current deployment/operations links; codebase map; and a worked
project from upload to approved release.

Diagrams should include component context, conceptual revision relationships,
upload publication sequence, worker claim/commit/failure, approval invalidation,
and archive/import/release lifecycle. Every diagram explains a specific question.
Database ERDs remain the structural reference; they do not replace domain diagrams.
Link existing operator runbooks and planning records with their roles made clear.

### Engineering review

Preserve all existing MP IDs, the dated baseline and the 34 recorded findings;
34 is a historical campaign count, not a target or assertion about current code.
Import that campaign before a fresh reassessment. Create review tracks for data
and migrations; API/auth/worker trust; media integrity and upload/delete;
workflow/revisions/approvals; native models/QA/speech; archive/import/release;
frontend/BFF/accessibility; and testing/deployment/operations. Retain design/code
pages as synthesis or navigation when useful.

Configure real translation-server evidence commands and isolated resources from its
current Makefile/tests. Distinguish source reading, mocked worker/browser proof,
isolated integration, actual installed-worker canary, and deployment/remote
acceptance. Closed ports, unavailable models or operator-only steps become
explicit missing evidence. Refresh schema/API evidence without certifying that
the current route sketch is a complete executable contract.

### User guide

Create a task index and chapters for access/navigation; create a project/upload;
transcribe and inspect operation status; source review/edit/QA/approval;
translate and review target cues; regenerate/listen/approve speech; create and
download approved releases; archive/import; and troubleshooting. Keep worker
enrollment and installation in an administrator section linked to current runbooks.

Use one small synthetic media project across the guide. Capture the real React
UI with a product-owned isolated fixture harness, including ordinary success,
permission restrictions, stale-revision conflict, failed work and retry. For every
task state prerequisites, actual control labels, expected saved state, effects
on dependent approvals and safe recovery. Verify UI names when authoring; do
not treat these proposed chapter titles as verified current button labels.

Integrate an app Help link and finite `/help/` static route in a later consumer
change, regenerate its bundle in the application/image build, and verify missing
paths return 404. Run walkthrough acceptance against an authorized isolated
stack separately from screenshot capture. The user manual must be useful without
reading the architecture or engineering review.

## Validation and completion standard

Tool tests should exercise actual failure modes: relocation, broken cross-portal
anchors, missing assets, unknown glossary keys, unsafe output collisions, stale
evidence, dropped findings, mismatched counts, screenshot provenance drift,
projection content loss and upgrade conflicts. Product evidence adapters must
retain failed/partial outcomes and clean up only resources they own.

Use browser tests for navigation/filtering, keyboard access, narrow screens,
full-size screenshots, diagrams, help routing and print layout. Use an isolated
packaged-consumer smoke test to prove the capability installs without depending
on the developer checkout. Content acceptance additionally requires reading the
manuals and executing representative user tasks; mechanical lint cannot prove
that an explanation is correct or understandable.

The desired finish is three coherent, source-backed documentation experiences,
a reusable and versioned toolkit with the skills needed to maintain them, and a
repeatable translation-server installation/update process. Generated HTML existing
on disk is only one part of that outcome.
