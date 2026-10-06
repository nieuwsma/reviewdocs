# Evidence matrix

Consumer-owned command matrix. Replace every placeholder before the first campaign; keep this file outside toolkit-managed skill resources. Keep commands explicit so later campaigns remain comparable.

`<api-id>` and `<database-id>` are the `id` values in `reviewdocs.config.mjs`. `npx reviewdocs check` rebuilds the selected artifacts, then confirms that collections and OpenAPI are stable across a second build and that collection links resolve. It does not compare the output with git. `build` is enough when you only need the inventory, diagrams, or database docs.

| Evidence | Command | Retained output | Required? |
|---|---|---|---|
| Unit tests | `<unit-test-command>` | `docs/generated/coverage/unit-test.log` | Yes |
| Race or concurrency tests | `<race-test-command>` | `docs/generated/coverage/race-test.log` | When supported |
| Integration tests | `<integration-test-command>` | `docs/generated/coverage/integration-test.log` | Yes |
| Browser tests and accessibility | `<browser-test-command>` | `docs/generated/coverage/browser/` | For browser applications |
| Static analysis | `<static-analysis-command>` | `docs/generated/coverage/static-analysis.log` | Yes |
| OpenAPI validation | `npx reviewdocs check --only <api-id>` | `docs/generated/api/` | For public APIs |
| Database schema | `npx reviewdocs build --only <database-id>` | `docs/generated/database/` | For relational stores |
| Source inventory | `npx reviewdocs build --only inventory` | `docs/generated/inventory.json` | Yes |
| Documentation | `npx reviewdocs check` | `docs/generated/` | Yes |
| Deployed schema drift | `<read-only-schema-comparison-command>` | `docs/review/schema-drift.md` | When a deployment is available |

For each command, record whether it executed fully, passed, failed, or could not run. Never present skipped database tests or mocked browser tests as full-stack proof.
