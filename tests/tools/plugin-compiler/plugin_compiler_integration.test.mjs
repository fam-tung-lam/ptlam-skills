import assert from "node:assert/strict";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { PluginChecker } from "../../../tools/plugin-compiler/plugin_checker.mjs";
import { PluginGenerator } from "../../../tools/plugin-compiler/plugin_generator.mjs";
import {
  PluginValidationError,
  PluginValidator,
} from "../../../tools/plugin-compiler/plugin_validator.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, "../../..");

const sourcePaths = [
  "plugin.yml",
  "skills/engineering/ptlam-testing/SKILL.md",
  "skills/engineering/test-review-change/SKILL.md",
  "skills/productivity/ptlam-visualization-with-html/SKILL.md",
  "skills/productivity/test-plan-task/SKILL.md",
  "skills/utilities/test-format-text/SKILL.md",
];

const outputPaths = [
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "README.md",
  "skills/README.md",
];

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

async function createRepository(t) {
  const rootDir = await mkdtemp(
    path.join(tmpdir(), "ptlam-plugin-compiler-integration-"),
  );
  t.after(() => rm(rootDir, { force: true, recursive: true }));

  for (const relativePath of sourcePaths) {
    const destination = path.join(rootDir, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(repositoryRoot, relativePath), destination);
  }

  await writeFile(path.join(rootDir, "README.md"), rootReadme, "utf8");
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

test("a real repository validates, generates four outputs, and checks current", async (t) => {
  const rootDir = await createRepository(t);
  const { validator, generator, checker } = createCompiler();

  const validation = await validator.validatePlugin({ rootDir });
  assert.deepEqual(validation.diagnostics, []);
  assert.deepEqual(
    validation.plugin.skills.map((skill) => skill.id),
    [
      "ptlam-testing",
      "test-review-change",
      "test-plan-task",
      "ptlam-visualization-with-html",
      "test-format-text",
    ],
  );

  const generation = await generator.generatePlugin({ rootDir });
  assert.deepEqual(generation.changedPaths, outputPaths);
  assert.deepEqual(generation.unchangedPaths, []);

  const generated = await readOutputs(rootDir);
  const claudePlugin = JSON.parse(generated[".claude-plugin/plugin.json"]);
  assert.equal(claudePlugin.name, "ptlam-skills");
  assert.equal(claudePlugin.skills.length, 5);
  assert.match(generated["README.md"], /`ptlam-testing`/u);
  assert.match(generated["skills/README.md"], /`engineering`/u);

  const current = await checker.checkPlugin({ rootDir });
  assert.equal(current.isCurrent, true);
  assert.deepEqual(current.drift, []);
});

test("a source change creates drift and check never mutates outputs", async (t) => {
  const rootDir = await createRepository(t);
  const { generator, checker } = createCompiler();
  await generator.generatePlugin({ rootDir });

  const beforeDriftCheck = await readOutputs(rootDir);
  const manifestPath = path.join(rootDir, "plugin.yml");
  const manifest = await readFile(manifestPath, "utf8");
  await writeFile(
    manifestPath,
    manifest.replace(
      "Create polished, interactive local HTML artifacts.",
      "Create polished, interactive local HTML review artifacts.",
    ),
    "utf8",
  );

  const stale = await checker.checkPlugin({ rootDir });
  assert.equal(stale.isCurrent, false);
  assert.deepEqual(stale.drift, [
    { path: "README.md", reason: "content differs" },
  ]);
  assert.deepEqual(await readOutputs(rootDir), beforeDriftCheck);
});

test("invalid source prevents generation from changing existing outputs", async (t) => {
  const rootDir = await createRepository(t);
  const { generator } = createCompiler();
  await generator.generatePlugin({ rootDir });
  const beforeFailure = await readOutputs(rootDir);

  const manifestPath = path.join(rootDir, "plugin.yml");
  const manifest = await readFile(manifestPath, "utf8");
  await writeFile(
    manifestPath,
    manifest.replace(
      "schema_version: 1",
      "schema_version: 1\nunexpected: true",
    ),
    "utf8",
  );

  await assert.rejects(
    generator.generatePlugin({ rootDir }),
    (error) => error instanceof PluginValidationError,
  );
  assert.deepEqual(await readOutputs(rootDir), beforeFailure);
});

test("a missing README prevents partial regeneration", async (t) => {
  const rootDir = await createRepository(t);
  const { generator } = createCompiler();
  await generator.generatePlugin({ rootDir });

  const skillsReadmePath = path.join(rootDir, "skills", "README.md");
  await rm(skillsReadmePath);
  const preservedPaths = outputPaths.filter(
    (relativePath) => relativePath !== "skills/README.md",
  );
  const beforeFailure = await readOutputs(rootDir, preservedPaths);

  const manifestPath = path.join(rootDir, "plugin.yml");
  const manifest = await readFile(manifestPath, "utf8");
  await writeFile(
    manifestPath,
    manifest.replace('version: "0.1.0"', 'version: "0.1.1"'),
    "utf8",
  );

  await assert.rejects(
    generator.generatePlugin({ rootDir }),
    /skills\/README\.md|missing|ENOENT/iu,
  );
  assert.deepEqual(await readOutputs(rootDir, preservedPaths), beforeFailure);
  await assert.rejects(readFile(skillsReadmePath, "utf8"), { code: "ENOENT" });
});
