# Worked example

A synthetic user enters “Review the draft”, saves version 1, reads it and approves version 1. The approval refers to that exact text. The user then adds “with the editor” and saves again: version 2 is pending, and version 1 remains in history.

A stale caller attempting to save against version 1 after version 2 exists receives a conflict. It must review version 2 before deliberately retrying. Follow the [user task](../user/complete-a-task.md) to see the actual controls.
