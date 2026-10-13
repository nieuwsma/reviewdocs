# ReviewDocs maintainer instructions

ReviewDocs publishes consumer-authored documentation and review evidence. It does not write engineering judgments or certify product releases.

Keep module responsibilities clear: configuration normalization/validation and dependency planning precede producers; producers render into staging; transactions publish output with private provenance; delivery exposes generator-owned public files. Preserve existing public signatures unless the task explicitly changes them, and document state-layout migrations.

Preserve pre-existing dirty work and consumer-owned configuration, documentation, commands, findings and history. Adoption and upgrade may propose conflicts; they must not overwrite local customization. Resolve consumer paths from configuration rather than prescribing starter directories.

Use synthetic fixtures for destructive, recovery and evidence tests. Treat optional Mermaid/browser and Docker/SchemaSpy integrations as explicit gates, and report their absence. Never use live customer data or modify unrelated services. Documentation tests are not backend or deployment acceptance.

Run targeted regressions while changing behavior, then `npm run check`, browser validation and an actual tarball consumer install. Keep package and lockfile versions consistent. Release requires passing remote CI and task authorization to commit, tag, push or publish; implementation alone does not authorize release.

Skill installation does not authorize a review or product remediation. Follow the user's task scope without inventing additional approval steps for routine local work.
