import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  MANAGED_OUTPUT_PATHS,
  PluginGenerator,
} from "../../../../tools/plugin-compiler/plugin_generator.mjs";
import {
  createOutputRoot,
  makeOutputPlugin,
  readManagedState,
} from "./test-fixtures/output_repository_fixture.mjs";
import { createPluginValidatorFake } from "./test-doubles/plugin_validator_fake.mjs";

test("generate validates once and writes only changed complete outputs", async (t) => {
  // Given
  const rootDir = await createOutputRoot(t);
  const plugin = makeOutputPlugin();
  const validator = createPluginValidatorFake(plugin);
  const generator = new PluginGenerator({ validator });

  // When
  const first = await generator.generatePlugin({ rootDir });

  // Then
  assert.equal(first.plugin, plugin);
  assert.deepEqual(first.changedPaths, MANAGED_OUTPUT_PATHS);
  assert.deepEqual(first.unchangedPaths, []);
  assert.deepEqual(validator.calls, [{ rootDir }]);
  const firstState = await readManagedState(rootDir);
  for (const relativePath of MANAGED_OUTPUT_PATHS) {
    assert.equal(typeof firstState[relativePath], "string");
  }

  // When
  const second = await generator.generatePlugin({ rootDir });

  // Then
  assert.deepEqual(second.changedPaths, []);
  assert.deepEqual(second.unchangedPaths, MANAGED_OUTPUT_PATHS);
  assert.deepEqual(await readManagedState(rootDir), firstState);
  assert.deepEqual(validator.calls, [{ rootDir }, { rootDir }]);
});

test("expected-output plan is deterministic, ordered, and read-only", async (t) => {
  // Given
  const rootDir = await createOutputRoot(t, { missingRootReadme: true });
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });
  const before = await readManagedState(rootDir);

  // When
  const first = await generator.buildExpectedOutputPlan({
    rootDir,
    plugin: makeOutputPlugin(),
    allowMissingReadmes: true,
  });
  const second = await generator.buildExpectedOutputPlan({
    rootDir,
    plugin: makeOutputPlugin(),
    allowMissingReadmes: true,
  });

  // Then
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.entries.map((entry) => entry.path),
    MANAGED_OUTPUT_PATHS,
  );
  assert.deepEqual(first.missing, ["README.md"]);
  assert.deepEqual(first.entries[2], {
    path: "README.md",
    expected: first.entries[2].expected,
    current: null,
    exists: false,
  });
  assert.match(first.entries[2].expected, /## Available skills/);
  assert.deepEqual(await readManagedState(rootDir), before);
});

test("missing README or render failure writes nothing", async (t) => {
  // Given
  const missingRoot = await createOutputRoot(t, { missingRootReadme: true });
  const missingGenerator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });
  const beforeMissing = await readManagedState(missingRoot);

  // When
  const missingGeneration = missingGenerator.generatePlugin({
    rootDir: missingRoot,
  });

  // Then
  await assert.rejects(
    missingGeneration,
    /README\.md: README source file is missing/,
  );
  assert.deepEqual(await readManagedState(missingRoot), beforeMissing);

  const invalidRoot = await createOutputRoot(t, {
    skillsReadme: "# Skills without managed markers\n",
  });
  const invalidGenerator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });
  const beforeInvalid = await readManagedState(invalidRoot);

  // When
  const invalidGeneration = invalidGenerator.generatePlugin({
    rootDir: invalidRoot,
  });

  // Then
  await assert.rejects(
    invalidGeneration,
    /skills\/README\.md: missing start marker/,
  );
  assert.deepEqual(await readManagedState(invalidRoot), beforeInvalid);
});

test("generation rejects symlinked output parents before any managed write", async (t) => {
  // Given
  const rootDir = await createOutputRoot(t);
  const externalRoot = await mkdtemp(
    path.join(tmpdir(), "plugin-generator-external-"),
  );
  t.after(() => rm(externalRoot, { force: true, recursive: true }));
  await symlink(externalRoot, path.join(rootDir, ".claude-plugin"), "dir");
  const before = await readManagedState(rootDir);
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });

  // When
  const generation = generator.generatePlugin({ rootDir });

  // Then
  await assert.rejects(
    generation,
    /managed output path contains symbolic link/,
  );

  assert.deepEqual(await readdir(externalRoot), []);
  assert.deepEqual(await readManagedState(rootDir), before);
});

test("generation atomically replaces a stale regular output", async (t) => {
  // Given
  const rootDir = await createOutputRoot(t);
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });
  await generator.generatePlugin({ rootDir });
  const pluginPath = path.join(rootDir, ".claude-plugin", "plugin.json");
  await writeFile(pluginPath, '{"stale":true}\n', "utf8");

  // When
  const result = await generator.generatePlugin({ rootDir });

  // Then
  assert.deepEqual(result.changedPaths, [".claude-plugin/plugin.json"]);
  assert.equal(
    JSON.parse(await readFile(pluginPath, "utf8")).name,
    "fixture-skills",
  );
  assert.deepEqual(
    (await readdir(path.dirname(pluginPath))).filter((name) =>
      name.endsWith(".tmp"),
    ),
    [],
  );
});
