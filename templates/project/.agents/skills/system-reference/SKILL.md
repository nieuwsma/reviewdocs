---
name: system-reference
description: Author or maintain an implementation-backed system manual covering architecture, domain relationships, state, contracts and recovery. Use for durable factual documentation; engineering findings belong in evidence-review.
---

# System reference

Read and apply the [shared documentation policy](../../references/documentation-policy.md). Resolve paths from the consumer configuration.

Read the repository's documentation configuration and current reference before changing its structure. Preserve user-selected audiences and scope. Use [the topic guide](references/topic-guide.md) to identify missing explanation; adapt topics to the product rather than manufacturing unused components.

Trace claims to executable source, migrations, contracts and tests. Planning notes, handovers and old reviews help discovery but cannot establish current behavior. Build a claim/source matrix as working evidence. Describe the domain and authority before table names. Explain state, dependent results, failure and retry alongside success.

Create diagrams when they clarify context, conceptual relationships, sequence or lifecycle. Give each diagram a purpose, alt text, caption, legend and source filename citation. Keep conceptual diagrams separate from ERDs. Use the shared glossary to explain ambiguous terms consistently.

Follow one coherent synthetic worked example through inputs, decisions and observable results. Link operator runbooks and task guides without importing critique or severity into factual prose. Clearly distinguish implemented, illustrative, proposed and unverified behavior.

For code size, configure first-party inventory roots and publish `{{inventory-report}}` in the codebase page. Show file types, physical and nonblank lines, and tests separately. Explain that comments count; exclude dependencies, generated snapshots, docs, data and runtime files. Use generated counts rather than handwritten totals, and keep source size separate from review coverage.

Publish source pages through configured collections. Regenerate changed schema/contracts/diagrams explicitly; a Markdown rebuild does not refresh evidence. Run `reviewdocs check`, then `reviewdocs verify` against the intended inputs. Report omissions and stale/unavailable artifacts. Finally read the manual without the engineering review open: the reader should be able to explain ownership, state and recovery.
