# Code and design review

This is the method for a full review. The evidence matrix lists the commands. The findings register is the canonical list of judgments. `reviewdocs` publishes the pages. It does not decide them.

Create or replace these pages, then add both to the review collection `pages` in `reviewdocs.config.mjs`:

- `docs/review/design-review.md`
- `docs/review/code-review.md`

Use the headings below, in this order. Cite files and symbols. Do not paste credentials, row data, customer data, private keys, or live identifiers. Do not treat a handover, a planning note, or an earlier review as proof of current behavior.

A finding is one incorrect or risky behavior, with a stable ID. Record it in the findings register and discuss that same ID in the design review or the code review. A row that appears in only one of those places is incomplete. A style preference, a naming nit, or a missing comment is not a finding. If a section has no established finding, say what was checked and what remains unverified. Do not invent defects to fill the page.

## Coverage

Review the whole product. Open every first-party production file. A review that stops after one package is incomplete.

First-party production files are this repository's programs, libraries, migrations, contracts, deployment manifests, operational scripts, and the documents that describe current behavior. Tests are opened for what they execute, mock, and skip. Design in scope is the behavior the code implements and the current architecture, operations, contract, and schema documents.

Do not review imported code. That is a dependency fetched from outside this repository, a `replace` or path dependency whose source is outside this tree, `vendor/`, `node_modules/`, or a virtualenv. Do not review generated build output. Do not review a planning backlog, a handover, or `docs/review/` as the implementation.

In Sources read, name every first-party production file that was opened. A directory name does not count. The review is unfinished while any first-party production file is unopened.

## Design review

### Scope

State which behaviors were reviewed and which were left out. Name the commit.

### Responsibilities and boundaries

State which component owns each decision. Name every boundary where work crosses a process, a trust zone, or a repository. Say what the design explicitly does not do.

### Trust and authority

State how callers are authenticated and authorized, which component enforces the decision, and which checks exist only in a client. Include worker, operator, and browser authority when those roles exist.

### Data and invariants

State what is stored, what is derived, and which identities and revisions are stable. Include deletion, retention, and any invariant the rest of the system assumes. Compare this account with the schema documentation when it exists.

### Failure

State what happens on an invalid input, a lost dependency, a partial write, and a retry. Distinguish failures the code reports from failures it drops or leaves half-finished.

### Concurrency

State how concurrent work is claimed, leased, ordered, and made idempotent. Say which of those paths were executed and which were only read.

### Contracts

Compare the implemented routes and schema with the published API and database docs. List routes or tables present on only one side.

### Operations

State how the system is run and which operational claims were executed. A command recorded for an older commit is not a result of this campaign.

## Code review

### Sources read

Name every first-party production file Coverage requires. A directory name does not count.

### Behavior traced

For each major behavior, name the entry point and the path through the code. Mark any claim that comes only from a comment or a document.

### Defects

For each finding, give the ID, the file, the incorrect behavior, the consequence, and how it was established: code read, a failing test, or unable to verify. Severity and confidence match the register. Include defects whose only current evidence is a doc that will mislead an operator. Do not stop after the first documentation mismatch.

### Tests

State what the tests execute, what they mock, and which claims they do not prove. Take the commands and results from the evidence matrix. A skipped or mocked run is not full-stack proof.

### Documentation drift

List where the system reference, the handover, or a published contract disagrees with the code traced above.
