# Guide maintenance

## Source and capture contract

User chapters are maintained once and projected into standalone documentation and an optional app-help bundle. Contributor-only paragraphs use explicit audience blocks.

Capture the real UI with product-owned synthetic fixtures on an isolated loopback server. Assert the intended controls/state before each image; do not use fixed sleeps or modify product behavior for a screenshot. Record file, chapter, alt text, image hash, viewport, capture mode and input fingerprint using the packaged screenshot schema.

## Refresh and review

Run the repository-owned capture command explicitly, visually inspect every image for errors/loading/clipped controls, then run `reviewdocs check`. HTML generation does not silently recapture images.

## Walkthrough acceptance

Run representative documented tasks through an authorized isolated real stack, including permissions, stale-state conflicts and failed-work recovery. Record actual results separately from fixture-rendered illustration. Check desktop, narrow screen, keyboard navigation and print. Screenshot tests do not certify real mutations, model inference or deployed authentication.
