#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { PluginChecker } from "./plugin_checker.mjs";
import { PluginGenerator } from "./plugin_generator.mjs";
import { PluginValidationError, PluginValidator } from "./plugin_validator.mjs";

const COMMANDS = new Set(["validate", "generate", "check"]);
const DEFAULT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/**
 * Command dispatcher for validating, generating, and checking plugin artifacts.
 * Inject collaborators and output callbacks when embedding the CLI in tests or
 * another Node.js process.
 *
 * @property {PluginValidator} validator Validator used by the command dispatcher.
 * @property {PluginGenerator} generator Generator used by `generate` and shared with the checker.
 * @property {PluginChecker} checker Read-only checker used by `check`.
 */
export class PluginCompilerCLI {
  /**
   * @param {{ validator?: PluginValidator, generator?: PluginGenerator, checker?: PluginChecker }} [dependencies={}] Injectable command collaborators.
   * @param {PluginValidator} [dependencies.validator] Validator used by `validate` and default collaborators.
   * @param {PluginGenerator} [dependencies.generator] Generator used by `generate`.
   * @param {PluginChecker} [dependencies.checker] Checker used by `check`.
   */
  constructor({ validator, generator, checker } = {}) {
    this.validator = validator ?? new PluginValidator();
    this.generator =
      generator ?? new PluginGenerator({ validator: this.validator });
    this.checker =
      checker ??
      new PluginChecker({
        validator: this.validator,
        generator: this.generator,
      });
  }

  /**
   * Execute one compiler command and translate expected failures into an exit code.
   *
   * @param {"validate"|"generate"|"check"|string} command Command name to dispatch.
   * @param {object} [options={}] Runtime and output options.
   * @param {string} [options.rootDir] Repository root; defaults to this package's repository.
   * @param {(message: string) => void} [options.stdout] Success-output callback.
   * @param {(message: string) => void} [options.stderr] Diagnostic-output callback.
   * @returns {Promise<0|1|2>} Zero on success, one on validation/generation/drift failure, or two for an unknown command.
   * @throws {Error} If an injected output callback throws while reporting a result.
   */
  async run(
    command,
    {
      rootDir = DEFAULT_ROOT,
      stdout = (message) => console.log(message),
      stderr = (message) => console.error(message),
    } = {},
  ) {
    if (!COMMANDS.has(command)) {
      stderr(
        "Usage: node tools/plugin-compiler/plugin_compiler_cli.mjs <validate|generate|check>",
      );
      return 2;
    }

    try {
      if (command === "validate") {
        const { plugin } = await this.validator.validatePlugin({ rootDir });
        stdout(
          `Plugin is valid: ${plugin.skills.length} skills in ${plugin.categories.length} categories.`,
        );
        return 0;
      }

      if (command === "generate") {
        const result = await this.generator.generatePlugin({ rootDir });
        stdout("Generated plugin outputs:");
        for (const relativePath of result.changedPaths) {
          stdout(`- ${relativePath}`);
        }
        for (const relativePath of result.unchangedPaths) {
          stdout(`- ${relativePath} (unchanged)`);
        }
        return 0;
      }

      const result = await this.checker.checkPlugin({ rootDir });
      if (result.isCurrent) {
        stdout("Plugin outputs are current.");
        return 0;
      }

      stderr("Plugin outputs are stale:");
      for (const item of result.drift) {
        stderr(`- ${item.path}: ${item.reason}`);
      }
      stderr("Run `npm run catalog:generate` and commit the results.");
      return 1;
    } catch (error) {
      const prefix =
        error instanceof PluginValidationError
          ? "Plugin validation failed"
          : "Plugin command failed";
      stderr(`${prefix}: ${error.message}`);
      return 1;
    }
  }
}

/**
 * Run a plugin compiler command with default collaborators.
 *
 * @param {"validate"|"generate"|"check"|string} command Command name to dispatch.
 * @param {object} [options={}] Options forwarded to {@link PluginCompilerCLI#run}.
 * @param {string} [options.rootDir] Repository root to process.
 * @param {(message: string) => void} [options.stdout] Success-output callback.
 * @param {(message: string) => void} [options.stderr] Diagnostic-output callback.
 * @returns {Promise<0|1|2>} Process-style exit code for the command.
 * @throws {Error} If an injected output callback throws while reporting a result.
 *
 * @example
 * const exitCode = await runPluginCompilerCommand("check", { rootDir });
 */
export async function runPluginCompilerCommand(command, options = {}) {
  return new PluginCompilerCLI().run(command, options);
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  process.exitCode = await runPluginCompilerCommand(process.argv[2]);
}
