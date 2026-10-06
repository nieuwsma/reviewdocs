# Workflows and state

## Save then approve

A new note starts at version zero. Saving nonempty text creates version one. The user reads the saved result and approves that exact version. A subsequent save creates version two and clears approval.

| State | Trigger | Result |
| --- | --- | --- |
| Unsaved | Save nonempty text | Saved version 1 |
| Saved | Approve current version | Approved current version |
| Approved | Save new text | New pending revision |
| Any saved state | Save with stale version | Conflict; history unchanged |

## Failure and retry

The form uses the displayed version as a precondition. On a conflict, refresh before deciding whether to retry. An ambiguous persistence error does not mean the workflow action was rolled back: inspect displayed saved state before repeating it.
