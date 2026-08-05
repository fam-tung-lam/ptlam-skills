import assert from "node:assert/strict";
import test from "node:test";

import { Category } from "../../../../../tools/plugin-compiler/models/category.mjs";
import { Plugin } from "../../../../../tools/plugin-compiler/models/plugin.mjs";
import { PluginMetadata } from "../../../../../tools/plugin-compiler/models/plugin-metadata.mjs";
import { Skill } from "../../../../../tools/plugin-compiler/models/skill.mjs";
import { SkillFrontmatter } from "../../../../../tools/plugin-compiler/models/skill-frontmatter.mjs";
import { SkillRequirement } from "../../../../../tools/plugin-compiler/models/skill-requirement.mjs";
import { SkillResource } from "../../../../../tools/plugin-compiler/models/skill-resource.mjs";

test("Plugin snapshots the complete v2 source model as immutable values", () => {
  // Given
  const input = {
    schema_version: 2,
    name: "fixture-skills",
    description: "Fixture plugin.",
    version: "1.2.3+1",
    author: { name: "Fixture Owner" },
    homepage: "https://example.test/readme",
    repository: "https://example.test/repository",
    license: "MIT",
    keywords: ["agent-skills"],
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
        name: "Engineering",
        description: "Engineering skills.",
      },
    ],
    skills: [
      {
        id: "alpha-skill",
        description: "Alpha description.",
        category_id: "engineering",
        visibility: "public",
        status: "active",
        required_skills: [
          {
            skill_id: "core-skill",
            reason: "Core rules.",
            instructions: "Read first.",
          },
        ],
        source_path: "plugin/skills/alpha-skill",
        source_body: "# Alpha\n",
        resources: [
          { path: "references/example.md", content_base64: "IyBFeGFtcGxlCg==" },
        ],
      },
    ],
  };

  // When
  const plugin = new Plugin(input);
  input.author.name = "Changed";
  input.keywords.push("changed");
  input.skills[0].required_skills[0].reason = "Changed";

  // Then
  const skill = plugin.skills[0];
  assert.ok(plugin.metadata instanceof PluginMetadata);
  assert.ok(plugin.categories[0] instanceof Category);
  assert.ok(skill instanceof Skill);
  assert.ok(skill.frontmatter instanceof SkillFrontmatter);
  assert.ok(skill.required_skills[0] instanceof SkillRequirement);
  assert.ok(skill.resources[0] instanceof SkillResource);
  assert.equal(plugin.author.name, "Fixture Owner");
  assert.deepEqual(plugin.keywords, ["agent-skills"]);
  assert.equal(skill.required_skills[0].reason, "Core rules.");
  assert.equal(skill.path, "skills/alpha-skill");
  assert.deepEqual(skill.resource_paths, ["references/example.md"]);
  const firstRead = skill.resources[0].content;
  firstRead[0] = 0;
  assert.equal(skill.resources[0].content.toString("utf8"), "# Example\n");

  for (const value of [
    plugin,
    plugin.author,
    plugin.keywords,
    plugin.metadata,
    plugin.categories,
    plugin.categories[0],
    plugin.skills,
    skill,
    skill.frontmatter,
    skill.required_skills,
    skill.required_skills[0],
    skill.resources,
    skill.resources[0],
    skill.resource_paths,
  ]) {
    assert.equal(Object.isFrozen(value), true);
  }
});
