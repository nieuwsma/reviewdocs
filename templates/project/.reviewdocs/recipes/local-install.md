# Repository-local toolkit installation

Install a pinned reviewdocs package/version in a dedicated tools/reviewdocs package.json and lockfile when the repository has no root npm package. Add a Make target invoking `node tools/reviewdocs/node_modules/reviewdocs/bin/reviewdocs.mjs check --config reviewdocs.config.mjs`.

CI installs with `npm ci --prefix tools/reviewdocs`. Review the proposed workflow recipe before merging it into existing CI. For development use a versioned package tarball; remote CI needs an accessible immutable package/revision, not an absolute sibling checkout or mutable npm link.

Run `reviewdocs adopt --dry-run`, then `reviewdocs adopt`. Existing documents/configuration are preserved; conflict proposals are in `.reviewdocs/proposals/`. Merge the proposed config with existing collections, keep finding IDs and configure real evidence inputs/commands. `reviewdocs upgrade` updates only unchanged managed procedures.
