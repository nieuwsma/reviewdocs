export default {
  collections: [
    {
      id: "reference",
      title: "Project System Reference",
      subtitle: "Current behavior and architecture",
      sourceDir: "docs/reference",
      outputDir: "docs/generated/reference",
      pages: [
        { file: "README.md", output: "index.html", label: "Start here" },
        { file: "architecture.md", label: "Architecture" }
      ],
      artifacts: [{ label: "Engineering review", href: "../review/index.html" }]
    },
    {
      id: "review",
      title: "Project Engineering Review",
      subtitle: "Evidence, findings, and release posture",
      sourceDir: "docs/review",
      outputDir: "docs/generated/review",
      pages: [
        { file: "README.md", output: "index.html", label: "Review index" },
        { file: "executive-summary.md", label: "Executive summary" },
        { file: "findings-register.md", label: "Findings register" }
      ],
      artifacts: [{ label: "System reference", href: "../reference/index.html" }]
    }
  ],
  inventory: { id: "inventory", root: ".", output: "docs/generated/inventory.json" }
};
