import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "vitest";

import {
  PluginCompilerCommand,
  PluginCompilerExitCode,
} from "../../../../tools/plugin-compiler/plugin-compiler-cli.ts";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const cliPath = path.join(
  repositoryRoot,
  "tools/plugin-compiler/plugin-compiler-cli.ts",
);
const tsxCliPath = createRequire(import.meta.url).resolve("tsx/cli");

interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

function runCli(command: string): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCliPath, cliPath, command], {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}

describe("plugin compiler CLI process", () => {
  test("validate succeeds through the real tsx entrypoint", async () => {
    // GIVEN: The repository's real CLI entrypoint and canonical sources exist.

    // WHEN: A child Node process executes the validate command through tsx.
    const result = await runCli(PluginCompilerCommand.Validate);

    // THEN: The process reports a valid catalog without warnings.
    assert.equal(result.exitCode, PluginCompilerExitCode.Success);
    assert.match(
      result.stdout,
      /^Plugin is valid: \d+ skills in \d+ categories\.\n$/u,
    );
    assert.equal(result.stderr, "");
  });

  test("unknown command returns process exit code two and usage", async () => {
    // GIVEN: The repository's real CLI entrypoint is executed as a process.

    // WHEN: The process receives an unsupported command.
    const result = await runCli("unknown");

    // THEN: The executable exposes the CLI usage and process-level exit code.
    assert.equal(result.exitCode, PluginCompilerExitCode.Usage);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /<validate\|generate\|check>/u);
  });
});
