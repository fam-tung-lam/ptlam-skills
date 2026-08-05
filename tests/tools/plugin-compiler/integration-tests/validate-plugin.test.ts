import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, onTestFinished, test } from "vitest";

import {
  type PluginAuthor,
  type PluginManifest,
  PluginSchemaVersion,
} from "../../../../tools/plugin-compiler/models/plugin.ts";
import {
  type ManifestSkill,
  REQUIRED_SKILLS_MARKER,
  SkillStatus,
  SkillVisibility,
} from "../../../../tools/plugin-compiler/models/skill.ts";
import { PluginValidationError } from "../../../../tools/plugin-compiler/validation/plugin-validation-error.ts";
import { validatePlugin } from "../../../../tools/plugin-compiler/validation/validate-plugin.ts";

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
  visibility: SkillVisibility;
  status: SkillStatus;
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
  schema_version: PluginSchemaVersion;
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

describe("validatePlugin", () => {
  test("validatePlugin returns an ordered immutable v1 source snapshot", async () => {
    // GIVEN: A valid v1 manifest has one dependency and binary resources.
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

    // WHEN: The complete repository source is validated.
    const result = await validatePlugin({ rootDir });

    // THEN: The result is ordered, immutable, and warning-free.
    assert.equal(result.plugin.schema_version, PluginSchemaVersion.V1);
    assert.equal(result.plugin.name, "fixture-skills");
    assert.equal(result.plugin.version, "1.2.3+1");
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(
      result.plugin.categories.map(({ id, name }) => ({ id, name })),
      [
        { id: "engineering", name: "Engineering" },
        { id: "productivity", name: "Productivity" },
      ],
    );

    const skill = result.plugin.skills[0];
    assert.ok(skill);
    assert.equal(skill.source_path, "plugin/skills/alpha-skill");
    assert.equal(skill.visibility, SkillVisibility.Public);
    assert.equal(skill.status, SkillStatus.Active);
    assert.equal(skill.source_body.includes(REQUIRED_SKILLS_MARKER), true);
    assert.deepEqual(
      skill.resources.map(({ path: resourcePath }) => resourcePath),
      ["assets/pixel.bin", "references/workflow.md"],
    );
    const firstResource = skill.resources[0];
    assert.ok(firstResource);
    assert.deepEqual(firstResource.content, Buffer.from([0, 1, 255]));
    const firstRead = firstResource.content;
    firstRead[0] = 99;
    assert.deepEqual(firstResource.content, Buffer.from([0, 1, 255]));
    assert.deepEqual(
      skill.required_skills.map(({ skill_id: skillId }) => skillId),
      ["beta-skill"],
    );
    assert.equal(skill.id, "alpha-skill");
    assert.equal(skill.description, "Description for alpha-skill.");

    for (const value of [
      result,
      result.warnings,
      result.plugin,
      result.plugin.author,
      result.plugin.keywords,
      result.plugin.marketplace,
      result.plugin.categories,
      result.plugin.skills,
      skill,
      skill.required_skills,
      skill.required_skills[0],
      skill.resources,
      skill.resources[0],
    ]) {
      assert.equal(Object.isFrozen(value), true);
    }
  });

  test("orders Unicode resource paths by locale-independent code points", async () => {
    // GIVEN: One skill contains resource names whose locale order can differ.
    const rootDir = await createFixture({
      manifest: oneSkillManifest(),
      resources: {
        "alpha-skill/references/äther.md": "# Aether\n",
        "alpha-skill/references/zeta.md": "# Zeta\n",
      },
    });

    // WHEN: The source tree is converted into a validated snapshot.
    const result = await validatePlugin({ rootDir });

    // THEN: Resource order follows stable Unicode code-point comparison.
    assert.deepEqual(
      result.plugin.skills[0]?.resources.map(
        ({ path: resourcePath }) => resourcePath,
      ),
      ["references/zeta.md", "references/äther.md"],
    );
  });

  test("schema is closed and models lifecycle metadata conditionally", async () => {
    // GIVEN: A manifest violates closed-schema and lifecycle shape rules.
    const manifest = makeManifest();
    manifest.unexpected = true;
    itemAt(manifest.categories, 0, "category").title = "Old field";
    delete itemAt(
      itemAt(manifest.skills, 0, "skill").required_skills,
      0,
      "requirement",
    ).instructions;
    itemAt(manifest.skills, 1, "skill").status = SkillStatus.Deprecated;
    const rootDir = await createFixture({ manifest });

    // WHEN: Its source contract is validated.
    const validation = validatePlugin({ rootDir });

    // THEN: Every independent schema error is exposed.
    await expectValidationError(validation, [
      "plugin/plugin.yml#/unexpected: must NOT have additional properties",
      "plugin/plugin.yml/categories/0/title: must NOT have additional properties",
      "plugin/plugin.yml/skills/0/required_skills/0/instructions: must have required property",
      "plugin/plugin.yml/skills/1/deprecation: must have required property",
    ]);
  });

  test("schema fields stay synchronized with manifest model fields", async () => {
    // GIVEN: The authoritative schema and compile-checked model field lists exist.
    const pluginFields = [
      "schema_version",
      "name",
      "description",
      "version",
      "author",
      "homepage",
      "repository",
      "license",
      "keywords",
      "marketplace",
      "categories",
      "skills",
    ] satisfies readonly (keyof PluginManifest)[];
    const authorFields = [
      "name",
      "email",
      "url",
    ] satisfies readonly (keyof PluginAuthor)[];
    const skillFields = [
      "id",
      "description",
      "category_id",
      "visibility",
      "status",
      "required_skills",
      "deprecation",
      "archive",
    ] satisfies readonly (keyof ManifestSkill)[];
    const schema = JSON.parse(
      await readFile(
        path.join(
          process.cwd(),
          "tools/plugin-compiler/validation/schemas/plugin-manifest-v1.schema.json",
        ),
        "utf8",
      ),
    ) as {
      $id: string;
      properties: Record<string, unknown>;
      $defs: {
        author: { properties: Record<string, unknown> };
        skill: { properties: Record<string, unknown> };
      };
    };

    // WHEN: Schema property names are compared with TypeScript model keys.
    const schemaPluginFields = Object.keys(schema.properties).sort();
    const schemaAuthorFields = Object.keys(
      schema.$defs.author.properties,
    ).sort();
    const schemaSkillFields = Object.keys(schema.$defs.skill.properties).sort();

    // THEN: The versioned schema identity and model fields describe one contract.
    assert.equal(
      schema.$id,
      "https://github.com/fam-tung-lam/ptlam-skills/tools/plugin-compiler/validation/schemas/plugin-manifest-v1.schema.json",
    );
    assert.deepEqual(schemaPluginFields, [...pluginFields].sort());
    assert.deepEqual(schemaAuthorFields, [...authorFields].sort());
    assert.deepEqual(schemaSkillFields, [...skillFields].sort());
  });

  test.each([
    {
      name: "HTTP homepage",
      change(manifest: FixtureManifest) {
        manifest.homepage = "http://example.test/readme";
      },
      expected: "plugin/plugin.yml#/homepage: must be a valid HTTPS URL",
    },
    {
      name: "malformed repository URL",
      change(manifest: FixtureManifest) {
        manifest.repository = "not a URL";
      },
      expected: "plugin/plugin.yml#/repository: must be a valid HTTPS URL",
    },
    {
      name: "HTTP author URL",
      change(manifest: FixtureManifest) {
        manifest.author.url = "http://example.test/owner";
      },
      expected: "plugin/plugin.yml#/author/url: must be a valid HTTPS URL",
    },
    {
      name: "malformed author email",
      change(manifest: FixtureManifest) {
        manifest.author.email = "owner-at-example.test";
      },
      expected:
        "plugin/plugin.yml#/author/email: must be a valid email address",
    },
  ])("rejects public metadata with $name", async ({ change, expected }) => {
    // GIVEN: One public metadata field violates its semantic contract.
    const manifest = makeManifest();
    change(manifest);
    const rootDir = await createFixture({ manifest });

    // WHEN: The manifest is validated through the public validator.
    const validation = validatePlugin({ rootDir });

    // THEN: The field-specific metadata error is exposed.
    await expectValidationError(validation, [expected]);
  });

  test.each<{
    name: string;
    change: (skill: FixtureSkill) => void;
    errors: string[];
  }>([
    {
      name: "archived skill without archive metadata",
      change(skill) {
        skill.status = SkillStatus.Archived;
      },
      errors: [
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
      errors: [
        "plugin/plugin.yml/skills/0/deprecation: boolean schema is false",
      ],
    },
    {
      name: "deprecated skill without instructions",
      change(skill) {
        skill.status = SkillStatus.Deprecated;
        skill.deprecation = { reason: "Legacy." };
      },
      errors: [
        "plugin/plugin.yml/skills/0/deprecation/instructions: must have required property",
      ],
    },
  ])("rejects $name", async ({ name, change, errors }) => {
    // GIVEN: A one-skill manifest violates one lifecycle metadata rule.
    const manifest = oneSkillManifest();
    change(itemAt(manifest.skills, 0, name));
    const rootDir = await createFixture({ manifest });

    // WHEN: The lifecycle metadata is validated.
    const validation = validatePlugin({ rootDir });

    // THEN: The lifecycle-specific diagnostic is reported.
    await expectValidationError(validation, errors);
  });

  const baseManifestSource = JSON.stringify(makeManifest(), null, 2);

  test("strict YAML 1.2 accepts comments", async () => {
    // GIVEN: A portable manifest contains YAML comments.
    const manifestSource = `# Schema contract\n${baseManifestSource.replace('"version": "1.2.3+1",', '"version": "1.2.3+1", # Plugin release')}`;
    const rootDir = await createFixture({
      manifest: makeManifest(),
      manifestSource,
    });

    // WHEN: The commented YAML manifest is validated.
    const result = await validatePlugin({ rootDir });

    // THEN: The quoted version survives YAML parsing unchanged.
    assert.equal(result.plugin.version, "1.2.3+1");
  });

  test.each([
    {
      name: "duplicate keys",
      source: baseManifestSource.replace(
        '"schema_version": 1,',
        '"schema_version": 1,\n  "schema_version": 1,',
      ),
      errors: ["Map keys must be unique"],
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
      errors: [
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
      errors: ["explicit YAML tags are not supported"],
    },
    {
      name: "merge keys",
      source: baseManifestSource.replace(
        '"name": "fixture-skills",',
        '"<<": {"name": "merged"},\n  "name": "fixture-skills",',
      ),
      errors: ["YAML merge keys are not supported"],
    },
    {
      name: "unquoted version",
      source: baseManifestSource.replace(
        '"version": "1.2.3+1"',
        '"version": 1.2',
      ),
      errors: ["version must be quoted"],
    },
    {
      name: "interpolation",
      source: baseManifestSource.replace(
        '"description": "Plugin description."',
        `"description": "$${"{PLUGIN_DESCRIPTION}"}"`,
      ),
      errors: ["interpolation is not supported"],
    },
  ])("rejects YAML $name", async ({ source, errors }) => {
    // GIVEN: A manifest uses one non-portable YAML feature.
    const rootDir = await createFixture({
      manifest: makeManifest(),
      manifestSource: source,
    });

    // WHEN: The strict YAML manifest is parsed.
    const validation = validatePlugin({ rootDir });

    // THEN: The portability diagnostic is reported.
    await expectValidationError(validation, errors);
  });

  test("manifest and flat source directories have a fail-closed one-to-one mapping", async () => {
    // GIVEN: The manifest omits one source while the tree adds an orphan and a file.
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

    // WHEN: Manifest-to-directory mapping is validated.
    const validation = validatePlugin({ rootDir });

    // THEN: Missing, orphaned, and non-directory entries are all rejected.
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
      errors: ["must not contain YAML frontmatter"],
    },
    {
      name: "missing marker",
      source: "# Alpha\n",
      errors: ["expected exactly one", "found 0"],
    },
    {
      name: "duplicate marker",
      source: `${REQUIRED_SKILLS_MARKER}\n${REQUIRED_SKILLS_MARKER}\n`,
      errors: ["expected exactly one", "found 2"],
    },
  ])("rejects source SKILL.md with $name", async ({ source, errors }) => {
    // GIVEN: A one-skill manifest has an invalid authored SKILL.md source.
    const rootDir = await createFixture({
      manifest: oneSkillManifest(),
      skillSources: { "alpha-skill": source },
    });

    // WHEN: The authored SKILL.md contract is validated.
    const validation = validatePlugin({ rootDir });

    // THEN: The source-contract diagnostic is reported.
    await expectValidationError(validation, errors);
  });

  test("skill resources reject compiler-owned paths, symlinks, escapes, and missing links", async () => {
    // GIVEN: A skill contains a compiler-owned path, symlink, escape, and missing link.
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

    // WHEN: Its complete source tree is validated.
    const validation = validatePlugin({ rootDir });

    // THEN: Every unsafe source-tree condition is rejected.
    await expectValidationError(validation, [
      "references/required-skills/ is owned by the plugin compiler",
      "symbolic links are not supported in skill sources",
      "local link escapes the skill",
      "local link target does not exist",
    ]);
  });

  test("category, dependency, lifecycle, replacement, and DAG errors aggregate", async () => {
    // GIVEN: One graph contains independent category, edge, replacement, and cycle errors.
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
    betaSkill.status = SkillStatus.Deprecated;
    betaSkill.deprecation = {
      reason: "Old.",
      instructions: "Use alpha.",
      replacement_skill_id: "beta-skill",
    };
    const rootDir = await createFixture({ manifest });

    // WHEN: The graph is validated through the repository seam.
    const validation = validatePlugin({ rootDir });

    // THEN: Independent graph errors aggregate in one failure.
    await expectValidationError(validation, [
      'unknown category "missing-category"',
      'skill "alpha-skill" cannot require itself',
      'references unknown skill "missing-skill"',
      'skill "beta-skill" cannot replace itself',
      "required_skills must form an acyclic graph",
    ]);
  });

  test("category IDs, skill IDs, and direct requirement IDs are unique", async () => {
    // GIVEN: Category, skill, and direct-requirement IDs are duplicated.
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

    // WHEN: Identifier uniqueness is validated.
    const validation = validatePlugin({ rootDir });

    // THEN: Each identifier scope reports its duplicate.
    await expectValidationError(validation, [
      'duplicate category id "engineering"',
      'duplicate skill id "beta-skill"',
      'duplicate required skill "beta-skill"',
    ]);
  });

  test("active outputs cannot depend on draft or archived skills", async () => {
    // GIVEN: An active skill depends on draft and archived skills.
    const manifest = makeManifest();
    manifest.skills.push({
      id: "archived-skill",
      description: "Archived.",
      category_id: "engineering",
      visibility: SkillVisibility.Internal,
      status: SkillStatus.Archived,
      archive: { reason: "Historical." },
      required_skills: [],
    });
    itemAt(manifest.skills, 1, "beta skill").status = SkillStatus.Draft;
    itemAt(manifest.skills, 0, "alpha skill").required_skills = [
      requirement("beta-skill"),
      requirement("archived-skill"),
    ];
    const rootDir = await createFixture({ manifest });

    // WHEN: Dependency lifecycle compatibility is validated.
    const validation = validatePlugin({ rootDir });

    // THEN: Each incompatible edge reports one lifecycle error.
    await expectValidationError(validation, [
      'active skill "alpha-skill" cannot require draft skill "beta-skill"',
      'non-archived skill "alpha-skill" cannot require archived skill "archived-skill"',
    ]);
  });

  test("deprecated dependencies and unreachable internal skills are warnings", async () => {
    // GIVEN: A public root requires a deprecated skill while another internal skill is unused.
    const manifest = makeManifest();
    const betaSkill = itemAt(manifest.skills, 1, "beta skill");
    betaSkill.status = SkillStatus.Deprecated;
    betaSkill.deprecation = {
      reason: "Legacy foundation.",
      instructions: "Migrate when practical.",
    };
    manifest.skills.push({
      id: "unused-core",
      description: "Unused internal core.",
      category_id: "engineering",
      visibility: SkillVisibility.Internal,
      status: SkillStatus.Active,
      required_skills: [],
    });
    const rootDir = await createFixture({ manifest });

    // WHEN: The valid graph is inspected for migration and reachability concerns.
    const result = await validatePlugin({ rootDir });

    // THEN: Both concerns are returned as non-failing warnings.
    assert.equal(result.warnings.length, 2);
    assert.ok(
      result.warnings.some((message) =>
        message.includes("requires deprecated skill"),
      ),
    );
    assert.ok(
      result.warnings.some((message) =>
        message.includes('"unused-core" is unreachable'),
      ),
    );
  });

  test("manifest and nested source paths reject symbolic links", async () => {
    // GIVEN: The canonical plugin path is replaced by a directory symlink.
    const rootDir = await createTemporaryDirectory("ptlam-validate-plugin-");
    const externalRoot = await createFixture({ manifest: makeManifest() });
    await symlink(
      path.join(externalRoot, "plugin"),
      path.join(rootDir, "plugin"),
      "dir",
    );
    // WHEN: Repository path safety is validated.
    const validation = validatePlugin({ rootDir });

    // THEN: Validation fails closed before following the symlink.
    await expectValidationError(validation, [
      "plugin: symbolic links are not supported in plugin paths",
    ]);
  });

  function makeManifest(): FixtureManifest {
    return {
      schema_version: PluginSchemaVersion.V1,
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
          visibility: SkillVisibility.Public,
          status: SkillStatus.Active,
          required_skills: [requirement("beta-skill")],
        },
        {
          id: "beta-skill",
          description: "Description for beta-skill.",
          category_id: "productivity",
          visibility: SkillVisibility.Internal,
          status: SkillStatus.Active,
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
    const rootDir = await createTemporaryDirectory("ptlam-validate-plugin-");
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
      assert.equal(Object.isFrozen(error.errors), true);
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
