export function makePluginCatalogFixture() {
  return {
    schema_version: 2,
    name: "fixture-skills",
    version: "1.2.3",
    description: "Fixture plugin description.",
    author: {
      name: "Fixture Owner",
      email: "owner@example.test",
      url: "https://example.test",
    },
    homepage: "https://example.test/readme",
    repository: "https://example.test/repository",
    license: "MIT",
    keywords: ["agent-skills", "fixtures"],
    marketplace: {
      name: "fixture",
      description: "Fixture marketplace.",
      plugin_description: "Installable fixture skills.",
      category: "development",
      keywords: ["agent-skills", "testing"],
    },
    categories: [
      {
        id: "engineering",
        name: "Engineering",
        description: "Engineering skills.",
      },
      {
        id: "productivity",
        name: "Productivity",
        description: "Productivity skills.",
      },
      { id: "empty", name: "Empty", description: "Reserved category." },
    ],
    skills: [
      {
        id: "review-code-change",
        category_id: "engineering",
        description: "Review changes safely.",
        visibility: "internal",
        status: "active",
        required_skills: [],
      },
      {
        id: "plan-task",
        category_id: "productivity",
        description: "Plan work.",
        visibility: "public",
        status: "draft",
        required_skills: [],
      },
      {
        id: "visualize-html",
        category_id: "productivity",
        description: "Create a polished HTML artifact.",
        visibility: "public",
        status: "active",
        required_skills: [
          {
            skill_id: "review-code-change",
            reason: "Provides review rules.",
            instructions: "Apply it before rendering.",
          },
        ],
      },
      {
        id: "old-visualizer",
        category_id: "productivity",
        description: "Create legacy visual artifacts.",
        visibility: "public",
        status: "deprecated",
        required_skills: [],
        deprecation: {
          reason: "Superseded by visualize-html.",
          instructions: "Use the replacement for new work.",
          replacement_skill_id: "visualize-html",
        },
      },
    ],
  };
}
