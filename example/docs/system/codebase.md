# Codebase map

The demonstration's production seam is `docs/user/assets/demo/workflow.js`, invoked by the actual browser controls in the adjacent `index.html`. `test-workflow.mjs` exercises revisions, approval invalidation and stale saves in Node, without a browser or persistent storage.

[Code inventory](../generated/inventory.json) excludes generated output and dependencies. Browser navigation, screenshots and workflow acceptance are separate gates; a passing Node test does not establish those outcomes.

{{inventory-report}}
