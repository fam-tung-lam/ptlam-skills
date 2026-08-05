import assert from "node:assert/strict";
import { describe, test } from "vitest";
import type { CompilerSkill } from "../../../../tools/plugin-compiler/models/skill.ts";
import {
  composePublishedSkills,
  REQUIRED_SKILLS_MARKER,
} from "../../../../tools/plugin-compiler/skill-composer.ts";

function makeSkill(overrides: Partial<CompilerSkill> = {}): CompilerSkill {
  return {
    id: "base-skill",
    description: "Base skill description.",
    category_id: "engineering",
    visibility: "internal",
    status: "active",
    required_skills: [],
    source_body: `# Base skill\n\n${REQUIRED_SKILLS_MARKER}\n\nApply the base workflow.\n`,
    resources: [],
    ...overrides,
  };
}

function stringContent(
  files: ReadonlyMap<string, string | Buffer>,
  path: string,
): string {
  const content = files.get(path);
  assert.ok(typeof content === "string");
  return content;
}

describe("composePublishedSkills", () => {
  test("composes public skills with generated frontmatter and required context", () => {
    // GIVEN: A validated skill graph for this composition scenario is prepared.
    const base = makeSkill({
      resources: [
        {
          path: "references/rules.md",
          content: Buffer.from("# Rules\n\nKeep the rule.\n"),
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

    // WHEN: Published skill trees are composed through the public function.
    const result = composePublishedSkills({
      plugin: { skills: [base, flutter] },
    });
    const files = new Map(
      result.entries.map((entry) => [entry.path, entry.content]),
    );

    // THEN: The published paths and rendered skill content are verified.
    assert.deepEqual(result.publishedSkillIds, ["flutter-skill"]);
    assert.match(
      stringContent(files, "skills/flutter-skill/SKILL.md"),
      /name: flutter-skill\ndescription: Use Flutter-specific testing tools\./u,
    );
    assert.match(
      stringContent(files, "skills/flutter-skill/SKILL.md"),
      /\*\*Reason:\*\* Provides universal rules\./u,
    );
    assert.match(
      stringContent(files, "skills/flutter-skill/SKILL.md"),
      /\*\*Instructions:\*\* Read it first and then apply Flutter overrides\./u,
    );
    assert.match(
      stringContent(files, "skills/flutter-skill/SKILL.md"),
      /references\/required-skills\/base-skill\/SKILL\.md/u,
    );
    assert.deepEqual(
      files.get(
        "skills/flutter-skill/references/required-skills/base-skill/references/rules.md",
      ),
      Buffer.from("# Rules\n\nKeep the rule.\n"),
    );
    assert.doesNotMatch(
      stringContent(files, "skills/flutter-skill/SKILL.md"),
      /PLUGIN-COMPILER:REQUIRED-SKILLS/u,
    );
  });

  test("keeps transitive dependencies recursive and duplicates diamond leaves", () => {
    // GIVEN: A validated skill graph for this composition scenario is prepared.
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

    // WHEN: Published skill trees are composed through the public function.
    const result = composePublishedSkills({
      plugin: { skills: [leaf, left, right, root] },
    });
    const paths = result.entries.map((entry) => entry.path);

    // THEN: The published paths and rendered skill content are verified.
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
    // GIVEN: A validated skill graph for this composition scenario is prepared.
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

    // WHEN: Published skill trees are composed through the public function.
    const result = composePublishedSkills({ plugin: { skills } });

    // THEN: The published paths and rendered skill content are verified.
    assert.deepEqual(result.publishedSkillIds, ["deprecated-skill"]);
    assert.deepEqual(
      result.entries.map((entry) => entry.path),
      ["skills/deprecated-skill/SKILL.md"],
    );
  });
});
