# Write and save a note

## Before you begin

Open the demo using the separate synthetic test fixture. Use disposable example text.

## Steps

1. Enter “Review the draft” in **Draft text**.
2. Choose **Save revision**.
3. Read **Saved text** and the version status.

## Expected result

Version 1 contains your text and has status **Pending approval**. Saving does not record an {{approval}}.

## Recovery

An empty draft is rejected. If storage fails, the displayed saved state may already have changed in memory; inspect it before retrying. See [Troubleshooting](troubleshooting.md).
