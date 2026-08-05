import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, onTestFinished, test } from "vitest";

import { Plugin } from "../../../../tools/plugin-compiler/models/plugin.ts";
import { PluginMetadata } from "../../../../tools/plugin-compiler/models/plugin-metadata.ts";
import { Skill } from "../../../../tools/plugin-compiler/models/skill.ts";
import { SkillFrontmatter } from "../../../../tools/plugin-compiler/models/skill-frontmatter.ts";
import { SkillRequirement } from "../../../../tools/plugin-compiler/models/skill-requirement.ts";
import { SkillResource } from "../../../../tools/plugin-compiler/models/skill-resource.ts";
import {
  PluginValidationError,
  PluginValidator,
  REQUIRED_SKILLS_MARKER,
} from "../../../../tools/plugin-compiler/plugin-validator.ts";

const validator = new PluginValidator();

interface FixtureRequirement {
  skill_id: string;
  reason: string;
  instructions?: string;
}

interface FixtureLifecycle {
  reason: string;
  instructions?: string;
  replacement_skill_id?: string;
}

interface FixtureSkill {
  id: string;
  description: string;
  category_id: string;
  visibility: string;
  status: string;
  required_skills: FixtureRequirement[];
  deprecation?: FixtureLifecycle;
  archive?: Omit<FixtureLifecycle, "instructions">;
}

interface FixtureCategory {
  id: string;
  name: string;
  description: string;
  title?: string;
}

interface FixtureManifest {
  schema_version: number;
  name: string;
  description: string;
  version: string;
  author: { name: string; email: string; url: string };
  homepage: string;
  repository: string;
  license: string;
  keywords: string[];
  marketplace: {
    name: string;
    description: string;
    plugin_description: string;
    category: string;
    keywords: string[];
  };
  categories: FixtureCategory[];
  skills: FixtureSkill[];
  unexpected?: unknown;
}

interface FixtureOptions {
  manifest: FixtureManifest;
  manifestSource?: string;
  writtenSkills?: { id: string }[];
  extraSkills?: { id: string }[];
  skillSources?: Record<string, string>;
  resources?: Record<string, string | Buffer>;
}

function itemAt<T>(items: T[], index: number, label: string): T {
  const item = items[index];
  if (item === undefined)
    throw new Error(`Missing ${label} fixture at ${index}`);
  return item;
}

describe("PluginValidator", () => {
  test("validatePlugin returns an ordered immutable v2 source snapshot", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const rootDir = await createFixture({
      manifest: makeManifest(),
      resources: {
        "alpha-skill/references/workflow.md": "# Workflow\n",
        "alpha-skill/assets/pixel.bin": Buffer.from([0, 1, 255]),
      },
      skillSources: {
        "alpha-skill": `# Alpha\n\n${REQUIRED_SKILLS_MARKER}\n\nRead [workflow](references/workflow.md).\n`,
      },
    });

    // WHEN: The fixture is validated through the public validator boundary.
    const result = await validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    assert.ok(result.plugin instanceof Plugin);
    assert.ok(result.plugin.metadata instanceof PluginMetadata);
    assert.equal(result.plugin.schema_version, 2);
    assert.equal(result.plugin.name, "fixture-skills");
    assert.equal(result.plugin.version, "1.2.3+1");
    assert.deepEqual(result.diagnostics, []);
    assert.deepEqual(
      result.plugin.categories.map(({ id, name }) => ({ id, name })),
      [
        { id: "engineering", name: "Engineering" },
        { id: "productivity", name: "Productivity" },
      ],
    );

    const skill = result.plugin.skills[0];
    assert.ok(skill instanceof Skill);
    assert.ok(skill.frontmatter instanceof SkillFrontmatter);
    assert.ok(skill.required_skills[0] instanceof SkillRequirement);
    assert.ok(skill.resources[0] instanceof SkillResource);
    assert.equal(skill.source_path, "plugin/skills/alpha-skill");
    assert.equal(skill.source_body.includes(REQUIRED_SKILLS_MARKER), true);
    assert.deepEqual(skill.resource_paths, [
      "assets/pixel.bin",
      "references/workflow.md",
    ]);
    assert.deepEqual(
      Buffer.from(skill.resources[0].content_base64, "base64"),
      Buffer.from([0, 1, 255]),
    );
    assert.deepEqual(skill.required_skill_ids, ["beta-skill"]);
    assert.equal(skill.frontmatter.name, "alpha-skill");
    assert.equal(skill.frontmatter.description, "Description for alpha-skill.");

    for (const value of [
      result,
      result.diagnostics,
      result.plugin,
      result.plugin.author,
      result.plugin.keywords,
      result.plugin.metadata,
      result.plugin.categories,
      result.plugin.skills,
      skill,
      skill.required_skills,
      skill.required_skills[0],
      skill.resources,
      skill.resources[0],
      skill.resource_paths,
      skill.frontmatter,
    ]) {
      assert.equal(Object.isFrozen(value), true);
    }
  });

  test("schema is closed and models lifecycle metadata conditionally", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const manifest = makeManifest();
    manifest.unexpected = true;
    itemAt(manifest.categories, 0, "category").title = "Old field";
    delete itemAt(
      itemAt(manifest.skills, 0, "skill").required_skills,
      0,
      "requirement",
    ).instructions;
    itemAt(manifest.skills, 1, "skill").status = "deprecated";
    const rootDir = await createFixture({ manifest });

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    await expectValidationError(validation, [
      "plugin/plugin.yml#/unexpected: must NOT have additional properties",
      "plugin/plugin.yml/categories/0/title: must NOT have additional properties",
      "plugin/plugin.yml/skills/0/required_skills/0/instructions: must have required property",
      "plugin/plugin.yml/skills/1/deprecation: must have required property",
    ]);
  });

  test.each<{
    name: string;
    change: (skill: FixtureSkill) => void;
    diagnostics: string[];
  }>([
    {
      name: "archived skill without archive metadata",
      change(skill) {
        skill.status = "archived";
      },
      diagnostics: [
        "plugin/plugin.yml/skills/0/archive: must have required property",
      ],
    },
    {
      name: "active skill with deprecation metadata",
      change(skill) {
        skill.deprecation = {
          reason: "Unexpected.",
          instructions: "Do not use.",
        };
      },
      diagnostics: [
        "plugin/plugin.yml/skills/0/deprecation: boolean schema is false",
      ],
    },
    {
      name: "deprecated skill without instructions",
      change(skill) {
        skill.status = "deprecated";
        skill.deprecation = { reason: "Legacy." };
      },
      diagnostics: [
        "plugin/plugin.yml/skills/0/deprecation/instructions: must have required property",
      ],
    },
  ])("rejects $name", async ({ name, change, diagnostics }) => {
    // GIVEN: A one-skill manifest violates one lifecycle metadata rule.
    const manifest = oneSkillManifest();
    change(itemAt(manifest.skills, 0, name));
    const rootDir = await createFixture({ manifest });

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The lifecycle-specific diagnostic is reported.
    await expectValidationError(validation, diagnostics);
  });

  const baseManifestSource = JSON.stringify(makeManifest(), null, 2);

  test("strict YAML 1.2 accepts comments", async () => {
    // GIVEN: A portable manifest contains YAML comments.
    const manifestSource = `# Schema contract\n${baseManifestSource.replace('"version": "1.2.3+1",', '"version": "1.2.3+1", # Plugin release')}`;
    const rootDir = await createFixture({
      manifest: makeManifest(),
      manifestSource,
    });

    // WHEN: The fixture is validated through the public validator boundary.
    const result = await validator.validatePlugin({ rootDir });

    // THEN: The quoted version survives YAML parsing unchanged.
    assert.equal(result.plugin.version, "1.2.3+1");
  });

  test.each([
    {
      name: "duplicate keys",
      source: baseManifestSource.replace(
        '"schema_version": 2,',
        '"schema_version": 2,\n  "schema_version": 2,',
      ),
      diagnostics: ["Map keys must be unique"],
    },
    {
      name: "anchors and aliases",
      source: baseManifestSource
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
      source: baseManifestSource.replace(
        '"description": "Plugin description.",',
        '"description": !plugin "Plugin description.",',
      ),
      diagnostics: ["explicit YAML tags are not supported"],
    },
    {
      name: "merge keys",
      source: baseManifestSource.replace(
        '"name": "fixture-skills",',
        '"<<": {"name": "merged"},\n  "name": "fixture-skills",',
      ),
      diagnostics: ["YAML merge keys are not supported"],
    },
    {
      name: "unquoted version",
      source: baseManifestSource.replace(
        '"version": "1.2.3+1"',
        '"version": 1.2',
      ),
      diagnostics: ["version must be quoted"],
    },
    {
      name: "interpolation",
      source: baseManifestSource.replace(
        '"description": "Plugin description."',
        `"description": "$${"{PLUGIN_DESCRIPTION}"}"`,
      ),
      diagnostics: ["interpolation is not supported"],
    },
  ])("rejects YAML $name", async ({ source, diagnostics }) => {
    // GIVEN: A manifest uses one non-portable YAML feature.
    const rootDir = await createFixture({
      manifest: makeManifest(),
      manifestSource: source,
    });

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The portability diagnostic is reported.
    await expectValidationError(validation, diagnostics);
  });

  test("manifest and flat source directories have a fail-closed one-to-one mapping", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const manifest = makeManifest();
    const alphaSkill = itemAt(manifest.skills, 0, "alpha skill");
    manifest.skills = [alphaSkill];
    alphaSkill.required_skills = [];
    const rootDir = await createFixture({
      manifest,
      writtenSkills: [],
      extraSkills: [{ id: "orphan-skill" }],
    });
    await writeFile(
      path.join(rootDir, "plugin", "skills", "notes.txt"),
      "nope",
    );

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    await expectValidationError(validation, [
      "plugin/skills/orphan-skill: source skill is not listed",
      "expected plugin/skills/alpha-skill/SKILL.md",
      "plugin/skills/notes.txt: only skill directories are allowed",
    ]);
  });

  test.each([
    {
      name: "frontmatter",
      source: `---\nname: alpha-skill\n---\n\n${REQUIRED_SKILLS_MARKER}\n`,
      diagnostics: ["must not contain YAML frontmatter"],
    },
    {
      name: "missing marker",
      source: "# Alpha\n",
      diagnostics: ["expected exactly one", "found 0"],
    },
    {
      name: "duplicate marker",
      source: `${REQUIRED_SKILLS_MARKER}\n${REQUIRED_SKILLS_MARKER}\n`,
      diagnostics: ["expected exactly one", "found 2"],
    },
  ])("rejects source SKILL.md with $name", async ({ source, diagnostics }) => {
    // GIVEN: A one-skill manifest has an invalid authored SKILL.md source.
    const rootDir = await createFixture({
      manifest: oneSkillManifest(),
      skillSources: { "alpha-skill": source },
    });

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The source-contract diagnostic is reported.
    await expectValidationError(validation, diagnostics);
  });

  test("skill resources reject compiler-owned paths, symlinks, escapes, and missing links", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const manifest = oneSkillManifest();
    const rootDir = await createFixture({
      manifest,
      skillSources: {
        "alpha-skill": `# Alpha\n\n${REQUIRED_SKILLS_MARKER}\n\n[escape](../beta-skill/SKILL.md)\n[missing](references/missing.md)\n[reference escape][neighbor]\n\n[neighbor]: ../beta-skill/SKILL.md\n`,
      },
    });
    const skillDirectory = path.join(
      rootDir,
      "plugin",
      "skills",
      "alpha-skill",
    );
    await mkdir(path.join(skillDirectory, "references", "required-skills"), {
      recursive: true,
    });
    await writeFile(
      path.join(skillDirectory, "references", "required-skills", "owned.md"),
      "owned",
    );
    const externalRoot = await createTemporaryDirectory(
      "ptlam-plugin-external-",
    );
    await writeFile(path.join(externalRoot, "outside.md"), "outside");
    await symlink(
      path.join(externalRoot, "outside.md"),
      path.join(skillDirectory, "references", "linked.md"),
      "file",
    );

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    await expectValidationError(validation, [
      "references/required-skills/ is owned by the plugin compiler",
      "symbolic links are not supported in skill sources",
      "local link escapes the skill",
      "local link target does not exist",
    ]);
  });

  test("category, dependency, lifecycle, replacement, and DAG errors aggregate", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const manifest = makeManifest();
    const alphaSkill = itemAt(manifest.skills, 0, "alpha skill");
    const betaSkill = itemAt(manifest.skills, 1, "beta skill");
    alphaSkill.category_id = "missing-category";
    alphaSkill.required_skills = [
      requirement("alpha-skill"),
      requirement("missing-skill"),
      requirement("beta-skill"),
    ];
    betaSkill.required_skills = [requirement("alpha-skill")];
    betaSkill.status = "deprecated";
    betaSkill.deprecation = {
      reason: "Old.",
      instructions: "Use alpha.",
      replacement_skill_id: "beta-skill",
    };
    const rootDir = await createFixture({ manifest });

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    await expectValidationError(validation, [
      'unknown category "missing-category"',
      'skill "alpha-skill" cannot require itself',
      'references unknown skill "missing-skill"',
      'skill "beta-skill" cannot replace itself',
      "required_skills must form an acyclic graph",
    ]);
  });

  test("category IDs, skill IDs, and direct requirement IDs are unique", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const manifest = makeManifest();
    manifest.categories.push({ ...itemAt(manifest.categories, 0, "category") });
    manifest.skills.push({
      ...itemAt(manifest.skills, 1, "beta skill"),
      required_skills: [],
    });
    itemAt(manifest.skills, 0, "alpha skill").required_skills.push(
      requirement("beta-skill"),
    );
    const rootDir = await createFixture({ manifest });

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    await expectValidationError(validation, [
      'duplicate category id "engineering"',
      'duplicate skill id "beta-skill"',
      'duplicate required skill "beta-skill"',
    ]);
  });

  test("active outputs cannot depend on draft or archived skills", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const manifest = makeManifest();
    manifest.skills.push({
      id: "archived-skill",
      description: "Archived.",
      category_id: "engineering",
      visibility: "internal",
      status: "archived",
      archive: { reason: "Historical." },
      required_skills: [],
    });
    itemAt(manifest.skills, 1, "beta skill").status = "draft";
    itemAt(manifest.skills, 0, "alpha skill").required_skills = [
      requirement("beta-skill"),
      requirement("archived-skill"),
    ];
    const rootDir = await createFixture({ manifest });

    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    await expectValidationError(validation, [
      'active skill "alpha-skill" cannot require draft skill "beta-skill"',
      'non-archived skill "alpha-skill" cannot require archived skill "archived-skill"',
    ]);
  });

  test("deprecated dependencies and unreachable internal skills are non-failing diagnostics", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const manifest = makeManifest();
    const betaSkill = itemAt(manifest.skills, 1, "beta skill");
    betaSkill.status = "deprecated";
    betaSkill.deprecation = {
      reason: "Legacy foundation.",
      instructions: "Migrate when practical.",
    };
    manifest.skills.push({
      id: "unused-core",
      description: "Unused internal core.",
      category_id: "engineering",
      visibility: "internal",
      status: "active",
      required_skills: [],
    });
    const rootDir = await createFixture({ manifest });

    // WHEN: The fixture is validated through the public validator boundary.
    const result = await validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    assert.equal(result.diagnostics.length, 2);
    assert.ok(
      result.diagnostics.some((message) =>
        message.includes("requires deprecated skill"),
      ),
    );
    assert.ok(
      result.diagnostics.some((message) =>
        message.includes('"unused-core" is unreachable'),
      ),
    );
  });

  test("manifest and nested source paths reject symbolic links", async () => {
    // GIVEN: An isolated plugin source fixture for this validation scenario is prepared.
    const rootDir = await createTemporaryDirectory("ptlam-plugin-validator-");
    const externalRoot = await createFixture({ manifest: makeManifest() });
    await symlink(
      path.join(externalRoot, "plugin"),
      path.join(rootDir, "plugin"),
      "dir",
    );
    // WHEN: The fixture is validated through the public validator boundary.
    const validation = validator.validatePlugin({ rootDir });

    // THEN: The returned plugin model or diagnostics are verified.
    await expectValidationError(validation, [
      "plugin: symbolic links are not supported in plugin paths",
    ]);
  });

  function makeManifest(): FixtureManifest {
    return {
      schema_version: 2,
      name: "fixture-skills",
      description: "Plugin description.",
      version: "1.2.3+1",
      author: {
        name: "Fixture Owner",
        email: "owner@example.test",
        url: "https://example.test",
      },
      homepage: "https://example.test/readme",
      repository: "https://example.test/repository",
      license: "MIT",
      keywords: ["agent-skills"],
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
          name: "Engineering",
          description: "Engineering skills.",
        },
        {
          id: "productivity",
          name: "Productivity",
          description: "Productivity skills.",
        },
      ],
      skills: [
        {
          id: "alpha-skill",
          description: "Description for alpha-skill.",
          category_id: "engineering",
          visibility: "public",
          status: "active",
          required_skills: [requirement("beta-skill")],
        },
        {
          id: "beta-skill",
          description: "Description for beta-skill.",
          category_id: "productivity",
          visibility: "internal",
          status: "active",
          required_skills: [],
        },
      ],
    };
  }

  function oneSkillManifest() {
    const manifest = makeManifest();
    const alphaSkill = itemAt(manifest.skills, 0, "alpha skill");
    manifest.skills = [alphaSkill];
    alphaSkill.required_skills = [];
    return manifest;
  }

  function requirement(skill_id: string): FixtureRequirement {
    return {
      skill_id,
      reason: `Provides ${skill_id}.`,
      instructions: `Read ${skill_id} first.`,
    };
  }

  async function createFixture(options: FixtureOptions): Promise<string> {
    const { manifest } = options;
    const manifestSource =
      options.manifestSource ?? JSON.stringify(manifest, null, 2);
    const writtenSkills = options.writtenSkills ?? manifest.skills;
    const extraSkills = options.extraSkills ?? [];
    const skillSources = options.skillSources ?? {};
    const resources = options.resources ?? {};
    const rootDir = await createTemporaryDirectory("ptlam-plugin-validator-");
    await mkdir(path.join(rootDir, "plugin", "skills"), { recursive: true });
    await writeFile(
      path.join(rootDir, "plugin", "plugin.yml"),
      `${manifestSource}\n`,
    );

    for (const skill of [...writtenSkills, ...extraSkills]) {
      const directory = path.join(rootDir, "plugin", "skills", skill.id);
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, "SKILL.md"),
        skillSources[skill.id] ?? skillDocument(skill.id),
      );
    }
    for (const [relativePath, content] of Object.entries(resources)) {
      const target = path.join(
        rootDir,
        "plugin",
        "skills",
        ...relativePath.split("/"),
      );
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    return rootDir;
  }

  async function createTemporaryDirectory(prefix: string): Promise<string> {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), prefix));
    onTestFinished(() => rm(rootDir, { recursive: true, force: true }));
    return rootDir;
  }

  function skillDocument(id: string): string {
    return `# ${id}\n\n${REQUIRED_SKILLS_MARKER}\n`;
  }

  async function expectValidationError(
    validation: Promise<unknown>,
    expectedDiagnostics: readonly string[],
  ): Promise<void> {
    await assert.rejects(validation, (error: unknown) => {
      assert.ok(
        error instanceof PluginValidationError,
        error instanceof Error ? error.stack : String(error),
      );
      assert.equal(Object.isFrozen(error.diagnostics), true);
      for (const diagnostic of expectedDiagnostics) {
        assert.ok(
          error.message.includes(diagnostic),
          `Expected error to include ${JSON.stringify(diagnostic)}:\n${error.message}`,
        );
      }
      return true;
    });
  }
});
