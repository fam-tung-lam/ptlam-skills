import assert from "node:assert/strict";
import test from "node:test";

import { PluginCompilerCLI } from "../../../tools/plugin-compiler/plugin_compiler_cli.mjs";

function createOutput() {
  const stdout = [];
  const stderr = [];
  return {
    stdout,
    stderr,
    options: {
      rootDir: "/repository",
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
    },
  };
}

function unused(name) {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(`${name} must not be called`);
      },
    },
  );
}

test("returns usage error for an unknown command without delegating", async () => {
  const output = createOutput();
  const cli = new PluginCompilerCLI({
    validator: unused("validator"),
    generator: unused("generator"),
    checker: unused("checker"),
  });

  assert.equal(await cli.run("unknown", output.options), 2);
  assert.deepEqual(output.stdout, []);
  assert.match(output.stderr[0], /<validate\|generate\|check>/u);
});

test("validate delegates only to PluginValidator", async () => {
  const output = createOutput();
  const requests = [];
  const cli = new PluginCompilerCLI({
    validator: {
      async validatePlugin(request) {
        requests.push(request);
        return {
          plugin: { skills: [{}, {}], categories: [{}] },
          diagnostics: [],
        };
      },
    },
    generator: unused("generator"),
    checker: unused("checker"),
  });

  assert.equal(await cli.run("validate", output.options), 0);
  assert.deepEqual(requests, [{ rootDir: "/repository" }]);
  assert.deepEqual(output.stderr, []);
  assert.deepEqual(output.stdout, [
    "Plugin is valid: 2 skills in 1 categories.",
  ]);
});

test("generate presents changed and unchanged paths from PluginGenerator", async () => {
  const output = createOutput();
  const requests = [];
  const cli = new PluginCompilerCLI({
    validator: unused("validator"),
    generator: {
      async generatePlugin(request) {
        requests.push(request);
        return {
          plugin: {},
          changedPaths: ["README.md"],
          unchangedPaths: ["skills/README.md"],
        };
      },
    },
    checker: unused("checker"),
  });

  assert.equal(await cli.run("generate", output.options), 0);
  assert.deepEqual(requests, [{ rootDir: "/repository" }]);
  assert.deepEqual(output.stderr, []);
  assert.deepEqual(output.stdout, [
    "Generated plugin outputs:",
    "- README.md",
    "- skills/README.md (unchanged)",
  ]);
});

test("check returns success when PluginChecker reports current outputs", async () => {
  const output = createOutput();
  const cli = new PluginCompilerCLI({
    validator: unused("validator"),
    generator: unused("generator"),
    checker: {
      async checkPlugin() {
        return { plugin: {}, isCurrent: true, drift: [] };
      },
    },
  });

  assert.equal(await cli.run("check", output.options), 0);
  assert.deepEqual(output.stderr, []);
  assert.deepEqual(output.stdout, ["Plugin outputs are current."]);
});

test("check reports every drift item without invoking a write path", async () => {
  const output = createOutput();
  const cli = new PluginCompilerCLI({
    validator: unused("validator"),
    generator: unused("generator"),
    checker: {
      async checkPlugin() {
        return {
          plugin: {},
          isCurrent: false,
          drift: [
            { path: "README.md", reason: "content differs" },
            { path: ".claude-plugin/plugin.json", reason: "file is missing" },
          ],
        };
      },
    },
  });

  assert.equal(await cli.run("check", output.options), 1);
  assert.deepEqual(output.stdout, []);
  assert.deepEqual(output.stderr, [
    "Plugin outputs are stale:",
    "- README.md: content differs",
    "- .claude-plugin/plugin.json: file is missing",
    "Run `npm run catalog:generate` and commit the results.",
  ]);
});

test("maps command failures to exit code one", async () => {
  const output = createOutput();
  const cli = new PluginCompilerCLI({
    validator: {
      async validatePlugin() {
        throw new Error("boom");
      },
    },
    generator: unused("generator"),
    checker: unused("checker"),
  });

  assert.equal(await cli.run("validate", output.options), 1);
  assert.deepEqual(output.stdout, []);
  assert.deepEqual(output.stderr, ["Plugin command failed: boom"]);
});
