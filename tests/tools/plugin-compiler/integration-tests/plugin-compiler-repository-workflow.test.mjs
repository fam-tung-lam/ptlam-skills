import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { PluginChecker } from "../../../../tools/plugin-compiler/plugin-checker.mjs";
import { PluginGenerator } from "../../../../tools/plugin-compiler/plugin-generator.mjs";
import {
  PluginValidationError,
  PluginValidator,
} from "../../../../tools/plugin-compiler/plugin-validator.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "../../../..");

const outputPaths = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "README.md",
  "skills/README.md",
  "skills/fixture-skill/SKILL.md",
];

const fixtureManifest = `schema_version: 2
name: fixture-skills
description: Fixture plugin description.
version: "0.1.0"
author:
  name: Fixture Owner
  email: owner@example.test
  url: https://example.test
homepage: https://example.test/readme
repository: https://example.test/repository
license: MIT
keywords:
  - agent-skills

marketplace:
  name: fixture
  description: Fixture marketplace.
  plugin_description: Fixture listing description.
  category: development
  keywords:
    - agent-skills

categories:
  - id: engineering
    name: Engineering
    description: Engineering skills.

skills:
  - id: fixture-skill
    description: Exercise plugin compiler workflows.
    category_id: engineering
    visibility: public
    status: active
    required_skills: []
`;

const fixtureSkill = `# Fixture skill

Exercise compiler workflows.

<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->
`;

const rootReadme = `# Fixture plugin

Human root content before the generated region.

<!-- BEGIN GENERATED:PLUGIN-CATALOG:SKILLS -->

stale root catalog

<!-- END GENERATED:PLUGIN-CATALOG:SKILLS -->

Human root content after the generated region.
`;

const skillsReadme = `# Fixture skills

Human skills content before the generated region.

<!-- BEGIN GENERATED:PLUGIN-CATALOG:CATEGORIES -->

stale category catalog

<!-- END GENERATED:PLUGIN-CATALOG:CATEGORIES -->

Human skills content after the generated region.
`;

async function createFixtureRepository(t) {
  const rootDir = await mkdtemp(
    path.join(tmpdir(), "ptlam-plugin-compiler-integration-"),
  );
  t.after(() => rm(rootDir, { force: true, recursive: true }));

  const skillPath = path.join(
    rootDir,
    "plugin",
    "skills",
    "fixture-skill",
    "SKILL.md",
  );
  await mkdir(path.dirname(skillPath), { recursive: true });
  await writeFile(
    path.join(rootDir, "plugin", "plugin.yml"),
    fixtureManifest,
    "utf8",
  );
  await writeFile(skillPath, fixtureSkill, "utf8");
  await writeFile(path.join(rootDir, "README.md"), rootReadme, "utf8");
  await mkdir(path.join(rootDir, "skills"), { recursive: true });
  await writeFile(
    path.join(rootDir, "skills", "README.md"),
    skillsReadme,
    "utf8",
  );
  return rootDir;
}

function createCompiler() {
  const validator = new PluginValidator();
  const generator = new PluginGenerator({ validator });
  const checker = new PluginChecker({ validator, generator });
  return { validator, generator, checker };
}

async function readOutputs(rootDir, paths = outputPaths) {
  return Object.fromEntries(
    await Promise.all(
      paths.map(async (relativePath) => [
        relativePath,
        await readFile(path.join(rootDir, relativePath), "utf8"),
      ]),
    ),
  );
}

test("the repository catalog validates and generated outputs are current", async () => {
  // GIVEN: An isolated repository workflow scenario is prepared.
  const { validator, checker } = createCompiler();

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const validation = await validator.validatePlugin({
    rootDir: repositoryRoot,
  });

  // THEN: The command result and managed repository state are verified.
  assert.deepEqual(validation.diagnostics, []);

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const current = await checker.checkPlugin({ rootDir: repositoryRoot });

  // THEN: The command result and managed repository state are verified.
  assert.equal(current.isCurrent, true);
  assert.deepEqual(current.drift, []);
});

test("a fixture repository generates all outputs and checks current", async (t) => {
  // GIVEN: An isolated repository workflow scenario is prepared.
  const rootDir = await createFixtureRepository(t);
  const { validator, generator, checker } = createCompiler();

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const validation = await validator.validatePlugin({ rootDir });

  // THEN: The command result and managed repository state are verified.
  assert.deepEqual(validation.diagnostics, []);
  assert.deepEqual(
    validation.plugin.skills.map((skill) => skill.id),
    ["fixture-skill"],
  );

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const generation = await generator.generatePlugin({ rootDir });

  // THEN: The command result and managed repository state are verified.
  assert.deepEqual(generation.changedPaths, [
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    "README.md",
    "skills",
  ]);
  assert.deepEqual(generation.unchangedPaths, []);

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const generated = await readOutputs(rootDir);
  const claudePlugin = JSON.parse(generated[".claude-plugin/plugin.json"]);

  // THEN: The command result and managed repository state are verified.
  assert.equal(claudePlugin.name, "fixture-skills");
  assert.deepEqual(claudePlugin.skills, ["./skills/fixture-skill"]);
  assert.match(generated["README.md"], /`fixture-skill`/u);
  assert.match(generated["skills/README.md"], /`engineering`/u);

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const current = await checker.checkPlugin({ rootDir });

  // THEN: The command result and managed repository state are verified.
  assert.equal(current.isCurrent, true);
  assert.deepEqual(current.drift, []);
});

test("a source change creates drift and check never mutates outputs", async (t) => {
  // GIVEN: An isolated repository workflow scenario is prepared.
  const rootDir = await createFixtureRepository(t);
  const { generator, checker } = createCompiler();
  await generator.generatePlugin({ rootDir });

  const beforeDriftCheck = await readOutputs(rootDir);
  const manifestPath = path.join(rootDir, "plugin", "plugin.yml");
  const manifest = await readFile(manifestPath, "utf8");
  await writeFile(
    manifestPath,
    manifest.replace(
      "Exercise plugin compiler workflows.",
      "Exercise changed compiler workflows.",
    ),
    "utf8",
  );

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const stale = await checker.checkPlugin({ rootDir });

  // THEN: The command result and managed repository state are verified.
  assert.equal(stale.isCurrent, false);
  assert.deepEqual(stale.drift, [
    { path: "README.md", reason: "content differs" },
    { path: "skills/fixture-skill/SKILL.md", reason: "content differs" },
  ]);
  assert.deepEqual(await readOutputs(rootDir), beforeDriftCheck);
});

test("invalid source prevents generation from changing existing outputs", async (t) => {
  // GIVEN: An isolated repository workflow scenario is prepared.
  const rootDir = await createFixtureRepository(t);
  const { generator } = createCompiler();
  await generator.generatePlugin({ rootDir });
  const beforeFailure = await readOutputs(rootDir);

  const manifestPath = path.join(rootDir, "plugin", "plugin.yml");
  const manifest = await readFile(manifestPath, "utf8");
  await writeFile(
    manifestPath,
    manifest.replace(
      "schema_version: 2",
      "schema_version: 2\nunexpected: true",
    ),
    "utf8",
  );

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const generation = generator.generatePlugin({ rootDir });

  // THEN: The command result and managed repository state are verified.
  await assert.rejects(
    generation,
    (error) => error instanceof PluginValidationError,
  );
  assert.deepEqual(await readOutputs(rootDir), beforeFailure);
});

test("a missing root README prevents partial regeneration", async (t) => {
  // GIVEN: An isolated repository workflow scenario is prepared.
  const rootDir = await createFixtureRepository(t);
  const { generator } = createCompiler();
  await generator.generatePlugin({ rootDir });

  const rootReadmePath = path.join(rootDir, "README.md");
  await rm(rootReadmePath);
  const preservedPaths = outputPaths.filter(
    (relativePath) => relativePath !== "README.md",
  );
  const beforeFailure = await readOutputs(rootDir, preservedPaths);

  const manifestPath = path.join(rootDir, "plugin", "plugin.yml");
  const manifest = await readFile(manifestPath, "utf8");
  await writeFile(
    manifestPath,
    manifest.replace('version: "0.1.0"', 'version: "0.1.1"'),
    "utf8",
  );

  // WHEN: The compiler workflow is exercised through its public command boundary.
  const generation = generator.generatePlugin({ rootDir });

  // THEN: The command result and managed repository state are verified.
  await assert.rejects(generation, /README\.md|missing|ENOENT/iu);
  assert.deepEqual(await readOutputs(rootDir, preservedPaths), beforeFailure);
  await assert.rejects(readFile(rootReadmePath, "utf8"), { code: "ENOENT" });
});
