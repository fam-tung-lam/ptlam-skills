import assert from "node:assert/strict";
import test from "node:test";

import { Category } from "../../../../../tools/plugin-compiler/models/category.mjs";
import { Plugin } from "../../../../../tools/plugin-compiler/models/plugin.mjs";
import { PluginMetadata } from "../../../../../tools/plugin-compiler/models/plugin-metadata.mjs";
import { Skill } from "../../../../../tools/plugin-compiler/models/skill.mjs";
import { SkillFrontmatter } from "../../../../../tools/plugin-compiler/models/skill-frontmatter.mjs";

test("Plugin exposes the complete catalog as immutable domain values", () => {
  // Given
  const plugin = new Plugin({
    schema_version: 1,
    metadata: {
      name: "fixture-skills",
      version: "1.2.3",
      description: "Fixture plugin.",
      author: { name: "Fixture Owner" },
      homepage: "https://example.test/readme",
      repository: "https://example.test/repository",
      license: "MIT",
      keywords: ["agent-skills"],
    },
    marketplace: {
      name: "fixture",
      description: "Fixture marketplace.",
      plugin_description: "Fixture listing.",
      category: "development",
      keywords: ["agent-skills"],
    },
    categories: [
      {
        id: "engineering",
        title: "Engineering",
        description: "Engineering skills.",
      },
    ],
    skills: [
      {
        id: "alpha-skill",
        category_id: "engineering",
        kind: "product",
        summary: "Alpha summary.",
        required_skill_ids: [],
        path: "skills/engineering/alpha-skill",
        frontmatter: {
          name: "alpha-skill",
          description: "Alpha description.",
        },
      },
    ],
  });

  // When
  const skill = plugin.skills[0];

  // Then
  assert.ok(plugin instanceof Plugin);
  assert.ok(plugin.metadata instanceof PluginMetadata);
  assert.ok(plugin.categories[0] instanceof Category);
  assert.ok(skill instanceof Skill);
  assert.ok(skill.frontmatter instanceof SkillFrontmatter);
  assert.equal(skill.category_id, "engineering");
  assert.deepEqual(skill.required_skill_ids, []);
  assert.equal(plugin.marketplace.plugin_description, "Fixture listing.");

  for (const value of [
    plugin,
    plugin.metadata,
    plugin.metadata.author,
    plugin.metadata.keywords,
    plugin.marketplace,
    plugin.marketplace.keywords,
    plugin.categories,
    plugin.categories[0],
    plugin.skills,
    skill,
    skill.required_skill_ids,
    skill.frontmatter,
  ]) {
    assert.equal(Object.isFrozen(value), true);
  }
});
