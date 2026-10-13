# ReviewDocs reliability and agent refinement plan

Plan date: 2026-10-12. Implementation status: implemented in the local 0.5.0 working tree; remote CI and publication remain pending.

This plan follows the review of the local 0.4.1 working tree, including its
uncommitted publication changes. The committed/public baseline is 0.4.0 at
`edffdc3`. Preserve those existing changes and the historical planning records.
See the [tool comparison](../tool-comparison.md) for positioning and alternatives.

## Baseline and scope

The review ran 36 passing tests, example determinism/link checks, and passing
Chromium checks for navigation, glossary access, narrow layout, print, finite
help, and the synthetic save/approve/invalidation workflow. Docker/SchemaSpy and
Mermaid rendering were not exercised.

Separate synthetic reproductions established RD-001, RD-002, and RD-003 below.
The latest public GitHub run, `37520173477`, failed both jobs at `npm ci` with
missing Puppeteer lockfile entries. A clean-install dry-run of the current
working-tree manifests passed with local npm 11. That does not establish that
the existing Node 22 CI environment is repaired.

Implement the correctness fixes, installation/CI repairs, CLI correction,
configuration refactor, agent guidance changes, and diagnostic command. Retain
the existing separation between factual reference, authored engineering
judgments, user tasks, and explicitly executed evidence. Rendering or successful
freshness verification must never invent a finding disposition or release
judgment.

## Findings and planned work

The changes below are implemented locally. Exit evidence and outstanding
external gates are recorded in [implementation status](../implementation-status.md).
Paths below are checkout-relative implementation citations, not publication downloads.

| ID | Priority/type | Finding or improvement | Implementation entry point | Exit condition |
| --- | --- | --- | --- | --- |
| RD-001 | High / reproduced defect | A timed-out command that exits zero is recorded as passed and accepted by verification. | `src/evidence.mjs:40`, `verifyEvidence` | Timed-out records cannot pass, advance the passing pointer, or verify as complete evidence. |
| RD-002 | High / reproduced defect | Export copies unlinked raw logs and private provenance from the generated tree. | `src/delivery.mjs:55`, `src/publication.mjs`, `src/provenance.mjs` | Public builds/exports contain only declared documentation and approved renderer/illustration assets; private proof state stays private. |
| RD-003 | Medium / reproduced defect | Shared staging paths and delete-before-rename allow concurrent builds to remove published output. | `src/files.mjs:27`, all publication producers | Concurrent writers cannot damage another writer's staging or final output; failures preserve or restore the previous generation. |
| RD-004 | Release gate / observed CI failure | Public CI fails during clean dependency installation. | `.github/workflows/ci.yml`, `package-lock.json` | Fresh installation and both jobs pass on GitHub using a documented Node/npm combination. |
| RD-005 | Test gap | Package tests extract the tarball but reuse development dependencies through a symlink. | `test/package.test.mjs:19` | A separate temporary consumer installs the tarball and its declared dependencies without borrowing repository `node_modules`. |
| RD-006 | Low / reproduced CLI defect | Global `reviewdocs --help` is treated as an unknown command. | `bin/reviewdocs.mjs:34` | Global help and command help return zero; missing values and unknown commands still return nonzero. |
| RD-007 | Maintainability | Configuration normalization, filesystem validation, graph planning, and source reads are intertwined. | `src/config.mjs`, `src/index.mjs` | Responsibilities are separated with equivalent behavior, explicit artifact ownership, and unchanged supported entry points. |
| RD-008 | Agent portability | Managed review guidance assumes `docs/review`, although configured consumers can use other paths. | Packaged `evidence-review` skill and references | Guidance resolves collections/reports from configuration and works with renamed documentation roots. |
| RD-009 | Agent maintenance | Shared publication and presentation policy is repeated across three skills. | Packaged skill resources | One shared policy reference is shipped, resolves after installation, and upgrades without overwriting consumer edits. |
| RD-010 | Agent coverage | Review scope needs an explicit coverage record rather than an ambiguous claim of completeness. | Review outline, campaign guidance | Full/scoped modes record examined sources, traced behaviors, executed proof, omissions, and applicable prior findings. |
| RD-011 | Maintainer contract | ReviewDocs has no root `AGENTS.md` for maintaining the toolkit itself. | Root maintenance instructions | A concise contract distinguishes toolkit maintenance from consumer authoring and specifies ownership, validation, and authorization boundaries. |
| RD-012 | Documentation drift | README guidance permits copying coverage/evidence into public assets; status prose mixes historical and current capability claims. | `README.md`, `docs/usage.md`, `docs/implementation-status.md` | Current publication/install/validation guidance agrees across docs and skills; historical evidence stays explicitly dated. |
| RD-013 | Product enhancement | Freshness failures lack a consolidated explanation and machine-readable diagnostic report. | New doctor/reporting interface | A read-only diagnostic reports affected artifacts, reasons, dependencies, and explicit refresh commands in human and versioned JSON formats. |

## Phase 1: Make evidence outcomes trustworthy

1. Centralize outcome classification. Use `unavailable` for execution-start
   failures, `failed` for timeouts/nonzero exits/reported failed tests, and
   `partial` for incomplete required outputs or result counts. Preserve the
   existing public status vocabulary and record timeout explicitly.
2. Never promote a timed-out or incomplete run to `latest.json`, even when its
   command handles termination and exits zero. Retain its run directory and
   failure reason.
3. Validate retained records during `verifyEvidence`, including timeout state,
   required output membership, result-count policy, input freshness, and output
   integrity. Previously misclassified timed-out records must fail verification;
   do not silently rewrite their historical records.
4. Bound captured command logs or stream them through redaction, recording
   truncation explicitly. Retain process-group termination and escalation.

Acceptance: regressions cover graceful zero-exit timeout, forced termination,
spawn failure, missing outputs, malformed/count-mismatched results, skipped
tests, changing inputs, and a genuine complete pass. Failed/partial runs retain
their evidence while leaving the previous passing pointer unchanged.

## Phase 2: Enforce the publication boundary

1. Define ownership and visibility for generated artifacts. Public material is
   rendered documentation, declared illustrations, and renderer-owned runtime
   assets. Raw evidence, logs, source dumps, archives, source maps, inventories,
   campaign ledgers, and source/output fingerprints are private by default.
2. Build/export a declared public file set; do not copy arbitrary directory
   contents or treat an extension alone as sufficient authorization to publish.
   Preserve legitimate SchemaSpy/Swagger/presentation runtime assets through
   producer-owned manifests. Keep the embedded API browser working offline.
3. Put private provenance and evidence under a validated private state root
   outside public output. Keep its retained hashes available to `verify` and
   dependency checking. Explain private state versus public prose in the docs.
4. Provide an explicit, checked migration for legacy provenance/evidence paths.
   Verify retained inputs/outputs before moving state, preserve run history, and
   report conflicts. Do not delete source or unrelated consumer files. Document
   old-path support/deprecation and any layout compatibility change.
5. Apply the same ownership policy to build, retained-output validation, export,
   and preview serving. Reject escapes and symlinks in public exports. Remove
   obsolete *generator-owned* private/source copies on successful migration.

Acceptance: export fixtures containing unlinked logs, JSON evidence, hidden
provenance, archives, source files/maps, and escaping symlinks cannot publish
them. Legitimate documentation, screenshots, diagrams, runtime JS/CSS, offline
OpenAPI, and finite help survive relocation. Test legacy-state migration and
consumer paths outside the normal generated layout.

## Phase 3: Make publication recoverable under concurrency

1. Allocate unique staging directories beside the target and establish an
   exclusive publication lock. Define lock ownership, stale-lock handling, and
   overlap behavior; unrelated outputs should not need a global lock.
2. Validate staged content, source/dependency fingerprints, and provenance
   before publishing. Move the previous generation to a recoverable backup,
   install the completed replacement, and roll back on failure. Clean up only
   the current writer's temporary resources.
3. Apply the transaction to directory producers and file/portal producers.
   A portal owns specific files and must never replace/delete its child
   collections. Include private provenance in the commit/recovery protocol.
4. Document filesystem limits and interrupted-publication recovery. Do not
   claim a zero-gap directory exchange or whole-site atomicity that the chosen
   filesystem implementation cannot provide.

Acceptance: deterministic interleaving tests plus a two-process CLI test cover
competing writers, writer exceptions, failed rename, interrupted commit, and
source changes during rendering. Previous good output remains recoverable;
no writer removes another's staging. Unrelated artifacts still build normally.

## Phase 4: Repair installation, CI, and CLI behavior

1. Reproduce the public clean-install failure using the CI Node/npm versions.
   Establish the supported runtime matrix and lockfile-generation convention;
   repair the lockfile/optional-peer graph without disabling `npm ci` checks.
2. Update workflow actions to the supported versions verified for Foundation:
   checkout v7.0.1 and setup-node v7.1.0. Declare read-only permissions. Apply
   compatible updates to the consumer workflow recipe as well.
3. Replace the shared-dependency package smoke test with a real tarball install
   into a clean temporary consumer. Keep an offline fixture test separately if
   useful; label its narrower proof honestly. Exercise init/check/verify/upgrade
   and shipped agent references from the installed package.
4. Test the declared minimum runtime and the chosen current runtime, or revise
   `engines` and documentation with an explicit compatibility note. Continue
   the Chromium job; add the new evidence/publication/concurrency regressions.
5. Correct global help parsing and add `--version` for diagnosis. Keep command
   help and errors consistent. Optional generators should give actionable
   missing-prerequisite diagnostics without silently claiming acceptance.

Acceptance: fresh installs, packaged-consumer tests, version/help assertions,
and both GitHub jobs pass. Missing optional Mermaid/DB infrastructure is
explicitly qualified. Use an authorized disposable environment for any real
generator integration gate; fixtures alone do not establish that gate.

## Phase 5: Simplify configuration and artifact planning

Separate configuration loading/normalization, schema/invariant validation,
filesystem/publication policy, and dependency selection into small modules.
Use a normalized artifact description with explicit inputs, dependencies,
public/private outputs, and producer identity. Preserve the existing ES-module
API and configuration names where possible; no wholesale language/framework
migration is needed.

Validate nested identifiers and producer settings before side effects, and
produce diagnostics with artifact ID, config location, and recovery advice.
Avoid reading unselected content unnecessarily while still checking global
output collisions and required dependency relationships. Treat executable
configuration and presentation modules as trusted code, not a sandbox.

Acceptance: old representative consumer configs still build; malformed configs,
cycles, unknown dependencies, reserved-path collisions, traversal, and symlinks
fail clearly before replacing output. Configured selection has documented,
tested behavior for unavailable unselected artifacts.

## Phase 6: Align agent instructions and maintained documentation

- Add a root maintainer `AGENTS.md` covering module boundaries, consumer-owned
  files, dirty-state preservation, synthetic fixtures, optional integrations,
  test/release gates, and task-based authorization. Installing/upgrading skills
  must not authorize review, remediation, deployment, or publication.
- Resolve collection/report paths from configuration; retain defaults as
  examples rather than mandatory directory names.
- Move common privacy/publication, evidence-classification, and visual-system
  policy into shared packaged references. Keep each skill's role-specific
  procedures short and preserve the selected presentation system.
- Add explicit full and scoped review modes with a coverage record. A scoped
  result cannot claim full coverage or silently reassess unexamined prior IDs.
  Preserve canonical findings, history, and authored release judgments.
- Update README/usage/status and templates to distinguish private retained
  proof, public interpretation, historical validation, and current acceptance.
  Keep commands and selectors consumer-owned.

Acceptance: installed skills and every reference resolve; renamed-root fixtures
work; adoption/upgrade preserves local changes and emits three-way proposals;
publication examples obey the actual policy. Clearly report checks the tool
can enforce versus instructions that require human/agent judgment.

## Phase 7: Add doctor and structured diagnostics

Add `reviewdocs doctor [--only <ids>] [--json]`. It inspects the configuration,
artifact/dependency graph, producer prerequisites, provenance, and screenshot
contracts without running evidence, rendering output, or starting services.
Report fresh, stale, missing, invalid, and unavailable states with reasons and
explicit next commands. A fresh artifact is not a correctness/release verdict.

Provide a versioned JSON envelope and stable diagnostic codes. Keep human mode
readable; JSON stdout must contain only machine-readable output. Sanitize command
descriptions and avoid emitting secrets or raw evidence. Record changed input
paths where the retained provenance contains enough information; otherwise
report the affected input scope without pretending to identify an exact file.

Acceptance: diagnostics match `verify` outcomes for stale/missing/tampered and
unqualified artifacts; `--only` honors dependencies; the command leaves files
and timestamps untouched; malformed configuration still produces useful JSON.
Document that loading a trusted `.mjs` config executes its own top-level code.

## Completion and release gates

1. Keep each phase reviewable and add meaningful regressions with the fix.
2. Run the targeted tests first, then `npm run check`, browser checks, and a
   clean packaged-consumer installation. Run relevant optional integrations
   explicitly or retain their qualified absence.
3. Validate at least one established consumer from an installed tarball:
   migration, freshness, public export, presentation assets, and application
   help. Do not claim product/backend acceptance from documentation tests.
4. Update the comparison and implementation-status docs with observed results,
   not planned capabilities. Include the public comparison document in package
   distribution when linking it from the installed README.
5. Restore green GitHub CI before releasing. Use a patch for compatible fixes
   and a minor release for new diagnostics or layout changes requiring
   migration; settle the version from final scope rather than relabeling the
   existing draft as completed. No commit, tag, push, or release is part of this
   planning task.

Defer full-text search, multi-repository aggregation, publishing backends, and
additional renderer integrations until these guarantees and migrations are
stable. The comparison identifies those gaps without making them prerequisites
for the current reliability work.
