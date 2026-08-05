import assert from "node:assert/strict";
import { describe, test } from "vitest";

import type { PluginCategory } from "../../../../../tools/plugin-compiler/models/category.ts";
import {
  type ManifestSkill,
  SkillStatus,
  SkillVisibility,
} from "../../../../../tools/plugin-compiler/models/skill.ts";
import { validateSkillGraph } from "../../../../../tools/plugin-compiler/validation/validate-skill-graph.ts";

const categories: readonly PluginCategory[] = [
  {
    id: "engineering",
    name: "Engineering",
    description: "Engineering skills.",
  },
];

describe("validateSkillGraph", () => {
  test("reports one lifecycle error for one incompatible dependency edge", () => {
    // GIVEN: One active skill requires one archived skill.
    const owner = makeSkill({
      id: "active-owner",
      required_skills: [
        {
          skill_id: "archived-dependency",
          reason: "Historical behavior.",
          instructions: "Read the archived skill.",
        },
      ],
    });
    const dependency = makeSkill({
      id: "archived-dependency",
      visibility: SkillVisibility.Internal,
      status: SkillStatus.Archived,
      archive: { reason: "Historical." },
    });

    // WHEN: The graph is validated without a filesystem.
    const result = validateSkillGraph(categories, [owner, dependency]);

    // THEN: The dependency edge produces one unambiguous lifecycle error.
    const lifecycleErrors = result.errors.filter((error) =>
      error.includes('require archived skill "archived-dependency"'),
    );
    assert.deepEqual(lifecycleErrors, [
      'plugin/plugin.yml#/skills/0/required_skills/0/skill_id: non-archived skill "active-owner" cannot require archived skill "archived-dependency"',
    ]);
  });

  test("rejects an internal active replacement", () => {
    // GIVEN: Deprecated public guidance points to an internal active skill.
    const deprecated = makeSkill({
      id: "deprecated-skill",
      status: SkillStatus.Deprecated,
      deprecation: {
        reason: "A new workflow exists.",
        instructions: "Use internal-replacement.",
        replacement_skill_id: "internal-replacement",
      },
    });
    const replacement = makeSkill({
      id: "internal-replacement",
      visibility: SkillVisibility.Internal,
    });

    // WHEN: User-facing replacement guidance is validated.
    const result = validateSkillGraph(categories, [deprecated, replacement]);

    // THEN: A replacement must be both active and public.
    assert.ok(
      result.errors.includes(
        'plugin/plugin.yml#/skills/0/deprecation/replacement_skill_id: replacement skill "internal-replacement" must be active and public',
      ),
    );
  });
});

function makeSkill(
  overrides: Partial<ManifestSkill> & Pick<ManifestSkill, "id">,
): ManifestSkill {
  return {
    description: `Description for ${overrides.id}.`,
    category_id: "engineering",
    visibility: SkillVisibility.Public,
    status: SkillStatus.Active,
    required_skills: [],
    ...overrides,
  };
}
