import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  createPluginSnapshot,
  PluginSchemaVersion,
} from "../../../../tools/plugin-compiler/models/plugin.ts";
import {
  SkillStatus,
  SkillVisibility,
} from "../../../../tools/plugin-compiler/models/skill.ts";
import {
  PluginCompilerCLI,
  type PluginCompilerCLIDependencies,
  type PluginCompilerCLIOptions,
  PluginCompilerCommand,
  PluginCompilerExitCode,
} from "../../../../tools/plugin-compiler/plugin-compiler-cli.ts";
import { PluginPublicationDriftReason } from "../../../../tools/plugin-compiler/publication/plugin-publication.ts";
import { PluginValidationError } from "../../../../tools/plugin-compiler/validation/plugin-validation-error.ts";

function createOutput(): {
  stdout: string[];
  stderr: string[];
  options: PluginCompilerCLIOptions;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
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

function unexpectedCall(name: string): never {
  throw new Error(`${name} must not be called`);
}

function makePlugin(
  skillIds: readonly string[] = ["alpha-skill", "beta-skill"],
  categoryIds: readonly string[] = ["engineering", "productivity"],
) {
  const makeSkill = (id: string) => ({
    id,
    description: `${id} description.`,
    category_id: "engineering",
    visibility: SkillVisibility.Public,
    status: SkillStatus.Active,
    required_skills: [],
    source_path: `plugin/skills/${id}`,
    source_body: `# ${id}\n`,
    resources: [],
  });
  return createPluginSnapshot({
    schema_version: PluginSchemaVersion.V1,
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
    categories: categoryIds.map((id) => ({
      id,
      name: `${id} category`,
      description: `${id} skills.`,
    })),
    skills: skillIds.map(makeSkill),
  });
}

type CompilerDouble = NonNullable<PluginCompilerCLIDependencies["compiler"]>;

function compilerDouble(
  overrides: Partial<CompilerDouble> = {},
): CompilerDouble {
  return {
    validatePlugin: () => unexpectedCall("compiler.validatePlugin"),
    generatePlugin: () => unexpectedCall("compiler.generatePlugin"),
    checkPlugin: () => unexpectedCall("compiler.checkPlugin"),
    ...overrides,
  };
}

describe("PluginCompilerCLI", () => {
  it("returns usage error for an unknown command without delegating", async () => {
    // GIVEN: An unknown command and a compiler that must remain idle.
    const output = createOutput();
    const cli = new PluginCompilerCLI({ compiler: compilerDouble() });

    // WHEN: The CLI receives an unknown command.
    const exitCode = await cli.run("unknown", output.options);

    // THEN: Usage is reported without compiler execution.
    assert.equal(exitCode, PluginCompilerExitCode.Usage);
    assert.deepEqual(output.stdout, []);
    assert.match(output.stderr[0] ?? "", /<validate\|generate\|check>/u);
  });

  it("validate delegates to the compiler workflow", async () => {
    // GIVEN: The compiler records validation requests.
    const output = createOutput();
    const requests: { rootDir: string }[] = [];
    const cli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async validatePlugin(request) {
          requests.push(request);
          return {
            plugin: makePlugin(),
            warnings: ["deprecated dependency"],
          };
        },
      }),
    });

    // WHEN: Validation runs through the CLI adapter.
    const exitCode = await cli.run(
      PluginCompilerCommand.Validate,
      output.options,
    );

    // THEN: The request and presentation remain stable.
    assert.equal(exitCode, PluginCompilerExitCode.Success);
    assert.deepEqual(requests, [{ rootDir: "/repository" }]);
    assert.deepEqual(output.stderr, [
      "Plugin warnings:",
      "- deprecated dependency",
    ]);
    assert.deepEqual(output.stdout, [
      "Plugin is valid: 2 skills in 2 categories.",
    ]);
  });

  it("generate presents changed and unchanged paths", async () => {
    // GIVEN: The compiler returns a publication result.
    const output = createOutput();
    const requests: { rootDir: string }[] = [];
    const cli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async generatePlugin(request) {
          requests.push(request);
          return {
            plugin: makePlugin(),
            warnings: ["generation warning"],
            changedPaths: ["README.md"],
            unchangedPaths: ["skills"],
          };
        },
      }),
    });

    // WHEN: Generation runs through the CLI adapter.
    const exitCode = await cli.run(
      PluginCompilerCommand.Generate,
      output.options,
    );

    // THEN: The CLI only formats the compiler result.
    assert.equal(exitCode, PluginCompilerExitCode.Success);
    assert.deepEqual(requests, [{ rootDir: "/repository" }]);
    assert.deepEqual(output.stderr, [
      "Plugin warnings:",
      "- generation warning",
    ]);
    assert.deepEqual(output.stdout, [
      "Generated plugin outputs:",
      "- README.md",
      "- skills (unchanged)",
    ]);
  });

  it("generate reports when every output is already current", async () => {
    // GIVEN: Generation finds no changed managed paths.
    const output = createOutput();
    const cli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async generatePlugin() {
          return {
            plugin: makePlugin(),
            warnings: [],
            changedPaths: [],
            unchangedPaths: ["README.md", "skills"],
          };
        },
      }),
    });

    // WHEN: The generation result is presented.
    const exitCode = await cli.run(
      PluginCompilerCommand.Generate,
      output.options,
    );

    // THEN: The CLI reports freshness without a generated-output heading.
    assert.equal(exitCode, PluginCompilerExitCode.Success);
    assert.deepEqual(output.stdout, ["Plugin outputs are already current."]);
    assert.deepEqual(output.stderr, []);
  });

  it("validate uses singular labels for one skill and category", async () => {
    // GIVEN: The validated plugin has one skill in one category.
    const output = createOutput();
    const cli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async validatePlugin() {
          return {
            plugin: makePlugin(["only-skill"], ["engineering"]),
            warnings: [],
          };
        },
      }),
    });

    // WHEN: Validation succeeds.
    const exitCode = await cli.run(
      PluginCompilerCommand.Validate,
      output.options,
    );

    // THEN: Singular skill and category labels are grammatical.
    assert.equal(exitCode, PluginCompilerExitCode.Success);
    assert.deepEqual(output.stdout, [
      "Plugin is valid: 1 skill in 1 category.",
    ]);
  });

  it("check reports both current and stale publication states", async () => {
    // GIVEN: Two compiler results represent current and stale outputs.
    const currentOutput = createOutput();
    const staleOutput = createOutput();
    const currentCli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async checkPlugin() {
          return {
            plugin: makePlugin(),
            warnings: ["check warning"],
            isCurrent: true,
            drift: [],
          };
        },
      }),
    });
    const staleCli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async checkPlugin() {
          return {
            plugin: makePlugin(),
            warnings: [],
            isCurrent: false,
            drift: [
              {
                path: "README.md",
                reason: PluginPublicationDriftReason.ContentDiffers,
              },
              {
                path: "skills",
                reason: PluginPublicationDriftReason.MissingFile,
              },
            ],
          };
        },
      }),
    });

    // WHEN: Both checks run through the CLI adapter.
    const currentCode = await currentCli.run(
      PluginCompilerCommand.Check,
      currentOutput.options,
    );
    const staleCode = await staleCli.run(
      PluginCompilerCommand.Check,
      staleOutput.options,
    );

    // THEN: Exit codes and messages reflect the compiler results.
    assert.equal(currentCode, PluginCompilerExitCode.Success);
    assert.deepEqual(currentOutput.stderr, [
      "Plugin warnings:",
      "- check warning",
    ]);
    assert.deepEqual(currentOutput.stdout, ["Plugin outputs are current."]);
    assert.equal(staleCode, PluginCompilerExitCode.Failure);
    assert.deepEqual(staleOutput.stdout, []);
    assert.deepEqual(staleOutput.stderr, [
      "Plugin outputs are stale:",
      "- README.md: content differs",
      "- skills: file is missing",
      "Run `npm run plugin:compile` and commit the results.",
    ]);
  });

  it("maps validation and unexpected failures to distinct messages", async () => {
    // GIVEN: Two compiler collaborators reject with distinct error kinds.
    const validationOutput = createOutput();
    const commandOutput = createOutput();
    const validationCli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async validatePlugin() {
          throw new PluginValidationError(["plugin/plugin.yml: invalid"]);
        },
      }),
    });
    const commandCli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async validatePlugin() {
          throw new Error("boom");
        },
      }),
    });

    // WHEN: Both failures cross the CLI boundary.
    const validationCode = await validationCli.run(
      PluginCompilerCommand.Validate,
      validationOutput.options,
    );
    const commandCode = await commandCli.run(
      PluginCompilerCommand.Validate,
      commandOutput.options,
    );

    // THEN: Each compiler failure has one distinct heading.
    assert.equal(validationCode, PluginCompilerExitCode.Failure);
    assert.deepEqual(validationOutput.stderr, [
      "Plugin validation failed with 1 error:\n- plugin/plugin.yml: invalid",
    ]);
    assert.equal(commandCode, PluginCompilerExitCode.Failure);
    assert.deepEqual(commandOutput.stderr, ["Plugin command failed: boom"]);
  });

  it("does not catch output callback failures after successful execution", async () => {
    // GIVEN: Validation succeeds but its stdout adapter throws.
    const callbackError = new Error("stdout unavailable");
    const cli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async validatePlugin() {
          return { plugin: makePlugin(), warnings: [] };
        },
      }),
    });

    // WHEN: The CLI presents the successful result.
    const execution = cli.run(PluginCompilerCommand.Validate, {
      rootDir: "/repository",
      stdout: () => {
        throw callbackError;
      },
    });

    // THEN: The presentation failure propagates to the caller.
    await assert.rejects(execution, (error) => error === callbackError);
  });

  it("does not catch output callback failures while presenting compiler errors", async () => {
    // GIVEN: Compilation fails and its stderr adapter also throws.
    const callbackError = new Error("stderr unavailable");
    const cli = new PluginCompilerCLI({
      compiler: compilerDouble({
        async validatePlugin() {
          throw new Error("compiler failure");
        },
      }),
    });

    // WHEN: The CLI presents the compiler failure.
    const execution = cli.run(PluginCompilerCommand.Validate, {
      rootDir: "/repository",
      stderr: () => {
        throw callbackError;
      },
    });

    // THEN: The presentation failure propagates to the caller.
    await assert.rejects(execution, (error) => error === callbackError);
  });
});
