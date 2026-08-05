import assert from "node:assert/strict";
import test from "node:test";

import { PluginCompilerCLI } from "../../../../tools/plugin-compiler/plugin-compiler-cli.mjs";
import { PluginValidationError } from "../../../../tools/plugin-compiler/plugin-validator.mjs";

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
  // GIVEN: Command collaborators and captured output streams are prepared.
  const output = createOutput();
  const cli = new PluginCompilerCLI({
    validator: unused("validator"),
    generator: unused("generator"),
    checker: unused("checker"),
  });

  // WHEN: The compiler CLI runs the requested command.
  const exitCode = await cli.run("unknown", output.options);

  // THEN: The exit code, delegation, and user-facing output are verified.
  assert.equal(exitCode, 2);
  assert.deepEqual(output.stdout, []);
  assert.match(output.stderr[0], /<validate\|generate\|check>/u);
});

test("validate delegates only to PluginValidator", async () => {
  // GIVEN: Command collaborators and captured output streams are prepared.
  const output = createOutput();
  const requests = [];
  const cli = new PluginCompilerCLI({
    validator: {
      async validatePlugin(request) {
        requests.push(request);
        return {
          plugin: { skills: [{}, {}], categories: [{}] },
          diagnostics: ["deprecated dependency"],
        };
      },
    },
    generator: unused("generator"),
    checker: unused("checker"),
  });

  // WHEN: The compiler CLI runs the requested command.
  const exitCode = await cli.run("validate", output.options);

  // THEN: The exit code, delegation, and user-facing output are verified.
  assert.equal(exitCode, 0);
  assert.deepEqual(requests, [{ rootDir: "/repository" }]);
  assert.deepEqual(output.stderr, [
    "Plugin warnings:",
    "- deprecated dependency",
  ]);
  assert.deepEqual(output.stdout, [
    "Plugin is valid: 2 skills in 1 categories.",
  ]);
});

test("generate presents changed and unchanged paths from PluginGenerator", async () => {
  // GIVEN: Command collaborators and captured output streams are prepared.
  const output = createOutput();
  const requests = [];
  const cli = new PluginCompilerCLI({
    validator: unused("validator"),
    generator: {
      async generatePlugin(request) {
        requests.push(request);
        return {
          plugin: {},
          diagnostics: ["generation warning"],
          changedPaths: ["README.md"],
          unchangedPaths: ["skills/README.md"],
        };
      },
    },
    checker: unused("checker"),
  });

  // WHEN: The compiler CLI runs the requested command.
  const exitCode = await cli.run("generate", output.options);

  // THEN: The exit code, delegation, and user-facing output are verified.
  assert.equal(exitCode, 0);
  assert.deepEqual(requests, [{ rootDir: "/repository" }]);
  assert.deepEqual(output.stderr, ["Plugin warnings:", "- generation warning"]);
  assert.deepEqual(output.stdout, [
    "Generated plugin outputs:",
    "- README.md",
    "- skills/README.md (unchanged)",
  ]);
});

test("check returns success when PluginChecker reports current outputs", async () => {
  // GIVEN: Command collaborators and captured output streams are prepared.
  const output = createOutput();
  const cli = new PluginCompilerCLI({
    validator: unused("validator"),
    generator: unused("generator"),
    checker: {
      async checkPlugin() {
        return {
          plugin: {},
          diagnostics: ["check warning"],
          isCurrent: true,
          drift: [],
        };
      },
    },
  });

  // WHEN: The compiler CLI runs the requested command.
  const exitCode = await cli.run("check", output.options);

  // THEN: The exit code, delegation, and user-facing output are verified.
  assert.equal(exitCode, 0);
  assert.deepEqual(output.stderr, ["Plugin warnings:", "- check warning"]);
  assert.deepEqual(output.stdout, ["Plugin outputs are current."]);
});

test("check reports every drift item without invoking a write path", async () => {
  // GIVEN: Command collaborators and captured output streams are prepared.
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

  // WHEN: The compiler CLI runs the requested command.
  const exitCode = await cli.run("check", output.options);

  // THEN: The exit code, delegation, and user-facing output are verified.
  assert.equal(exitCode, 1);
  assert.deepEqual(output.stdout, []);
  assert.deepEqual(output.stderr, [
    "Plugin outputs are stale:",
    "- README.md: content differs",
    "- .claude-plugin/plugin.json: file is missing",
    "Run `npm run catalog:generate` and commit the results.",
  ]);
});

test("maps command failures to exit code one", async () => {
  // GIVEN: Command collaborators and captured output streams are prepared.
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

  // WHEN: The compiler CLI runs the requested command.
  const exitCode = await cli.run("validate", output.options);

  // THEN: The exit code, delegation, and user-facing output are verified.
  assert.equal(exitCode, 1);
  assert.deepEqual(output.stdout, []);
  assert.deepEqual(output.stderr, ["Plugin command failed: boom"]);
});

test("labels validation failures separately from command failures", async () => {
  // GIVEN: A validator rejects the source with one public validation diagnostic.
  const output = createOutput();
  const cli = new PluginCompilerCLI({
    validator: {
      async validatePlugin() {
        throw new PluginValidationError(["plugin/plugin.yml: invalid fixture"]);
      },
    },
    generator: unused("generator"),
    checker: unused("checker"),
  });

  // WHEN: The compiler CLI runs validation against the rejected source.
  const exitCode = await cli.run("validate", output.options);

  // THEN: The failure uses the validation-specific prefix and exit code.
  assert.equal(exitCode, 1);
  assert.deepEqual(output.stdout, []);
  assert.deepEqual(output.stderr, [
    "Plugin validation failed: Plugin validation failed with 1 diagnostic:\n" +
      "- plugin/plugin.yml: invalid fixture",
  ]);
});
