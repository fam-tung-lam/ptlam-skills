import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { PluginChecker } from "../../../../tools/plugin-compiler/plugin_checker.mjs";
import { PluginGenerator } from "../../../../tools/plugin-compiler/plugin_generator.mjs";
import {
  createOutputRoot,
  makeOutputPlugin,
  readManagedState,
} from "./test-fixtures/output_repository_fixture.mjs";
import { createPluginValidatorFake } from "./test-doubles/plugin_validator_fake.mjs";

test("check reports deterministic drift and never repairs files", async (t) => {
  // Given
  const rootDir = await createOutputRoot(t);
  const plugin = makeOutputPlugin();
  const validator = createPluginValidatorFake(plugin);
  const generator = new PluginGenerator({ validator });
  const checker = new PluginChecker({ validator, generator });
  const before = await readManagedState(rootDir);

  // When
  const result = await checker.checkPlugin({ rootDir });

  // Then
  assert.equal(result.plugin, plugin);
  assert.equal(result.isCurrent, false);
  assert.deepEqual(result.drift, [
    { path: ".claude-plugin/plugin.json", reason: "file is missing" },
    { path: ".claude-plugin/marketplace.json", reason: "file is missing" },
    { path: "README.md", reason: "content differs" },
    { path: "skills/README.md", reason: "content differs" },
  ]);
  assert.deepEqual(await readManagedState(rootDir), before);
  assert.deepEqual(validator.calls, [{ rootDir }]);
});

test("check is current after generation and reuses the generator plan", async (t) => {
  // Given
  const rootDir = await createOutputRoot(t);
  const plugin = makeOutputPlugin();
  const validator = createPluginValidatorFake(plugin);
  const generator = new PluginGenerator({ validator });
  await generator.generatePlugin({ rootDir });
  const checker = new PluginChecker({ validator, generator });
  const before = await readManagedState(rootDir);

  // When
  const result = await checker.checkPlugin({ rootDir });

  // Then
  assert.deepEqual(result, { plugin, isCurrent: true, drift: [] });
  assert.deepEqual(await readManagedState(rootDir), before);
});

test("check reports missing README and stale JSON together without writes", async (t) => {
  // Given
  const rootDir = await createOutputRoot(t);
  const validator = createPluginValidatorFake();
  const generator = new PluginGenerator({ validator });
  await generator.generatePlugin({ rootDir });
  await rm(path.join(rootDir, "README.md"));
  const pluginJsonPath = path.join(rootDir, ".claude-plugin", "plugin.json");
  await writeFile(pluginJsonPath, '{"stale":true}\n', "utf8");
  const before = await readManagedState(rootDir);
  const checker = new PluginChecker({ validator, generator });

  // When
  const result = await checker.checkPlugin({ rootDir });

  // Then
  assert.equal(result.isCurrent, false);
  assert.deepEqual(result.drift, [
    { path: ".claude-plugin/plugin.json", reason: "content differs" },
    { path: "README.md", reason: "file is missing" },
  ]);
  assert.deepEqual(await readManagedState(rootDir), before);
});

test("checker passes validated Plugin to the narrow generator collaboration", async () => {
  // Given
  const plugin = makeOutputPlugin();
  const validator = createPluginValidatorFake(plugin);
  const calls = [];
  const generator = {
    async buildExpectedOutputPlan(request) {
      calls.push(request);
      return {
        entries: [
          {
            path: ".claude-plugin/plugin.json",
            expected: "expected\n",
            current: "stale\n",
            exists: true,
          },
        ],
        missing: [],
      };
    },
  };
  const checker = new PluginChecker({ validator, generator });

  // When
  const result = await checker.checkPlugin({ rootDir: "/fixture/root" });

  // Then
  assert.deepEqual(calls, [
    {
      rootDir: "/fixture/root",
      plugin,
      allowMissingReadmes: true,
    },
  ]);
  assert.deepEqual(result, {
    plugin,
    isCurrent: false,
    drift: [{ path: ".claude-plugin/plugin.json", reason: "content differs" }],
  });
});
