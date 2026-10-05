export default {
  collections: [
    {
      id: "reference",
      title: "Example System Reference",
      subtitle: "Current behavior and architecture",
      sourceDir: "docs/system",
      outputDir: "docs/generated/reference",
      pages: [
        { file: "README.md", output: "index.html", label: "Start here" },
        { file: "architecture.md", label: "Architecture" }
      ],
      artifacts: [
        { label: "Engineering review", href: "../review/index.html" },
        { label: "API browser", href: "../api/index.html" },
        { label: "Code inventory", href: "../inventory.json" }
      ],
      rewrites: { "../reviews/README.md": "../review/index.html" }
    },
    {
      id: "review",
      title: "Example Engineering Review",
      subtitle: "Evidence, findings, and release posture",
      sourceDir: "docs/reviews",
      outputDir: "docs/generated/review",
      pages: [
        { file: "README.md", output: "index.html", label: "Review index" },
        { file: "findings-register.md", label: "Findings register" }
      ],
      artifacts: [
        { label: "System reference", href: "../reference/index.html" }
      ],
      rewrites: { "../system/README.md": "../reference/index.html" }
    }
  ],
  openapi: [
    { id: "api", title: "Example API", source: "api/openapi.json", outputDir: "docs/generated/api" }
  ],
  inventory: {
    id: "inventory",
    root: ".",
    output: "docs/generated/inventory.json"
  }
};
