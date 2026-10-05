# Evidence matrix

Replace every placeholder before the first campaign. Keep commands explicit so later campaigns remain comparable.

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
