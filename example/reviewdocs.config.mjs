import { existsSync } from "node:fs";
const hasCaptures = existsSync(new URL("./docs/user/assets/screenshots/manifest.json", import.meta.url));
const referencePages = [
  { file: "README.md", output: "index.html", label: "Start here", group: "System reference" },
  ...["architecture", "domain-model", "workflows", "data-model", "api", "operations", "codebase", "worked-example"].map(name => ({ file: `${name}.md`, label: name.replaceAll("-", " ") })),
  { file: "glossary.md", label: "Glossary", glossary: true }
];
const userPages = [
  { file: "README.md", output: "index.html", label: "Choose a task", group: "User guide" },
  ...["getting-started", "complete-a-task", "review-and-approve", "troubleshooting"].map(name => ({ file: `${name}.md`, label: name.replaceAll("-", " ") })),
  { file: "glossary.md", label: "Glossary", glossary: true }
];
if (hasCaptures) userPages.push({ file: "screenshots.md", label: "Illustrated demo" });
export default {
  portable: true,
  landing: { id: "portal", title: "Note Desk documentation", outputDir: "docs/generated" },
  collections: [
    {
      id: "reference", title: "Note Desk System Reference", subtitle: "Current behavior and architecture",
      assets: ["assets"], strict: true, sourceDir: "docs/system", outputDir: "docs/generated/reference", glossary: "docs/system/glossary.json",
      pages: referencePages,
      topics: referencePages.slice(1).map(page => ({ id: page.file.replace(".md", ""), page: page.file })),
      artifacts: [{ label: "Engineering review", href: "../review/index.html" }, { label: "User guide", href: "../user/index.html" }]
    },
    {
      id: "review", title: "Note Desk Engineering Review", subtitle: "Evidence, findings and release posture",
      strict: true, sourceDir: "docs/reviews", outputDir: "docs/generated/review",
      pages: [
        { file: "README.md", output: "index.html", label: "Review index", group: "Campaign" },
        { file: "executive-summary.md", label: "Executive summary" },
        { file: "findings-register.md", label: "Findings and history" },
        { file: "design-review.md", label: "Design synthesis" },
        { file: "code-review.md", label: "Code synthesis" },
        ...["data-and-contracts", "workflow-and-recovery", "frontend-and-operations", "testing-and-acceptance"].map(name => ({ file: `tracks/${name}.md`, label: name.replaceAll("-", " "), group: "Review tracks" })),
        { file: "campaign-protocol.md", label: "Campaign protocol", group: "Method" }
      ],
      artifacts: [{ label: "System reference", href: "../reference/index.html" }, { label: "User guide", href: "../user/index.html" }, { label: "Structured campaign", href: "../campaign/index.html" }]
    },
    {
      id: "user", title: "Note Desk User Guide", subtitle: "Tasks, expected results and recovery",
      assets: ["assets"], strict: true, sourceDir: "docs/user", outputDir: "docs/generated/user", glossary: "docs/system/glossary.json",
      guide: true, screenshots: true,
      pages: [...userPages, { file: "maintenance.md", label: "Guide maintenance", group: "Contributors" }],
      artifacts: [{ label: "System reference", href: "../reference/index.html" }]
    },
    {
      id: "help", title: "Note Desk Help", subtitle: "Bundled application help",
      assets: ["assets"], strict: true, sourceDir: "docs/user", outputDir: "docs/generated/help", glossary: "docs/system/glossary.json",
      guide: true, bundled: true, screenshots: true, audience: "user", pages: userPages
    }
  ],
  campaign: { strictNarrative: true, id: "campaign", source: "docs/reviews/campaign.json", outputDir: "docs/generated/campaign" },
  inventory: { id: "inventory", root: ".", output: "docs/generated/inventory.json" },
  // Add real production input roots to evidence lanes; builds never execute them.
  openapi: [{ id: "api", title: "Illustrative API contract", source: "api/openapi.json", outputDir: "docs/generated/api" }],
  evidence: [{ id: "workflow-tests", proof: "mocked", cwd: ".", inputs: ["docs/user/assets/demo/workflow.js", "test-workflow.mjs"], command: ["node", "test-workflow.mjs"], outputDir: "docs/generated/evidence/workflow-tests", outputs: ["result.json"], resultFile: "result.json", requireNoSkips: true }],
  screenshots: hasCaptures ? [{ id: "guide-shots", manifest: "docs/user/assets/screenshots/manifest.json", assets: "docs/user/assets/screenshots", inputs: ["docs/user/assets/demo"] }] : [],
  provenance: { required: true }
};
