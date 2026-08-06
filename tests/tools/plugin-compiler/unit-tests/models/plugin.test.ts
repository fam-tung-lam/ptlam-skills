import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  createPluginSnapshot,
  PluginSchemaVersion,
  type PluginSnapshotInput,
} from "../../../../../tools/plugin-compiler/models/plugin.ts";
import {
  SkillStatus,
  SkillVisibility,
} from "../../../../../tools/plugin-compiler/models/skill.ts";

describe("createPluginSnapshot", () => {
  it("snapshots the complete validated source graph as immutable values", () => {
    // GIVEN: Mutable validated plugin metadata and one inspected skill exist.
    const input = {
      schema_version: PluginSchemaVersion.V1,
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
          visibility: SkillVisibility.Public,
          status: SkillStatus.Active,
          required_skills: [],
          source_path: "plugin/skills/alpha-skill",
          source_body: "# Alpha\n",
          resources: [],
        },
      ],
    } satisfies PluginSnapshotInput;

    // WHEN: The canonical snapshot is created and the source values are mutated.
    const plugin = createPluginSnapshot(input);
    input.author.name = "Changed";
    input.keywords.push("changed");

    // THEN: The aggregate owns stable copies and delegates skill construction.
    const skill = plugin.skills[0];
    assert.ok(skill);
    assert.equal(plugin.author.name, "Fixture Owner");
    assert.deepEqual(plugin.keywords, ["agent-skills"]);
    assert.equal(skill.id, "alpha-skill");
    for (const value of [
      plugin,
      plugin.author,
      plugin.keywords,
      plugin.marketplace,
      plugin.marketplace.keywords,
      plugin.categories,
      plugin.categories[0],
      plugin.skills,
      skill,
    ]) {
      assert.equal(Object.isFrozen(value), true);
    }
  });
});
