# Guide maintenance

The fixture is the actual synthetic browser application, with local storage rather than a server. Node workflow tests exercise its production state functions. They do not verify browser rendering, persistence permissions or screenshots.

Run the optional browser check with an installed Playwright module to validate navigation, glossary focus, narrow layout, help links, print and the demo's controls. Chromium could not launch in the implementation session's macOS sandbox, so browser acceptance and new raster screenshot capture remain unrun there.

A consuming product must supply its own synthetic capture harness and a screenshot manifest matching the packaged schema. Do not reuse this demonstration's identifiers, selectors or proof claims for another application. Read text and inspect captures together; record real-stack walkthrough acceptance separately.
