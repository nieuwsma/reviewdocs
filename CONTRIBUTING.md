# Contributing

Usage for a consuming repository is in [README.md](README.md).

Use Node.js 20 or newer. Install dependencies with `npm install --omit=optional`, then run `npm run check` before submitting a change.

Keep the core free of product and organization assumptions. New integrations should be driven by configuration or isolated adapters. Tests must use synthetic data and disposable resources.

Generated example output is ignored. Source templates, configuration examples, tests, and lockfiles are reviewed and committed.
