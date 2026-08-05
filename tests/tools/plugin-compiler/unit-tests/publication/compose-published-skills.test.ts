import assert from "node:assert/strict";
import { describe, test } from "vitest";
import {
  REQUIRED_SKILLS_MARKER,
  type SkillSnapshot,
  SkillStatus,
  SkillVisibility,
} from "../../../../../tools/plugin-compiler/models/skill.ts";
import { composePublishedSkills } from "../../../../../tools/plugin-compiler/publication/compose-published-skills.ts";

function makeSkill(overrides: Partial<SkillSnapshot> = {}): SkillSnapshot {
  return {
    id: "base-skill",
    description: "Base skill description.",
    category_id: "engineering",
    visibility: SkillVisibility.Internal,
    status: SkillStatus.Active,
    required_skills: [],
    source_path: "plugin/skills/base-skill",
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
    // GIVEN: A public skill requires one internal skill with a byte resource.
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
      visibility: SkillVisibility.Public,
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

    // WHEN: Publication composes the standalone public skill tree.
    const result = composePublishedSkills({
      plugin: { skills: [base, flutter] },
    });
    const files = new Map(
      result.entries.map((entry) => [entry.path, entry.content]),
    );

    // THEN: Required context and resource bytes are embedded at stable paths.
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
    // GIVEN: A public root reaches one leaf through both sides of a diamond.
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
      visibility: SkillVisibility.Public,
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

    // WHEN: Publication composes the root recursively.
    const result = composePublishedSkills({
      plugin: { skills: [leaf, left, right, root] },
    });
    const paths = result.entries.map((entry) => entry.path);

    // THEN: Each standalone dependency branch receives its own leaf copy.
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
    // GIVEN: Non-active roots and one deprecated public root share a catalog.
    const skills = [
      makeSkill({ id: "internal-skill" }),
      makeSkill({
        id: "draft-skill",
        visibility: SkillVisibility.Public,
        status: SkillStatus.Draft,
      }),
      makeSkill({
        id: "deprecated-skill",
        visibility: SkillVisibility.Public,
        status: SkillStatus.Deprecated,
      }),
      makeSkill({
        id: "archived-skill",
        visibility: SkillVisibility.Public,
        status: SkillStatus.Archived,
      }),
    ];

    // WHEN: Publication composes all eligible roots.
    const result = composePublishedSkills({ plugin: { skills } });

    // THEN: Only the deprecated public root is emitted.
    assert.deepEqual(result.publishedSkillIds, ["deprecated-skill"]);
    assert.deepEqual(
      result.entries.map((entry) => entry.path),
      ["skills/deprecated-skill/SKILL.md"],
    );
  });

  test("orders Unicode resource paths by code point", () => {
    // GIVEN: One public skill has resources whose locale order differs by host.
    const skill = makeSkill({
      visibility: SkillVisibility.Public,
      resources: [
        { path: "references/ä.md", content: Buffer.from("umlaut") },
        { path: "references/z.md", content: Buffer.from("latin") },
        { path: "references/中.md", content: Buffer.from("cjk") },
        { path: "references/A.md", content: Buffer.from("upper") },
      ],
    });

    // WHEN: The standalone skill tree is composed.
    const result = composePublishedSkills({ plugin: { skills: [skill] } });

    // THEN: Resource paths follow locale-independent Unicode code-point order.
    assert.deepEqual(
      result.entries.map((entry) => entry.path),
      [
        "skills/base-skill/SKILL.md",
        "skills/base-skill/references/A.md",
        "skills/base-skill/references/z.md",
        "skills/base-skill/references/ä.md",
        "skills/base-skill/references/中.md",
      ],
    );
  });
});
