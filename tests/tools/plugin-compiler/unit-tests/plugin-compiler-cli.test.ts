import assert from "node:assert/strict";
import { describe, test, vi } from "vitest";
import type { CompilerPlugin } from "../../../../tools/plugin-compiler/models/plugin.ts";
import type { PluginCheckerPort } from "../../../../tools/plugin-compiler/plugin-checker.ts";
import {
  PluginCompilerCLI,
  type PluginCompilerOptions,
} from "../../../../tools/plugin-compiler/plugin-compiler-cli.ts";
import type { PluginGeneratorPort } from "../../../../tools/plugin-compiler/plugin-generator.ts";
import {
  PluginValidationError,
  type PluginValidatorPort,
} from "../../../../tools/plugin-compiler/plugin-validator.ts";

function createOutput(): {
  stdout: string[];
  stderr: string[];
  options: PluginCompilerOptions;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    options: {
      rootDir: "/repository",
      stdout: (message: string) => stdout.push(message),
      stderr: (message: string) => stderr.push(message),
    },
  };
}

function unexpectedCall(name: string): never {
  throw new Error(`${name} must not be called`);
}

function validatorDummy(): PluginValidatorPort {
  return {
    validatePlugin: vi.fn(() => unexpectedCall("validator.validatePlugin")),
  };
}

function generatorDummy(): PluginGeneratorPort {
  return {
    buildExpectedOutputPlan: vi.fn(() =>
      unexpectedCall("generator.buildExpectedOutputPlan"),
    ),
    generatePlugin: vi.fn(() => unexpectedCall("generator.generatePlugin")),
  };
}

function checkerDummy(): PluginCheckerPort {
  return {
    checkPlugin: vi.fn(() => unexpectedCall("checker.checkPlugin")),
  };
}

function generatorDouble(
  generatePlugin: PluginGeneratorPort["generatePlugin"],
): PluginGeneratorPort {
  return {
    buildExpectedOutputPlan: vi.fn(() =>
      unexpectedCall("generator.buildExpectedOutputPlan"),
    ),
    generatePlugin,
  };
}

function makeCompilerPlugin(): CompilerPlugin {
  const makeSkill = (id: string) => ({
    id,
    description: `${id} description.`,
    category_id: "engineering",
    visibility: "public" as const,
    status: "active" as const,
    required_skills: [],
    source_body: `# ${id}\n`,
    resources: [],
  });

  return {
    schema_version: 2,
    name: "fixture-skills",
    description: "Fixture plugin.",
    version: "1.0.0",
    author: { name: "Fixture Owner" },
    homepage: "https://example.test",
    repository: "https://example.test/repository",
    license: "MIT",
    keywords: ["fixture"],
    marketplace: {
      name: "fixture",
      description: "Fixture marketplace.",
      plugin_description: "Fixture plugin.",
      category: "development",
      keywords: ["fixture"],
    },
    categories: [
      {
        id: "engineering",
        name: "Engineering",
        description: "Engineering skills.",
      },
    ],
    skills: [makeSkill("alpha-skill"), makeSkill("beta-skill")],
  };
}

describe("PluginCompilerCLI", () => {
  test("returns usage error for an unknown command without delegating", async () => {
    // GIVEN: Command collaborators and captured output streams are prepared.
    const output = createOutput();
    const cli = new PluginCompilerCLI({
      validator: validatorDummy(),
      generator: generatorDummy(),
      checker: checkerDummy(),
    });

    // WHEN: The compiler CLI runs the requested command.
    const exitCode = await cli.run("unknown", output.options);

    // THEN: The exit code, delegation, and user-facing output are verified.
    assert.equal(exitCode, 2);
    assert.deepEqual(output.stdout, []);
    const usage = output.stderr[0];
    assert.ok(usage);
    assert.match(usage, /<validate\|generate\|check>/u);
  });

  test("validate delegates only to PluginValidator", async () => {
    // GIVEN: Command collaborators and captured output streams are prepared.
    const output = createOutput();
    const requests: { rootDir?: string }[] = [];
    const cli = new PluginCompilerCLI({
      validator: {
        async validatePlugin(request) {
          requests.push(request);
          return {
            plugin: makeCompilerPlugin(),
            diagnostics: ["deprecated dependency"],
          };
        },
      },
      generator: generatorDummy(),
      checker: checkerDummy(),
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
    const requests: { rootDir: string }[] = [];
    const cli = new PluginCompilerCLI({
      validator: validatorDummy(),
      generator: generatorDouble(async (request) => {
        requests.push(request);
        return {
          plugin: makeCompilerPlugin(),
          diagnostics: ["generation warning"],
          changedPaths: ["README.md"],
          unchangedPaths: ["skills/README.md"],
        };
      }),
      checker: checkerDummy(),
    });

    // WHEN: The compiler CLI runs the requested command.
    const exitCode = await cli.run("generate", output.options);

    // THEN: The exit code, delegation, and user-facing output are verified.
    assert.equal(exitCode, 0);
    assert.deepEqual(requests, [{ rootDir: "/repository" }]);
    assert.deepEqual(output.stderr, [
      "Plugin warnings:",
      "- generation warning",
    ]);
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
      validator: validatorDummy(),
      generator: generatorDummy(),
      checker: {
        async checkPlugin() {
          return {
            plugin: makeCompilerPlugin(),
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
      validator: validatorDummy(),
      generator: generatorDummy(),
      checker: {
        async checkPlugin() {
          return {
            plugin: makeCompilerPlugin(),
            diagnostics: [],
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
      generator: generatorDummy(),
      checker: checkerDummy(),
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
          throw new PluginValidationError([
            "plugin/plugin.yml: invalid fixture",
          ]);
        },
      },
      generator: generatorDummy(),
      checker: checkerDummy(),
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
});
