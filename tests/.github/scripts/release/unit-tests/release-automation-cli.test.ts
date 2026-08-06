import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, onTestFinished, test } from "vitest";

import {
  ReleaseAutomationCLI,
  type ReleaseAutomationCLIDependencies,
  type ReleaseAutomationCLIOptions,
  ReleaseAutomationCommand,
  ReleaseAutomationExitCode,
} from "../../../../../.github/scripts/release/release-automation-cli.ts";

type AutomationDouble = NonNullable<
  ReleaseAutomationCLIDependencies["automation"]
>;

function unexpectedCall(name: string): never {
  throw new Error(`${name} must not be called`);
}

function automationDouble(
  overrides: Partial<AutomationDouble> = {},
): AutomationDouble {
  return {
    validateRelease: () => unexpectedCall("automation.validateRelease"),
    packageCoverage: () => unexpectedCall("automation.packageCoverage"),
    packagePlugin: () => unexpectedCall("automation.packagePlugin"),
    generateChecksums: () => unexpectedCall("automation.generateChecksums"),
    publishRelease: () => unexpectedCall("automation.publishRelease"),
    ...overrides,
  };
}

function createOutput(): {
  readonly stdout: string[];
  readonly stderr: string[];
  readonly options: ReleaseAutomationCLIOptions;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    options: {
      stdout: (message) => stdout.push(message),
      stderr: (message) => stderr.push(message),
    },
  };
}

describe("ReleaseAutomationCLI", () => {
  test("returns usage error for an unknown command without delegating", async () => {
    // GIVEN: An unknown command and release automation that must remain idle.
    const output = createOutput();
    const cli = new ReleaseAutomationCLI({ automation: automationDouble() });

    // WHEN: The CLI receives an unknown command.
    const exitCode = await cli.run("unknown", [], output.options);

    // THEN: Usage is reported without release execution.
    assert.equal(exitCode, ReleaseAutomationExitCode.Usage);
    assert.deepEqual(output.stdout, []);
    assert.match(output.stderr[0] ?? "", /<validate-tag\|/u);
  });

  test("validates a tag and writes the workflow output", async () => {
    // GIVEN: The facade returns one validated commit and a writable output file.
    const output = createOutput();
    const outputDirectory = await mkdtemp(path.join(tmpdir(), "release-cli-"));
    onTestFinished(() => rm(outputDirectory, { force: true, recursive: true }));
    const githubOutput = path.join(outputDirectory, "github-output");
    const requests: unknown[] = [];
    const cli = new ReleaseAutomationCLI({
      automation: automationDouble({
        async validateRelease(request) {
          requests.push(request);
          return { releaseCommit: "abc123" };
        },
      }),
    });

    // WHEN: The validation command runs through the CLI adapter.
    const exitCode = await cli.run(
      ReleaseAutomationCommand.ValidateTag,
      [
        "--repository-root",
        "/repository",
        "--tag",
        "v1.2.3",
        "--github-output",
        githubOutput,
      ],
      output.options,
    );

    // THEN: The facade request and GitHub output use the same validated commit.
    assert.equal(exitCode, ReleaseAutomationExitCode.Success);
    assert.deepEqual(requests, [
      { repositoryRoot: "/repository", tag: "v1.2.3" },
    ]);
    assert.equal(
      await readFile(githubOutput, "utf8"),
      "release_commit=abc123\n",
    );
    assert.deepEqual(output.stdout, [
      "Validated release tag at commit abc123.",
    ]);
  });

  test.each([
    [
      ReleaseAutomationCommand.PackageCoverage,
      "packageCoverage",
      "coverage.tar.gz",
      "Packaged coverage",
    ],
    [
      ReleaseAutomationCommand.PackagePlugin,
      "packagePlugin",
      "plugin.tar.gz",
      "Packaged plugin",
    ],
  ] as const)(
    "delegates %s with one asset request",
    async (command, operation, resultPath, message) => {
      // GIVEN: One packaging operation records the CLI request.
      const output = createOutput();
      const requests: unknown[] = [];
      const cli = new ReleaseAutomationCLI({
        automation: automationDouble({
          [operation]: async (request: unknown) => {
            requests.push(request);
            return { path: resultPath };
          },
        }),
      });

      // WHEN: The packaging command runs.
      const exitCode = await cli.run(
        command,
        [
          "--repository-root",
          "/repository",
          "--output-directory",
          "/assets",
          "--tag",
          "v1.2.3",
        ],
        output.options,
      );

      // THEN: The CLI supplies one cohesive asset request and presents its path.
      assert.equal(exitCode, ReleaseAutomationExitCode.Success);
      assert.deepEqual(requests, [
        {
          repositoryRoot: "/repository",
          outputDirectory: "/assets",
          tag: "v1.2.3",
        },
      ]);
      assert.match(
        output.stdout[0] ?? "",
        new RegExp(`${message}.*${resultPath}`, "u"),
      );
    },
  );

  test("generates checksums and publishes a verified release", async () => {
    // GIVEN: The facade records preparation and publication requests.
    const output = createOutput();
    const calls: unknown[] = [];
    const cli = new ReleaseAutomationCLI({
      automation: automationDouble({
        async generateChecksums(assetsDirectory) {
          calls.push({ generateChecksums: assetsDirectory });
          return { path: "/assets/SHA256SUMS" };
        },
        async publishRelease(request) {
          calls.push({ publishRelease: request });
          return {
            tag: request.tag,
            assetPaths: ["one", "two", "three"],
          };
        },
      }),
    });

    // WHEN: Both publication commands run through the CLI adapter.
    const checksumsCode = await cli.run(
      ReleaseAutomationCommand.GenerateChecksums,
      ["--assets-directory", "/assets"],
      output.options,
    );
    const publishCode = await cli.run(
      ReleaseAutomationCommand.PublishRelease,
      [
        "--repository",
        "owner/repository",
        "--tag",
        "v1.2.3",
        "--expected-commit",
        "abc123",
        "--assets-directory",
        "/assets",
      ],
      output.options,
    );

    // THEN: The CLI preserves facade requests and reports verified completion.
    assert.equal(checksumsCode, ReleaseAutomationExitCode.Success);
    assert.equal(publishCode, ReleaseAutomationExitCode.Success);
    assert.deepEqual(calls, [
      { generateChecksums: "/assets" },
      {
        publishRelease: {
          repository: "owner/repository",
          tag: "v1.2.3",
          expectedCommit: "abc123",
          assetsDirectory: "/assets",
        },
      },
    ]);
    assert.deepEqual(output.stdout, [
      "Generated checksums at /assets/SHA256SUMS.",
      "Published and verified v1.2.3 with 3 assets.",
    ]);
  });

  test("reports invalid options and facade failures without throwing", async () => {
    // GIVEN: One malformed invocation and one failing facade operation.
    const malformedOutput = createOutput();
    const failureOutput = createOutput();
    const cli = new ReleaseAutomationCLI({
      automation: automationDouble({
        async generateChecksums() {
          throw new Error("boom");
        },
      }),
    });

    // WHEN: Both failures cross the CLI boundary.
    const malformedCode = await cli.run(
      ReleaseAutomationCommand.GenerateChecksums,
      ["--unexpected", "value"],
      malformedOutput.options,
    );
    const failureCode = await cli.run(
      ReleaseAutomationCommand.GenerateChecksums,
      ["--assets-directory", "/assets"],
      failureOutput.options,
    );

    // THEN: They become stable failure codes and diagnostics.
    assert.equal(malformedCode, ReleaseAutomationExitCode.Failure);
    assert.match(malformedOutput.stderr[0] ?? "", /Unknown option/u);
    assert.equal(failureCode, ReleaseAutomationExitCode.Failure);
    assert.match(failureOutput.stderr[0] ?? "", /boom/u);
  });
});
