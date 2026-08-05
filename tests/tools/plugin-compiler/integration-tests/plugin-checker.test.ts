import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, test, vi } from "vitest";

import { PluginChecker } from "../../../../tools/plugin-compiler/plugin-checker.ts";
import {
  type BuildExpectedOutputPlanRequest,
  type ExpectedOutputPlan,
  PluginGenerator,
} from "../../../../tools/plugin-compiler/plugin-generator.ts";
import { createPluginValidatorFake } from "./test-doubles/plugin-validator-fake.ts";
import {
  createOutputRoot,
  makeOutputPlugin,
  readManagedState,
} from "./test-fixtures/output-repository-fixture.ts";

describe("PluginChecker", () => {
  test("check reports deterministic drift and never repairs files", async () => {
    // GIVEN: An isolated plugin output repository and checker scenario are prepared.
    const rootDir = await createOutputRoot();
    const plugin = makeOutputPlugin();
    const validator = createPluginValidatorFake(plugin);
    const generator = new PluginGenerator({ validator });
    const checker = new PluginChecker({ validator, generator });
    const before = await readManagedState(rootDir);

    // WHEN: The scenario is exercised through the checker or generator public operation.
    const result = await checker.checkPlugin({ rootDir });

    // THEN: The reported drift and resulting filesystem state are verified.
    assert.equal(result.plugin, plugin);
    assert.equal(result.isCurrent, false);
    assert.deepEqual(result.drift, [
      { path: ".claude-plugin/plugin.json", reason: "file is missing" },
      { path: ".claude-plugin/marketplace.json", reason: "file is missing" },
      { path: "README.md", reason: "content differs" },
      { path: "skills/README.md", reason: "content differs" },
      {
        path: "skills/review-code-change/SKILL.md",
        reason: "file is missing",
      },
    ]);
    assert.deepEqual(await readManagedState(rootDir), before);
    assert.deepEqual(validator.calls, [{ rootDir }]);
  });

  test("check is current after generation and reuses the generator plan", async () => {
    // GIVEN: An isolated plugin output repository and checker scenario are prepared.
    const rootDir = await createOutputRoot();
    const plugin = makeOutputPlugin();
    const validator = createPluginValidatorFake(plugin);
    const generator = new PluginGenerator({ validator });
    await generator.generatePlugin({ rootDir });
    const checker = new PluginChecker({ validator, generator });
    const before = await readManagedState(rootDir);

    // WHEN: The scenario is exercised through the checker or generator public operation.
    const result = await checker.checkPlugin({ rootDir });

    // THEN: The reported drift and resulting filesystem state are verified.
    assert.deepEqual(result, {
      plugin,
      diagnostics: [],
      isCurrent: true,
      drift: [],
    });
    assert.deepEqual(await readManagedState(rootDir), before);
  });

  test("check reports missing README and stale JSON together without writes", async () => {
    // GIVEN: An isolated plugin output repository and checker scenario are prepared.
    const rootDir = await createOutputRoot();
    const validator = createPluginValidatorFake();
    const generator = new PluginGenerator({ validator });
    await generator.generatePlugin({ rootDir });
    await rm(path.join(rootDir, "README.md"));
    const pluginJsonPath = path.join(rootDir, ".claude-plugin", "plugin.json");
    await writeFile(pluginJsonPath, '{"stale":true}\n', "utf8");
    const before = await readManagedState(rootDir);
    const checker = new PluginChecker({ validator, generator });

    // WHEN: The scenario is exercised through the checker or generator public operation.
    const result = await checker.checkPlugin({ rootDir });

    // THEN: The reported drift and resulting filesystem state are verified.
    assert.equal(result.isCurrent, false);
    assert.deepEqual(result.drift, [
      { path: ".claude-plugin/plugin.json", reason: "content differs" },
      { path: "README.md", reason: "file is missing" },
    ]);
    assert.deepEqual(await readManagedState(rootDir), before);
  });

  test("checker passes validated Plugin to the narrow generator collaboration", async () => {
    // GIVEN: An isolated plugin output repository and checker scenario are prepared.
    const plugin = makeOutputPlugin();
    const validator = createPluginValidatorFake(plugin);
    const generator = {
      buildExpectedOutputPlan: vi.fn(
        (
          _request: BuildExpectedOutputPlanRequest,
        ): Promise<ExpectedOutputPlan> =>
          Promise.resolve({
            entries: [
              {
                path: ".claude-plugin/plugin.json",
                expected: "expected\n",
                current: "stale\n",
                exists: true,
              },
            ],
            missing: [],
            expectedSkills: new Map(),
          }),
      ),
    };
    const checker = new PluginChecker({ validator, generator });

    // WHEN: The scenario is exercised through the checker or generator public operation.
    const result = await checker.checkPlugin({ rootDir: "/fixture/root" });

    // THEN: The reported drift and resulting filesystem state are verified.
    assert.deepEqual(generator.buildExpectedOutputPlan.mock.calls, [
      [
        {
          rootDir: "/fixture/root",
          plugin,
          allowMissingReadmes: true,
        },
      ],
    ]);
    assert.deepEqual(result, {
      plugin,
      diagnostics: [],
      isCurrent: false,
      drift: [
        { path: ".claude-plugin/plugin.json", reason: "content differs" },
      ],
    });
  });

  test("check reports and generation removes unexpected files in skills", async () => {
    // GIVEN: An isolated plugin output repository and checker scenario are prepared.
    const rootDir = await createOutputRoot();
    const plugin = makeOutputPlugin();
    const validator = createPluginValidatorFake(plugin);
    const generator = new PluginGenerator({ validator });
    await generator.generatePlugin({ rootDir });
    const stalePath = path.join(rootDir, "skills", "stale.txt");
    await writeFile(stalePath, "stale\n", "utf8");
    const checker = new PluginChecker({ validator, generator });

    // WHEN: The scenario is exercised through the checker or generator public operation.
    const stale = await checker.checkPlugin({ rootDir });

    // THEN: The reported drift and resulting filesystem state are verified.
    assert.deepEqual(stale.drift, [
      { path: "skills/stale.txt", reason: "unexpected file" },
    ]);

    // WHEN: The scenario is exercised through the checker or generator public operation.
    const regenerated = await generator.generatePlugin({ rootDir });

    // THEN: The reported drift and resulting filesystem state are verified.
    assert.deepEqual(regenerated.changedPaths, ["skills"]);
    await assert.rejects(readFile(stalePath), { code: "ENOENT" });
  });
});
