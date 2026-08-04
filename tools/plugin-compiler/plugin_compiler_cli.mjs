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

export class PluginCompilerCLI {
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

export async function runPluginCompilerCommand(command, options = {}) {
  return new PluginCompilerCLI().run(command, options);
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  process.exitCode = await runPluginCompilerCommand(process.argv[2]);
}
