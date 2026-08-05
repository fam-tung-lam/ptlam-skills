import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_SKILLS_MARKER,
  composePublishedSkills,
} from "../../../../../tools/plugin-compiler/composition/skill-composer.mjs";

function makeSkill(overrides) {
  return {
    id: "base-skill",
    description: "Base skill description.",
    visibility: "internal",
    status: "active",
    required_skills: [],
    source_body: `# Base skill\n\n${REQUIRED_SKILLS_MARKER}\n\nApply the base workflow.\n`,
    resources: [],
    ...overrides,
  };
}

test("composes public skills with generated frontmatter and required context", () => {
  // Given
  const base = makeSkill({
    resources: [
      {
        path: "references/rules.md",
        content: "# Rules\n\nKeep the rule.\n",
      },
    ],
  });
  const flutter = makeSkill({
    id: "flutter-skill",
    description: "Use Flutter-specific testing tools.",
    visibility: "public",
    source_body: `# Flutter skill\n\n${REQUIRED_SKILLS_MARKER}\n\nApply Flutter overrides.\n`,
    required_skills: [
      {
        skill_id: "base-skill",
        reason: "Provides universal rules.",
        instructions: "Read it first and then apply Flutter overrides.",
      },
    ],
    resources: [],
  });

  // When
  const result = composePublishedSkills({ plugin: { skills: [base, flutter] } });
  const files = new Map(result.entries.map((entry) => [entry.path, entry.content]));

  // Then
  assert.deepEqual(result.publishedSkillIds, ["flutter-skill"]);
  assert.match(
    files.get("skills/flutter-skill/SKILL.md"),
    /name: flutter-skill\ndescription: Use Flutter-specific testing tools\./u,
  );
  assert.match(
    files.get("skills/flutter-skill/SKILL.md"),
    /\*\*Reason:\*\* Provides universal rules\./u,
  );
  assert.match(
    files.get("skills/flutter-skill/SKILL.md"),
    /\*\*Instructions:\*\* Read it first and then apply Flutter overrides\./u,
  );
  assert.match(
    files.get("skills/flutter-skill/SKILL.md"),
    /references\/required-skills\/base-skill\/SKILL\.md/u,
  );
  assert.equal(
    files.get(
      "skills/flutter-skill/references/required-skills/base-skill/references/rules.md",
    ),
    "# Rules\n\nKeep the rule.\n",
  );
  assert.doesNotMatch(
    files.get("skills/flutter-skill/SKILL.md"),
    /PLUGIN-COMPILER:REQUIRED-SKILLS/u,
  );
});

test("keeps transitive dependencies recursive and duplicates diamond leaves", () => {
  // Given
  const leaf = makeSkill({ id: "leaf-skill" });
  const left = makeSkill({
    id: "left-skill",
    required_skills: [
      {
        skill_id: "leaf-skill",
        reason: "Provides the shared leaf.",
        instructions: "Apply the leaf first.",
      },
    ],
  });
  const right = makeSkill({
    id: "right-skill",
    required_skills: [
      {
        skill_id: "leaf-skill",
        reason: "Provides the shared leaf.",
        instructions: "Apply the leaf first.",
      },
    ],
  });
  const root = makeSkill({
    id: "root-skill",
    visibility: "public",
    required_skills: [
      {
        skill_id: "left-skill",
        reason: "Provides the left workflow.",
        instructions: "Apply it before the root workflow.",
      },
      {
        skill_id: "right-skill",
        reason: "Provides the right workflow.",
        instructions: "Apply it before the root workflow.",
      },
    ],
  });

  // When
  const result = composePublishedSkills({
    plugin: { skills: [leaf, left, right, root] },
  });
  const paths = result.entries.map((entry) => entry.path);

  // Then
  assert.ok(
    paths.includes(
      "skills/root-skill/references/required-skills/left-skill/references/required-skills/leaf-skill/SKILL.md",
    ),
  );
  assert.ok(
    paths.includes(
      "skills/root-skill/references/required-skills/right-skill/references/required-skills/leaf-skill/SKILL.md",
    ),
  );
});

test("publishes deprecated skills but excludes internal draft and archived roots", () => {
  // Given
  const skills = [
    makeSkill({ id: "internal-skill" }),
    makeSkill({ id: "draft-skill", visibility: "public", status: "draft" }),
    makeSkill({
      id: "deprecated-skill",
      visibility: "public",
      status: "deprecated",
    }),
    makeSkill({
      id: "archived-skill",
      visibility: "public",
      status: "archived",
    }),
  ];

  // When
  const result = composePublishedSkills({ plugin: { skills } });

  // Then
  assert.deepEqual(result.publishedSkillIds, ["deprecated-skill"]);
  assert.deepEqual(
    result.entries.map((entry) => entry.path),
    ["skills/deprecated-skill/SKILL.md"],
  );
});
