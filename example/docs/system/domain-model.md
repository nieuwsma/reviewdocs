# Domain model

A note has one stable identity, an ordered series of immutable {{revision|revisions}}, and an optional approval of its current revision. A draft is unsaved intent. It does not change the current saved revision.

| Concept | Relationship | Authority |
| --- | --- | --- |
| Draft | Proposed text based on a displayed version | User/browser form |
| Revision | Immutable text with a monotonically increasing version | Workflow |
| Approval | Explicit decision tied to one saved version | User action through workflow |

Saving changed text creates a revision and clears prior approval. Approving a draft without saving it is unavailable. The workflow rejects saving against a version that is no longer current.
