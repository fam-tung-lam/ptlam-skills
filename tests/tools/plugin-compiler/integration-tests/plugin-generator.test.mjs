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
} from "../../../../tools/plugin-compiler/plugin-generator.mjs";
import {
  createOutputRoot,
  makeOutputPlugin,
  readManagedState,
} from "./test-fixtures/output-repository-fixture.mjs";
import { createPluginValidatorFake } from "./test-doubles/plugin-validator-fake.mjs";

test("generate validates once and writes only changed complete outputs", async (t) => {
  // GIVEN: An isolated output repository and generator scenario are prepared.
  const rootDir = await createOutputRoot(t);
  const plugin = makeOutputPlugin();
  const validator = createPluginValidatorFake(plugin);
  const generator = new PluginGenerator({ validator });

  // WHEN: The scenario is exercised through the generator public operation.
  const first = await generator.generatePlugin({ rootDir });

  // THEN: The generated result and repository state are verified.
  assert.equal(first.plugin, plugin);
  assert.deepEqual(first.changedPaths, MANAGED_OUTPUT_PATHS);
  assert.deepEqual(first.unchangedPaths, []);
  assert.deepEqual(validator.calls, [{ rootDir }]);
  const firstState = await readManagedState(rootDir);
  assert.equal(typeof firstState[".claude-plugin/plugin.json"], "string");
  assert.equal(typeof firstState[".claude-plugin/marketplace.json"], "string");
  assert.equal(typeof firstState["README.md"], "string");
  assert.equal(typeof firstState.skills, "object");
  assert.ok(firstState.skills["review-code-change/SKILL.md"]);

  // WHEN: The scenario is exercised through the generator public operation.
  const second = await generator.generatePlugin({ rootDir });

  // THEN: The generated result and repository state are verified.
  assert.deepEqual(second.changedPaths, []);
  assert.deepEqual(second.unchangedPaths, MANAGED_OUTPUT_PATHS);
  assert.deepEqual(await readManagedState(rootDir), firstState);
  assert.deepEqual(validator.calls, [{ rootDir }, { rootDir }]);
});

test("expected-output plan is deterministic, ordered, and read-only", async (t) => {
  // GIVEN: An isolated output repository and generator scenario are prepared.
  const rootDir = await createOutputRoot(t, { missingRootReadme: true });
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });
  const before = await readManagedState(rootDir);

  // WHEN: The scenario is exercised through the generator public operation.
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

  // THEN: The generated result and repository state are verified.
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.entries.map((entry) => entry.path),
    [
      ".claude-plugin/plugin.json",
      ".claude-plugin/marketplace.json",
      "README.md",
      "skills/README.md",
      "skills/review-code-change/SKILL.md",
    ],
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
  // GIVEN: An isolated output repository and generator scenario are prepared.
  const missingRoot = await createOutputRoot(t, { missingRootReadme: true });
  const missingGenerator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });
  const beforeMissing = await readManagedState(missingRoot);

  // WHEN: The scenario is exercised through the generator public operation.
  const missingGeneration = missingGenerator.generatePlugin({
    rootDir: missingRoot,
  });

  // THEN: The generated result and repository state are verified.
  await assert.rejects(
    missingGeneration,
    /README\.md: README source file is missing/,
  );
  assert.deepEqual(await readManagedState(missingRoot), beforeMissing);

  const invalidRoot = await createOutputRoot(t, {
    rootReadme: "# Plugin without managed markers\n",
  });
  const invalidGenerator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });
  const beforeInvalid = await readManagedState(invalidRoot);

  // WHEN: The scenario is exercised through the generator public operation.
  const invalidGeneration = invalidGenerator.generatePlugin({
    rootDir: invalidRoot,
  });

  // THEN: The generated result and repository state are verified.
  await assert.rejects(invalidGeneration, /README\.md: missing start marker/);
  assert.deepEqual(await readManagedState(invalidRoot), beforeInvalid);
});

test("generation rejects symlinked output parents before any managed write", async (t) => {
  // GIVEN: An isolated output repository and generator scenario are prepared.
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

  // WHEN: The scenario is exercised through the generator public operation.
  const generation = generator.generatePlugin({ rootDir });

  // THEN: The generated result and repository state are verified.
  await assert.rejects(
    generation,
    /managed output path contains symbolic link/,
  );

  assert.deepEqual(await readdir(externalRoot), []);
  assert.deepEqual(await readManagedState(rootDir), before);
});

test("generation rejects a symlinked repository root without writes", async (t) => {
  // GIVEN: A repository path is a symbolic link to an otherwise valid fixture.
  const realRoot = await createOutputRoot(t);
  const linkParent = await mkdtemp(path.join(tmpdir(), "plugin-generator-link-"));
  t.after(() => rm(linkParent, { force: true, recursive: true }));
  const linkedRoot = path.join(linkParent, "repository");
  await symlink(realRoot, linkedRoot, "dir");
  const before = await readManagedState(realRoot);
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });

  // WHEN: Generation is requested through the symlinked repository path.
  const generation = generator.generatePlugin({ rootDir: linkedRoot });

  // THEN: The unsafe root is rejected before any managed output changes.
  await assert.rejects(
    generation,
    /Repository root must be a real directory, not a link/u,
  );
  assert.deepEqual(await readManagedState(realRoot), before);
});

test("generation atomically replaces a stale regular output", async (t) => {
  // GIVEN: An isolated output repository and generator scenario are prepared.
  const rootDir = await createOutputRoot(t);
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(),
  });
  await generator.generatePlugin({ rootDir });
  const pluginPath = path.join(rootDir, ".claude-plugin", "plugin.json");
  await writeFile(pluginPath, '{"stale":true}\n', "utf8");

  // WHEN: The scenario is exercised through the generator public operation.
  const result = await generator.generatePlugin({ rootDir });

  // THEN: The generated result and repository state are verified.
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

test("a skills staging failure leaves every managed output unchanged", async (t) => {
  // GIVEN: An isolated output repository and generator scenario are prepared.
  const rootDir = await createOutputRoot(t);
  const plugin = makeOutputPlugin();
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(plugin),
  });
  await generator.generatePlugin({ rootDir });
  const before = await readManagedState(rootDir);
  plugin.version = "1.2.4";
  plugin.skills[0].resources = [
    {
      path: `references/${"x".repeat(300)}`,
      content: Buffer.from("cannot be staged"),
    },
  ];

  // WHEN: The scenario is exercised through the generator public operation.
  const generation = generator.generatePlugin({ rootDir });

  // THEN: The generated result and repository state are verified.
  await assert.rejects(generation, /ENAMETOOLONG|name too long/iu);
  assert.deepEqual(await readManagedState(rootDir), before);
  assert.deepEqual(
    (await readdir(rootDir)).filter((name) =>
      name.startsWith(".plugin-compiler-skills-"),
    ),
    [],
  );
});

test("generation preserves multiline dependency context verbatim", async (t) => {
  // GIVEN: An isolated output repository and generator scenario are prepared.
  const rootDir = await createOutputRoot(t);
  const plugin = makeOutputPlugin();
  plugin.skills.unshift({
    id: "base-skill",
    category_id: "engineering",
    description: "Base rules.",
    visibility: "internal",
    status: "active",
    required_skills: [],
    source_body:
      "# Base skill\n\n<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->\n\nApply base rules.\n",
    resources: [],
  });
  plugin.skills[1].required_skills = [
    {
      skill_id: "base-skill",
      reason: "Provides base rules.",
      instructions: "Apply step one.\nApply step two.",
    },
  ];
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(plugin),
  });

  // WHEN: The scenario is exercised through the generator public operation.
  await generator.generatePlugin({ rootDir });
  const generated = await readFile(
    path.join(rootDir, "skills", "review-code-change", "SKILL.md"),
    "utf8",
  );

  // THEN: The generated result and repository state are verified.
  assert.match(
    generated,
    /\*\*Instructions:\*\* Apply step one\.\nApply step two\./u,
  );
});

test("generated-link validation runs before any managed output changes", async (t) => {
  // GIVEN: An isolated output repository and generator scenario are prepared.
  const rootDir = await createOutputRoot(t);
  const plugin = makeOutputPlugin();
  const generator = new PluginGenerator({
    validator: createPluginValidatorFake(plugin),
  });
  await generator.generatePlugin({ rootDir });
  const before = await readManagedState(rootDir);
  plugin.version = "1.2.4";
  plugin.skills[0].source_body =
    "# Review code change\n\n<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->\n\nRead [missing](references/missing.md).\n";

  // WHEN: The scenario is exercised through the generator public operation.
  const generation = generator.generatePlugin({ rootDir });

  // THEN: The generated result and repository state are verified.
  await assert.rejects(
    generation,
    /Generated skills validation failed[\s\S]*local link target does not exist/u,
  );
  assert.deepEqual(await readManagedState(rootDir), before);
});
