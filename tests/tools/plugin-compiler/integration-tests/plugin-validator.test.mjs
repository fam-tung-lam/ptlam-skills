import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { Plugin } from "../../../../tools/plugin-compiler/models/plugin.mjs";
import { PluginMetadata } from "../../../../tools/plugin-compiler/models/plugin-metadata.mjs";
import { Skill } from "../../../../tools/plugin-compiler/models/skill.mjs";
import { SkillFrontmatter } from "../../../../tools/plugin-compiler/models/skill-frontmatter.mjs";
import {
  PluginValidationError,
  PluginValidator,
} from "../../../../tools/plugin-compiler/plugin-validator.mjs";

const validator = new PluginValidator();

test("validatePlugin returns the ordered immutable domain Plugin", async () => {
  // Given
  const rootDir = await createFixture({ manifest: makeManifest() });

  try {
    // When
    const result = await validator.validatePlugin({ rootDir });

    // Then
    assert.ok(result.plugin instanceof Plugin);
    assert.ok(result.plugin.metadata instanceof PluginMetadata);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.diagnostics), true);
    assert.equal(result.plugin.schema_version, 1);
    assert.equal(result.plugin.metadata.name, "fixture-skills");
    assert.equal(
      result.plugin.marketplace.plugin_description,
      "Listing description.",
    );
    assert.deepEqual(
      result.plugin.categories.map(({ id }) => id),
      ["engineering", "productivity"],
    );
    assert.deepEqual(
      result.plugin.skills.map(({ id }) => id),
      ["alpha-skill", "beta-skill"],
    );
    assert.ok(result.plugin.skills[0] instanceof Skill);
    assert.ok(result.plugin.skills[0].frontmatter instanceof SkillFrontmatter);
    assert.deepEqual(
      result.plugin.skills[0],
      new Skill({
        id: "alpha-skill",
        category_id: "engineering",
        kind: "product",
        summary: "Alpha summary.",
        required_skill_ids: ["beta-skill"],
        path: "skills/engineering/alpha-skill",
        frontmatter: new SkillFrontmatter({
          name: "alpha-skill",
          description: "Description for alpha-skill.",
        }),
      }),
    );
  } finally {
    await removeFixture(rootDir);
  }
});

test("schema is closed and requires direct required_skill_ids", async () => {
  // Given
  const manifest = makeManifest();
  manifest.unexpected = true;
  manifest.categories[0].title = "bad\ud800value";
  delete manifest.skills[0].required_skill_ids;
  manifest.skills[0].relations = { requires: [], related: [] };
  manifest.skills[1].required_skill_ids = ["alpha-skill", "alpha-skill"];
  const rootDir = await createFixture({ manifest });

  try {
    // When
    const validation = validator.validatePlugin({ rootDir });

    // Then
    await expectValidationError(validation, [
      "plugin.yml#/unexpected: must NOT have additional properties",
      "plugin.yml/categories/0/title: must match pattern",
      "plugin.yml/skills/0/required_skill_ids: must have required property",
      "plugin.yml/skills/0/relations: must NOT have additional properties",
      "plugin.yml/skills/1/required_skill_ids: must NOT have duplicate items",
    ]);
  } finally {
    await removeFixture(rootDir);
  }
});

test("strict YAML subset preserves actionable syntax diagnostics", async (t) => {
  // Given
  const base = JSON.stringify(makeManifest(), null, 2);
  const cases = [
    {
      name: "duplicate keys",
      source: base.replace(
        '"schema_version": 1,',
        '"schema_version": 1,\n  "schema_version": 1,',
      ),
      diagnostics: ["Map keys must be unique"],
    },
    {
      name: "anchors and aliases",
      source: base
        .replace(
          '"description": "Plugin description.",',
          '"description": &shared "Plugin description.",',
        )
        .replace(
          '"homepage": "https://example.test/readme",',
          '"homepage": *shared,',
        ),
      diagnostics: [
        "YAML anchors are not supported",
        "YAML aliases are not supported",
      ],
    },
    {
      name: "custom tags",
      source: base.replace(
        '"description": "Plugin description.",',
        '"description": !plugin "Plugin description.",',
      ),
      diagnostics: ["explicit YAML tags are not supported"],
    },
    {
      name: "merge keys",
      source: base.replace(
        '"name": "fixture-skills",',
        '"<<": {"name": "merged"},\n    "name": "fixture-skills",',
      ),
      diagnostics: ["YAML merge keys are not supported"],
    },
    {
      name: "unquoted version",
      source: base.replace('"version": "1.2.3"', '"version": 1.2.3'),
      diagnostics: ["plugin.version must be quoted"],
    },
  ];

  // When
  for (const fixture of cases) {
    await t.test(fixture.name, async () => {
      // Given
      const rootDir = await createFixture({
        manifest: makeManifest(),
        manifestSource: fixture.source,
      });
      try {
        // When
        const validation = validator.validatePlugin({ rootDir });

        // Then
        await expectValidationError(validation, fixture.diagnostics);
      } finally {
        await removeFixture(rootDir);
      }
    });
  }

  // Then: each subtest verifies its own observable diagnostics.
});

test("filesystem completeness reports missing listed and unlisted discovered skills", async () => {
  // Given
  const manifest = makeManifest();
  manifest.skills = [manifest.skills[0]];
  manifest.skills[0].required_skill_ids = [];
  const rootDir = await createFixture({
    manifest,
    writtenSkills: [],
    extraSkills: [{ category: "utilities", id: "orphan-skill" }],
  });

  try {
    // When
    const validation = validator.validatePlugin({ rootDir });

    // Then
    await expectValidationError(validation, [
      "skills/utilities/orphan-skill/SKILL.md: discovered skill is not listed",
      "expected skills/engineering/alpha-skill/SKILL.md",
    ]);
  } finally {
    await removeFixture(rootDir);
  }
});

test("SKILL.md frontmatter is strictly parsed and cross-validated", async () => {
  // Given
  const manifest = makeManifest();
  manifest.skills = [manifest.skills[0]];
  manifest.skills[0].required_skill_ids = [];
  const rootDir = await createFixture({
    manifest,
    skillSources: {
      "engineering/alpha-skill": `---\nname: wrong-name\ndescription: "   "\n---\n\n# Wrong\n`,
    },
  });

  try {
    // When
    const validation = validator.validatePlugin({ rootDir });

    // Then
    await expectValidationError(validation, [
      'expected "alpha-skill" from plugin.yml and directory name, found "wrong-name"',
      "#description: must be a non-empty string",
    ]);
  } finally {
    await removeFixture(rootDir);
  }
});

test("category and required-skill diagnostics aggregate", async () => {
  // Given
  const manifest = makeManifest();
  manifest.skills[0].category = "missing-category";
  manifest.skills[0].required_skill_ids = ["alpha-skill", "missing-skill"];
  const rootDir = await createFixture({ manifest });

  try {
    // When
    const validation = validator.validatePlugin({ rootDir });

    // Then
    await expectValidationError(validation, [
      'unknown category "missing-category"',
      'references unknown skill "missing-skill"',
      'skill "alpha-skill" cannot require itself',
    ]);
  } finally {
    await removeFixture(rootDir);
  }
});

test("required_skill_ids must form a DAG", async () => {
  // Given
  const manifest = makeManifest();
  manifest.skills[0].required_skill_ids = ["beta-skill"];
  manifest.skills[1].required_skill_ids = ["alpha-skill"];
  const rootDir = await createFixture({ manifest });

  try {
    // When
    const validation = validator.validatePlugin({ rootDir });

    // Then
    await expectValidationError(validation, [
      "required_skill_ids must form an acyclic graph; found alpha-skill -> beta-skill -> alpha-skill",
    ]);
  } finally {
    await removeFixture(rootDir);
  }
});

test("category, skill, and required-skill identifiers are unique", async () => {
  // Given
  const manifest = makeManifest();
  manifest.categories.push({ ...manifest.categories[0] });
  manifest.skills.push({
    ...manifest.skills[0],
    required_skill_ids: [],
  });
  manifest.skills[0].required_skill_ids = [];
  manifest.skills[1].required_skill_ids = [];
  const rootDir = await createFixture({ manifest });

  try {
    // When
    const validation = validator.validatePlugin({ rootDir });

    // Then
    await expectValidationError(validation, [
      'duplicate category id "engineering"',
      'duplicate skill id "alpha-skill"',
    ]);
  } finally {
    await removeFixture(rootDir);
  }
});

test("plugin and skill source paths reject symbolic links", async (t) => {
  // Given: plugin manifest and skill directory symlinks are both source risks.

  // When
  await t.test("plugin manifest", async () => {
    // Given
    const rootDir = await createFixture({ manifest: makeManifest() });
    const externalRoot = await mkdtemp(
      path.join(os.tmpdir(), "ptlam-plugin-validator-external-"),
    );
    try {
      await writeFile(
        path.join(externalRoot, "plugin.yml"),
        `${JSON.stringify(makeManifest(), null, 2)}\n`,
      );
      await rm(path.join(rootDir, "plugin.yml"));
      await symlink(
        path.join(externalRoot, "plugin.yml"),
        path.join(rootDir, "plugin.yml"),
        "file",
      );

      // When
      const validation = validator.validatePlugin({ rootDir });

      // Then
      await expectValidationError(validation, [
        "plugin.yml: symbolic links are not supported in plugin paths",
      ]);
    } finally {
      await Promise.all([removeFixture(rootDir), removeFixture(externalRoot)]);
    }
  });

  await t.test("skill directory", async () => {
    // Given
    const manifest = makeManifest();
    manifest.skills = [manifest.skills[0]];
    manifest.skills[0].required_skill_ids = [];
    const rootDir = await createFixture({ manifest, writtenSkills: [] });
    const externalRoot = await mkdtemp(
      path.join(os.tmpdir(), "ptlam-plugin-validator-external-"),
    );
    const externalSkill = path.join(externalRoot, "alpha-skill");
    try {
      await mkdir(externalSkill, { recursive: true });
      await writeFile(
        path.join(externalSkill, "SKILL.md"),
        skillDocument("alpha-skill"),
      );
      await mkdir(path.join(rootDir, "skills", "engineering"), {
        recursive: true,
      });
      await symlink(
        externalSkill,
        path.join(rootDir, "skills", "engineering", "alpha-skill"),
        "dir",
      );

      // When
      const validation = validator.validatePlugin({ rootDir });

      // Then
      await expectValidationError(validation, [
        "skills/engineering/alpha-skill: symbolic links are not supported",
      ]);
    } finally {
      await Promise.all([removeFixture(rootDir), removeFixture(externalRoot)]);
    }
  });

  // Then: each subtest verifies rejection at its public validation boundary.
});

function makeManifest() {
  return {
    schema_version: 1,
    plugin: {
      name: "fixture-skills",
      version: "1.2.3",
      description: "Plugin description.",
      author: {
        name: "Fixture Owner",
        email: "owner@example.test",
        url: "https://example.test",
      },
      homepage: "https://example.test/readme",
      repository: "https://example.test/repository",
      license: "MIT",
      keywords: ["agent-skills"],
    },
    marketplace: {
      name: "fixture",
      description: "Fixture marketplace.",
      plugin_description: "Listing description.",
      category: "development",
      keywords: ["agent-skills"],
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
    ],
    skills: [
      {
        id: "alpha-skill",
        category: "engineering",
        kind: "product",
        summary: "Alpha summary.",
        required_skill_ids: ["beta-skill"],
      },
      {
        id: "beta-skill",
        category: "productivity",
        kind: "test",
        summary: "Beta summary.",
        required_skill_ids: [],
      },
    ],
  };
}

async function createFixture({
  manifest,
  manifestSource = JSON.stringify(manifest, null, 2),
  writtenSkills = manifest.skills,
  extraSkills = [],
  skillSources = {},
}) {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), "ptlam-plugin-validator-"),
  );
  await writeFile(path.join(rootDir, "plugin.yml"), `${manifestSource}\n`);

  for (const skill of [...writtenSkills, ...extraSkills]) {
    const directory = path.join(rootDir, "skills", skill.category, skill.id);
    await mkdir(directory, { recursive: true });
    const source =
      skillSources[`${skill.category}/${skill.id}`] ?? skillDocument(skill.id);
    await writeFile(path.join(directory, "SKILL.md"), source);
  }
  return rootDir;
}

function skillDocument(id) {
  return `---\nname: ${id}\ndescription: Description for ${id}.\n---\n\n# ${id}\n`;
}

async function expectValidationError(validation, expectedDiagnostics) {
  try {
    await validation;
    assert.fail("Expected PluginValidator to reject the fixture");
  } catch (error) {
    assert.ok(
      error instanceof PluginValidationError,
      error?.stack ?? String(error),
    );
    assert.equal(Object.isFrozen(error.diagnostics), true);
    for (const diagnostic of expectedDiagnostics) {
      assert.ok(
        error.message.includes(diagnostic),
        `Expected error to include ${JSON.stringify(diagnostic)}:\n${error.message}`,
      );
    }
  }
}

async function removeFixture(rootDir) {
  await rm(rootDir, { recursive: true, force: true });
}
