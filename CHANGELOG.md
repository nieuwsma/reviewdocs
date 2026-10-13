# Changelog

## 0.5.0 — 2026-10-13

This minor release adds diagnostics and a checked migration to private retained
state, alongside evidence and publication reliability fixes.

### Added

- `reviewdocs doctor`, with read-only artifact diagnostics, prerequisite checks,
  dependency-aware selection, and versioned JSON output.
- `reviewdocs migrate --dry-run` and `reviewdocs migrate` to verify and relocate
  legacy provenance and evidence without rewriting historical proof.
- Global `--help` and `--version` support.
- Shared packaged authoring policy, full/scoped review coverage guidance, a root
  maintainer contract, and a comparison with other documentation tools.

### Fixed

- Timed-out commands cannot pass or replace the last passing evidence pointer,
  including commands that exit zero after termination. Logs are bounded and
  redacted; retained output integrity and result counts are checked again during
  verification. Incomplete results cannot weaken a failed execution to partial.
- Public output, export, and preview serving use declared ownership manifests.
  Raw evidence, logs, inventories, campaign ledgers, source copies, and provenance
  remain private; renderer-owned runtime assets remain available offline.
- Publication uses unique staging, filesystem locks, recovery journals, and
  rollback of output and private proof. Portal updates preserve child collections
  and consumer-owned files.
- Configuration validation, filesystem policy, and dependency planning have
  separate responsibilities, with errors before publication side effects.
- CI uses clean installs on Node 20, 22, and 24, npm 11.6.0, read-only permissions,
  and updated actions. Package tests install the actual tarball and its declared
  dependencies even inside the `npm pack --dry-run` lifecycle; installation
  failures cannot fall back to development copies.

### Migration and validation

- Private state defaults to `.reviewdocs/` outside published output. Existing
  consumers should preview migration, apply it, then explicitly rebuild stale
  artifacts. Historical proof retains its recorded toolkit version.
- Public JavaScript APIs and supported configuration names remain compatible;
  direct integrations with old generated state paths must adopt the new layout.
- Local checks cover evidence failure modes, two independent CLI writers,
  transaction recovery, package installation, deterministic builds, links, and
  Chromium navigation/help workflows.
- Real Docker/SchemaSpy and Mermaid producer integrations remain unverified on
  this host. An established consumer passed migration/build/check/verify, but its
  full export requires the missing optional SchemaSpy pages. Documentation checks
  do not establish backend or deployment acceptance.

## 0.4.0

- Expanded the toolkit with Foundation presentation, portable application help,
  source counts, and documentation/evidence workflows.
