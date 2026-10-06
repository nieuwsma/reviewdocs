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
export default {
  portable: true,
  landing: { id: "portal", title: "Project documentation", outputDir: "docs/generated" },
  collections: [
    {
      id: "reference", title: "Project System Reference", subtitle: "Current behavior and architecture",
      sourceDir: "docs/reference", outputDir: "docs/generated/reference", glossary: "docs/reference/glossary.json",
      pages: referencePages,
      topics: referencePages.slice(1).map(page => ({ id: page.file.replace(".md", ""), page: page.file })),
      artifacts: [{ label: "Engineering review", href: "../review/index.html" }, { label: "User guide", href: "../user/index.html" }]
    },
    {
      id: "review", title: "Project Engineering Review", subtitle: "Evidence, findings and release posture",
      sourceDir: "docs/review", outputDir: "docs/generated/review",
      pages: [
        { file: "README.md", output: "index.html", label: "Review index", group: "Campaign" },
        { file: "executive-summary.md", label: "Executive summary" },
        { file: "findings-register.md", label: "Findings and history" },
        { file: "design-review.md", label: "Design synthesis" },
        { file: "code-review.md", label: "Code synthesis" },
        ...["data-and-contracts", "workflow-and-recovery", "frontend-and-operations", "testing-and-acceptance"].map(name => ({ file: `tracks/${name}.md`, label: name.replaceAll("-", " "), group: "Review tracks" })),
        { file: "campaign-protocol.md", label: "Campaign protocol", group: "Method" },
        { file: "evidence-matrix.md", label: "Evidence matrix" }
      ],
      artifacts: [{ label: "System reference", href: "../reference/index.html" }, { label: "User guide", href: "../user/index.html" }, { label: "Structured campaign", href: "../campaign/index.html" }]
    },
    {
      id: "user", title: "Project User Guide", subtitle: "Tasks, expected results and recovery",
      sourceDir: "docs/user", outputDir: "docs/generated/user", glossary: "docs/reference/glossary.json",
      guide: true, screenshots: true,
      pages: [...userPages, { file: "maintenance.md", label: "Guide maintenance", group: "Contributors" }],
      artifacts: [{ label: "System reference", href: "../reference/index.html" }]
    },
    {
      id: "help", title: "Project Help", subtitle: "Bundled application help",
      sourceDir: "docs/user", outputDir: "docs/generated/help", glossary: "docs/reference/glossary.json",
      guide: true, bundled: true, screenshots: true, audience: "user", pages: userPages
    }
  ],
  campaign: { id: "campaign", source: "docs/review/campaign.json", outputDir: "docs/generated/campaign" },
  inventory: { id: "inventory", root: ".", output: "docs/generated/inventory.json" },
  // Add real production input roots to evidence lanes; builds never execute them.
  evidence: [],
  screenshots: [],
  provenance: { required: true }
};
