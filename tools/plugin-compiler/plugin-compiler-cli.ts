#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { PluginCompiler } from "./plugin-compiler.ts";
import { PluginValidationError } from "./validation/plugin-validation-error.ts";

export enum PluginCompilerCommand {
  Validate = "validate",
  Generate = "generate",
  Check = "check",
}

export enum PluginCompilerExitCode {
  Success = 0,
  Failure = 1,
  Usage = 2,
}

export type WriteOutputLine = (message: string) => void;

export interface PluginCompilerCLIOptions {
  readonly rootDir?: string;
  readonly stdout?: WriteOutputLine;
  readonly stderr?: WriteOutputLine;
}

export interface PluginCompilerCLIDependencies {
  readonly compiler?: Pick<
    PluginCompiler,
    "validatePlugin" | "generatePlugin" | "checkPlugin"
  >;
}

const COMMANDS: ReadonlySet<string> = new Set([
  PluginCompilerCommand.Validate,
  PluginCompilerCommand.Generate,
  PluginCompilerCommand.Check,
]);
const DEFAULT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

function reportWarnings(
  warnings: readonly string[],
  stderr: WriteOutputLine,
): void {
  if (warnings.length === 0) return;
  stderr("Plugin warnings:");
  for (const warning of warnings) stderr(`- ${warning}`);
}

function isPluginCompilerCommand(
  value: string | undefined,
): value is PluginCompilerCommand {
  return value !== undefined && COMMANDS.has(value);
}

function countLabel(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function unreachable(value: never): never {
  throw new Error(`Unsupported plugin compiler command: ${String(value)}`);
}

type CompilerOperations = Pick<
  PluginCompiler,
  "validatePlugin" | "generatePlugin" | "checkPlugin"
>;

type ExecutedCommand =
  | {
      readonly command: PluginCompilerCommand.Validate;
      readonly result: Awaited<
        ReturnType<CompilerOperations["validatePlugin"]>
      >;
    }
  | {
      readonly command: PluginCompilerCommand.Generate;
      readonly result: Awaited<
        ReturnType<CompilerOperations["generatePlugin"]>
      >;
    }
  | {
      readonly command: PluginCompilerCommand.Check;
      readonly result: Awaited<ReturnType<CompilerOperations["checkPlugin"]>>;
    };

/**
 * Command dispatcher for validating, generating, and checking plugin artifacts.
 * Inject collaborators and output callbacks when embedding the CLI in tests or
 * another Node.js process.
 */
export class PluginCompilerCLI {
  readonly #compiler: CompilerOperations;

  constructor({
    compiler = new PluginCompiler(),
  }: PluginCompilerCLIDependencies = {}) {
    this.#compiler = compiler;
  }

  /** Execute a command; output-adapter exceptions deliberately propagate. */
  async run(
    command: string | undefined,
    {
      rootDir = DEFAULT_ROOT,
      stdout = (message: string) => console.log(message),
      stderr = (message: string) => console.error(message),
    }: PluginCompilerCLIOptions = {},
  ): Promise<PluginCompilerExitCode> {
    if (!isPluginCompilerCommand(command)) {
      stderr(
        "Usage: tsx tools/plugin-compiler/plugin-compiler-cli.ts <validate|generate|check>",
      );
      return PluginCompilerExitCode.Usage;
    }

    let executed: ExecutedCommand;
    try {
      executed = await this.#execute(command, rootDir);
    } catch (error) {
      return this.#presentCompilerError(error, stderr);
    }

    return this.#presentResult(executed, stdout, stderr);
  }

  async #execute(
    command: PluginCompilerCommand,
    rootDir: string,
  ): Promise<ExecutedCommand> {
    switch (command) {
      case PluginCompilerCommand.Validate:
        return {
          command,
          result: await this.#compiler.validatePlugin({ rootDir }),
        };
      case PluginCompilerCommand.Generate:
        return {
          command,
          result: await this.#compiler.generatePlugin({ rootDir }),
        };
      case PluginCompilerCommand.Check:
        return {
          command,
          result: await this.#compiler.checkPlugin({ rootDir }),
        };
      default:
        return unreachable(command);
    }
  }

  #presentCompilerError(
    error: unknown,
    stderr: WriteOutputLine,
  ): PluginCompilerExitCode {
    stderr(
      error instanceof PluginValidationError
        ? error.message
        : `Plugin command failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return PluginCompilerExitCode.Failure;
  }

  #presentResult(
    executed: ExecutedCommand,
    stdout: WriteOutputLine,
    stderr: WriteOutputLine,
  ): PluginCompilerExitCode {
    reportWarnings(executed.result.warnings, stderr);

    switch (executed.command) {
      case PluginCompilerCommand.Validate:
        stdout(
          `Plugin is valid: ${countLabel(executed.result.plugin.skills.length, "skill")} in ${countLabel(executed.result.plugin.categories.length, "category", "categories")}.`,
        );
        return PluginCompilerExitCode.Success;
      case PluginCompilerCommand.Generate:
        if (executed.result.changedPaths.length === 0) {
          stdout("Plugin outputs are already current.");
          return PluginCompilerExitCode.Success;
        }
        stdout("Generated plugin outputs:");
        for (const relativePath of executed.result.changedPaths) {
          stdout(`- ${relativePath}`);
        }
        for (const relativePath of executed.result.unchangedPaths) {
          stdout(`- ${relativePath} (unchanged)`);
        }
        return PluginCompilerExitCode.Success;
      case PluginCompilerCommand.Check:
        if (executed.result.isCurrent) {
          stdout("Plugin outputs are current.");
          return PluginCompilerExitCode.Success;
        }
        stderr("Plugin outputs are stale:");
        for (const item of executed.result.drift) {
          stderr(`- ${item.path}: ${item.reason}`);
        }
        stderr("Run `npm run plugin:compile` and commit the results.");
        return PluginCompilerExitCode.Failure;
      default:
        return unreachable(executed);
    }
  }
}

/** Run a command with default collaborators. */
export async function runPluginCompilerCommand(
  command: string | undefined,
  options: PluginCompilerCLIOptions = {},
): Promise<PluginCompilerExitCode> {
  return new PluginCompilerCLI().run(command, options);
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  process.exitCode = await runPluginCompilerCommand(process.argv[2]);
}
