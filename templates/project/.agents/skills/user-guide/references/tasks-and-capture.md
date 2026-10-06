# Tasks and capture

For each task answer:

1. Who may perform it, and what state/input/access must exist first?
2. Which actual controls are used in what order?
3. What result is saved, how can the user confirm it, and what related state changes?
4. What happens on missing permission, stale revision, lost response or failed work?
5. When should the user stop and ask an administrator for help?

Maintain a task index and symptom/check/recovery troubleshooting table. Use a coherent synthetic scenario across chapters. Explain the difference between saving, recording a disposition and approving when the product has those distinctions.

The repository owns selectors, fixtures, routes and capture commands. Launch an isolated server that refuses reuse of an unrelated service, block unexpected network calls, disable animation and assert visible state before capture. Never change application behavior solely to make a screenshot. Record `formatVersion`, `source.inputHash`, `mode`, `viewport` and screenshot `file`, `chapter`, `alt`, `sha256` using `schemas/screenshots.schema.json` in the installed package. Calculate hashes with the exported provenance helpers or Node crypto.

Review loading/errors, clipped essential controls, label drift, coherent fixture identities, alt text, full-size readability and narrow layouts. Screenshot checks certify rendering only. Workflow acceptance additionally exercises real persistence, effective roles, conflicts, retries and observable final state in an authorized isolated environment. Keep missing proof explicit.

For app help, configure an audience `user`, a bundled collection and only guide/glossary pages/assets. An unknown help path must return 404, not the application SPA. Regenerate the bundle in the application's release build so it matches that release.
