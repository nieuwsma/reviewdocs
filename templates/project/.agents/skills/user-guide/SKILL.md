---
name: user-guide
description: Create or maintain task-based user documentation, troubleshooting and bundled app help using the current UI and reproducible synthetic screenshots. Use for product user manuals, not architecture critique or standalone UI mockups.
---

# User guide

Read and apply the [shared documentation policy](../../references/documentation-policy.md). Resolve paths from the consumer configuration.

Read the documentation config and current UI, routes and permissions. Identify the reader's tasks and actual controls. Use [the task and capture procedure](references/tasks-and-capture.md) when authoring chapters or adapting a capture harness.

Write prerequisites, numbered actions, expected saved state and recovery for each task. Explain effects on dependent work and human approval. Do not make users read source code or the architecture reference to finish a task. Keep administrator handoffs explicit and deployment URLs configurable.

Capture the real application rendered with product-owned synthetic fixtures. Assert the intended controls/state before capturing; inspect every image alongside its text. Reuse consistent example data. Use the packaged screenshot manifest contract and fingerprint the production UI/fixture inputs; HTML generation must not silently recapture assets.

Author once and project to standalone user documentation and optional finite app help. Contributor sections use explicit `:::audience contributor` blocks. Never remove instructions merely because a paragraph contains an implementation link. In app help, retain all prerequisites, actions, outcomes and recovery; resolve every surviving chapter, glossary and asset link within the bundle.

Run `reviewdocs check` and verify screenshots/current control names. Run representative walkthroughs through an authorized isolated real stack separately from illustration capture. Record permissions, conflict and recovery results plus unrun acceptance. Do not present mocked rendering as proof of authentication, mutations or model inference.
