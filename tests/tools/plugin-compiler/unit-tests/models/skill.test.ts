import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  createSkillSnapshot,
  SkillStatus,
  SkillVisibility,
} from "../../../../../tools/plugin-compiler/models/skill.ts";

describe("createSkillSnapshot", () => {
  it("protects requirements lifecycle metadata and resource bytes", () => {
    // GIVEN: Mutable validated skill values and one binary resource exist.
    const requirement = {
      skill_id: "core-skill",
      reason: "Core rules.",
      instructions: "Read first.",
    };
    const resourceBytes = Buffer.from("# Example\n");

    // WHEN: A snapshot is created and every mutable input or returned copy changes.
    const skill = createSkillSnapshot({
      id: "alpha-skill",
      description: "Alpha description.",
      category_id: "engineering",
      visibility: SkillVisibility.Public,
      status: SkillStatus.Deprecated,
      required_skills: [requirement],
      deprecation: {
        reason: "A replacement is available.",
        instructions: "Use beta-skill.",
        replacement_skill_id: "beta-skill",
      },
      source_path: "plugin/skills/alpha-skill",
      source_body: "# Alpha\n",
      resources: [{ path: "references/example.md", content: resourceBytes }],
    });
    requirement.reason = "Changed";
    resourceBytes[0] = 0;
    const firstRead = skill.resources[0]?.content;
    assert.ok(firstRead);
    firstRead[0] = 0;

    // THEN: Enum values and every nested snapshot remain stable and immutable.
    assert.equal(skill.visibility, SkillVisibility.Public);
    assert.equal(skill.status, SkillStatus.Deprecated);
    assert.equal(skill.required_skills[0]?.reason, "Core rules.");
    assert.equal(skill.resources[0]?.content.toString("utf8"), "# Example\n");
    for (const value of [
      skill,
      skill.required_skills,
      skill.required_skills[0],
      skill.deprecation,
      skill.resources,
      skill.resources[0],
    ]) {
      assert.equal(Object.isFrozen(value), true);
    }
  });
});
