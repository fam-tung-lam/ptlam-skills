export function makePluginCatalogFixture() {
  return {
    schema_version: 1,
    metadata: {
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
    },
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
        title: "Engineering",
        description: "Engineering skills.",
      },
      {
        id: "productivity",
        title: "Productivity",
        description: "Productivity skills.",
      },
      { id: "empty", title: "Empty", description: "Reserved category." },
    ],
    skills: [
      {
        id: "test-review-change",
        category_id: "engineering",
        kind: "test",
        summary: "Review a small change.",
        required_skill_ids: [],
        path: "skills/engineering/test-review-change",
        frontmatter: {
          name: "test-review-change",
          description: "Review changes safely.",
        },
      },
      {
        id: "plan-task",
        category_id: "productivity",
        kind: "test",
        summary: "Turn one goal into a plan.",
        required_skill_ids: [],
        path: "skills/productivity/plan-task",
        frontmatter: {
          name: "plan-task",
          description: "Plan work.",
        },
      },
      {
        id: "visualize-html",
        category_id: "productivity",
        kind: "product",
        summary: "Create a polished HTML artifact.",
        required_skill_ids: ["test-review-change"],
        path: "skills/productivity/visualize-html",
        frontmatter: {
          name: "visualize-html",
          description: "Create HTML artifacts.",
        },
      },
    ],
  };
}
