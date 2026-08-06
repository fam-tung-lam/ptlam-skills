import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, onTestFinished } from "vitest";

import { PluginCompiler } from "../../../../tools/plugin-compiler/plugin-compiler.ts";
import { PluginPublicationDriftReason } from "../../../../tools/plugin-compiler/publication/plugin-publication.ts";
import { PluginValidationError } from "../../../../tools/plugin-compiler/validation/plugin-validation-error.ts";

const outputPaths = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "README.md",
  "skills/fixture-skill/SKILL.md",
];

const fixtureManifest = `schema_version: 1
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

async function createFixtureRepository(): Promise<string> {
  const rootDir = await mkdtemp(
    path.join(tmpdir(), "ptlam-plugin-compiler-integration-"),
  );
  onTestFinished(() => rm(rootDir, { force: true, recursive: true }));

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
  return rootDir;
}

async function readOutputs(
  rootDir: string,
  paths: readonly string[] = outputPaths,
): Promise<Record<string, string>> {
  return Object.fromEntries(
    await Promise.all(
      paths.map(
        async (relativePath) =>
          [
            relativePath,
            await readFile(path.join(rootDir, relativePath), "utf8"),
          ] as const,
      ),
    ),
  );
}

function outputAt(
  outputs: Readonly<Record<string, string>>,
  path: string,
): string {
  const output = outputs[path];
  if (output === undefined) throw new Error(`Missing fixture output: ${path}`);
  return output;
}

describe("plugin compiler repository workflow", () => {
  it("a fixture repository generates all outputs and checks current", async () => {
    // GIVEN: A valid repository has stale generated outputs.
    const rootDir = await createFixtureRepository();
    const compiler = new PluginCompiler();

    // WHEN: The authored sources are validated.
    const validation = await compiler.validatePlugin({ rootDir });

    // THEN: Validation returns one immutable warning list and skill snapshot.
    assert.deepEqual(validation.warnings, []);
    assert.equal(Object.isFrozen(validation.warnings), true);
    assert.deepEqual(
      validation.plugin.skills.map((skill) => skill.id),
      ["fixture-skill"],
    );

    // WHEN: The repository outputs are generated.
    const generation = await compiler.generatePlugin({ rootDir });

    // THEN: Generation reports immutable changed and unchanged path lists.
    assert.deepEqual(generation.changedPaths, [
      ".claude-plugin/plugin.json",
      ".claude-plugin/marketplace.json",
      "README.md",
      "skills",
    ]);
    assert.deepEqual(generation.unchangedPaths, []);
    assert.equal(Object.isFrozen(generation.warnings), true);
    assert.equal(Object.isFrozen(generation.changedPaths), true);
    assert.equal(Object.isFrozen(generation.unchangedPaths), true);

    // WHEN: The generated files are read as consumer artifacts.
    const generated = await readOutputs(rootDir);
    const claudePlugin = JSON.parse(
      outputAt(generated, ".claude-plugin/plugin.json"),
    ) as { name: string; skills: string[] };

    // THEN: Host metadata and the catalog contain the public skill.
    assert.equal(claudePlugin.name, "fixture-skills");
    assert.deepEqual(claudePlugin.skills, ["./skills/fixture-skill"]);
    assert.match(outputAt(generated, "README.md"), /`fixture-skill`/u);

    // WHEN: The generated repository is checked for drift.
    const current = await compiler.checkPlugin({ rootDir });

    // THEN: Check returns an immutable empty drift list.
    assert.equal(current.isCurrent, true);
    assert.deepEqual(current.drift, []);
    assert.equal(Object.isFrozen(current.warnings), true);
    assert.equal(Object.isFrozen(current.drift), true);
  });

  it("a source change creates drift and check never mutates outputs", async () => {
    // GIVEN: Generated outputs are current before one source description changes.
    const rootDir = await createFixtureRepository();
    const compiler = new PluginCompiler();
    await compiler.generatePlugin({ rootDir });

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

    // WHEN: Check compares the source change without generating.
    const stale = await compiler.checkPlugin({ rootDir });

    // THEN: Only affected files drift and committed outputs remain untouched.
    assert.equal(stale.isCurrent, false);
    assert.deepEqual(stale.drift, [
      {
        path: "README.md",
        reason: PluginPublicationDriftReason.ContentDiffers,
      },
      {
        path: "skills/fixture-skill/SKILL.md",
        reason: PluginPublicationDriftReason.ContentDiffers,
      },
    ]);
    assert.deepEqual(await readOutputs(rootDir), beforeDriftCheck);
  });

  it("invalid source prevents generation from changing existing outputs", async () => {
    // GIVEN: Current outputs exist before the manifest becomes invalid.
    const rootDir = await createFixtureRepository();
    const compiler = new PluginCompiler();
    await compiler.generatePlugin({ rootDir });
    const beforeFailure = await readOutputs(rootDir);

    const manifestPath = path.join(rootDir, "plugin", "plugin.yml");
    const manifest = await readFile(manifestPath, "utf8");
    await writeFile(
      manifestPath,
      manifest.replace(
        "schema_version: 1",
        "schema_version: 1\nunexpected: true",
      ),
      "utf8",
    );

    // WHEN: Generation validates the broken manifest.
    const generation = compiler.generatePlugin({ rootDir });

    // THEN: Validation fails before any generated output changes.
    await assert.rejects(
      generation,
      (error) => error instanceof PluginValidationError,
    );
    assert.deepEqual(await readOutputs(rootDir), beforeFailure);
  });

  it("a missing root README prevents partial regeneration", async () => {
    // GIVEN: Current outputs exist before the required root README is removed.
    const rootDir = await createFixtureRepository();
    const compiler = new PluginCompiler();
    await compiler.generatePlugin({ rootDir });

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

    // WHEN: Generation plans an updated publication without the README.
    const generation = compiler.generatePlugin({ rootDir });

    // THEN: Planning fails before any remaining output changes.
    await assert.rejects(generation, /README\.md|missing|ENOENT/iu);
    assert.deepEqual(await readOutputs(rootDir, preservedPaths), beforeFailure);
    await assert.rejects(readFile(rootReadmePath, "utf8"), { code: "ENOENT" });
  });
});
