#!/usr/bin/env -S node --experimental-strip-types

import { appendFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ReleaseAutomation } from "./release-automation.ts";

export const ReleaseAutomationCommand = Object.freeze({
  PlanRelease: "plan-release",
  PackageCoverage: "package-coverage",
  PackagePlugin: "package-plugin",
  GenerateChecksums: "generate-checksums",
  PublishRelease: "publish-release",
} as const);

export type ReleaseAutomationCommand =
  (typeof ReleaseAutomationCommand)[keyof typeof ReleaseAutomationCommand];

export const ReleaseAutomationExitCode = Object.freeze({
  Success: 0,
  Failure: 1,
  Usage: 2,
} as const);

export type ReleaseAutomationExitCode =
  (typeof ReleaseAutomationExitCode)[keyof typeof ReleaseAutomationExitCode];

type WriteOutputLine = (message: string) => void;

export interface ReleaseAutomationCLIOptions {
  readonly stdout?: WriteOutputLine;
  readonly stderr?: WriteOutputLine;
}

type ReleaseOperations = Pick<
  ReleaseAutomation,
  | "planRelease"
  | "packageCoverage"
  | "packagePlugin"
  | "generateChecksums"
  | "publishRelease"
>;

export interface ReleaseAutomationCLIDependencies {
  readonly automation?: ReleaseOperations;
}

const COMMANDS: ReadonlySet<string> = new Set(
  Object.values(ReleaseAutomationCommand),
);

function isReleaseAutomationCommand(
  value: string | undefined,
): value is ReleaseAutomationCommand {
  return value !== undefined && COMMANDS.has(value);
}

function parseOptions(args: readonly string[]): ReadonlyMap<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (
      option === undefined ||
      !option.startsWith("--") ||
      value === undefined ||
      value.startsWith("--")
    ) {
      throw new Error("Options must use --name value pairs.");
    }
    const name = option.slice(2);
    if (options.has(name)) throw new Error(`Duplicate option --${name}.`);
    options.set(name, value);
  }
  return options;
}

function selectOptions(
  options: ReadonlyMap<string, string>,
  names: readonly string[],
): Readonly<Record<string, string>> {
  const expected = new Set(names);
  for (const name of options.keys()) {
    if (!expected.has(name)) throw new Error(`Unknown option --${name}.`);
  }
  return Object.freeze(
    Object.fromEntries(
      names.map((name) => {
        const value = options.get(name);
        if (value === undefined || value.length === 0) {
          throw new Error(`Missing required option --${name}.`);
        }
        return [name, value];
      }),
    ),
  );
}

function option(
  options: Readonly<Record<string, string>>,
  name: string,
): string {
  const value = options[name];
  if (value === undefined) throw new Error(`Missing parsed option --${name}.`);
  return value;
}

function unreachable(value: never): never {
  throw new Error(`Unsupported release command: ${String(value)}`);
}

/** CLI adapter for the release facade used by GitHub Actions and local tests. */
export class ReleaseAutomationCLI {
  readonly #automation: ReleaseOperations;

  constructor({
    automation = new ReleaseAutomation(),
  }: ReleaseAutomationCLIDependencies = {}) {
    this.#automation = automation;
  }

  async run(
    command: string | undefined,
    args: readonly string[],
    {
      stdout = (message: string) => console.log(message),
      stderr = (message: string) => console.error(message),
    }: ReleaseAutomationCLIOptions = {},
  ): Promise<ReleaseAutomationExitCode> {
    if (!isReleaseAutomationCommand(command)) {
      stderr(
        "Usage: release-automation-cli.ts <plan-release|package-coverage|package-plugin|generate-checksums|publish-release> [options]",
      );
      return ReleaseAutomationExitCode.Usage;
    }

    try {
      const options = parseOptions(args);
      await this.#execute(command, options, stdout);
      return ReleaseAutomationExitCode.Success;
    } catch (error) {
      stderr(
        `Release command failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return ReleaseAutomationExitCode.Failure;
    }
  }

  async #execute(
    command: ReleaseAutomationCommand,
    options: ReadonlyMap<string, string>,
    stdout: WriteOutputLine,
  ): Promise<void> {
    switch (command) {
      case ReleaseAutomationCommand.PlanRelease: {
        const selected = selectOptions(options, [
          "repository-root",
          "repository",
          "expected-commit",
          "github-output",
        ]);
        const result = await this.#automation.planRelease({
          repositoryRoot: option(selected, "repository-root"),
          repository: option(selected, "repository"),
          expectedCommit: option(selected, "expected-commit"),
        });
        await appendFile(
          option(selected, "github-output"),
          `release_commit=${result.releaseCommit}\nrelease_required=${result.releaseRequired}\nrelease_tag=${result.tag}\n`,
          "utf8",
        );
        stdout(
          result.releaseRequired
            ? `Planned ${result.tag} at commit ${result.releaseCommit}.`
            : `${result.tag} is already released; no publication is required.`,
        );
        return;
      }
      case ReleaseAutomationCommand.PackageCoverage: {
        const selected = selectOptions(options, [
          "repository-root",
          "output-directory",
          "tag",
        ]);
        const result = await this.#automation.packageCoverage({
          repositoryRoot: option(selected, "repository-root"),
          outputDirectory: option(selected, "output-directory"),
          tag: option(selected, "tag"),
        });
        stdout(`Packaged coverage at ${result.path}.`);
        return;
      }
      case ReleaseAutomationCommand.PackagePlugin: {
        const selected = selectOptions(options, [
          "repository-root",
          "output-directory",
          "tag",
        ]);
        const result = await this.#automation.packagePlugin({
          repositoryRoot: option(selected, "repository-root"),
          outputDirectory: option(selected, "output-directory"),
          tag: option(selected, "tag"),
        });
        stdout(`Packaged plugin at ${result.path}.`);
        return;
      }
      case ReleaseAutomationCommand.GenerateChecksums: {
        const selected = selectOptions(options, ["assets-directory"]);
        const result = await this.#automation.generateChecksums(
          option(selected, "assets-directory"),
        );
        stdout(`Generated checksums at ${result.path}.`);
        return;
      }
      case ReleaseAutomationCommand.PublishRelease: {
        const selected = selectOptions(options, [
          "repository",
          "tag",
          "expected-commit",
          "assets-directory",
          "approval-environment",
        ]);
        const result = await this.#automation.publishRelease({
          repository: option(selected, "repository"),
          tag: option(selected, "tag"),
          expectedCommit: option(selected, "expected-commit"),
          assetsDirectory: option(selected, "assets-directory"),
          approvalEnvironment: option(selected, "approval-environment"),
        });
        stdout(
          `Published and verified ${result.tag} with ${result.assetPaths.length} assets.`,
        );
        return;
      }
      default:
        return unreachable(command);
    }
  }
}

async function runReleaseAutomationCommand(
  command: string | undefined,
  args: readonly string[],
  options: ReleaseAutomationCLIOptions = {},
): Promise<ReleaseAutomationExitCode> {
  return new ReleaseAutomationCLI().run(command, args, options);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  process.exitCode = await runReleaseAutomationCommand(
    process.argv[2],
    process.argv.slice(3),
  );
}
