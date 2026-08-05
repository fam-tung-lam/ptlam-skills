import { PluginGenerator } from "./plugin-generator.mjs";
import { PluginValidator } from "./plugin-validator.mjs";

/**
 * Performs a read-only comparison between generated expectations and repository outputs.
 *
 * @property {PluginValidator} validator Validator used to load canonical sources.
 * @property {PluginGenerator} generator Generator used only to build the shared expected-output plan.
 *
 * @example
 * const { isCurrent, drift } = await new PluginChecker().checkPlugin({ rootDir });
 */
export class PluginChecker {
  /**
   * @param {{ validator?: PluginValidator, generator?: PluginGenerator }} [dependencies={}] Injectable collaborators.
   * @param {PluginValidator} [dependencies.validator] Validator used for the check.
   * @param {PluginGenerator} [dependencies.generator] Planner; defaults to one sharing `validator`.
   */
  constructor({ validator = new PluginValidator(), generator } = {}) {
    this.validator = validator;
    this.generator = generator ?? new PluginGenerator({ validator });
  }

  /**
   * Validate and compare all managed outputs without writing any file.
   *
   * @param {{ rootDir: string }} request Check options.
   * @param {string} request.rootDir Repository root whose managed outputs should be checked.
   * @returns {Promise<{plugin: object, isCurrent: boolean, drift: Array<{path: string, reason: string}>}>} Validated model, aggregate freshness, and one entry per stale or missing output.
   * @throws {import("./plugin-validator.mjs").PluginValidationError} If canonical plugin sources are invalid.
   * @throws {Error} If output paths are unsafe, README rendering fails, or managed files cannot be read.
   */
  async checkPlugin({ rootDir }) {
    const validation = await this.validator.validatePlugin({ rootDir });
    const { plugin, diagnostics } = validation;
    const plan = await this.generator.buildExpectedOutputPlan({
      rootDir,
      plugin,
      allowMissingReadmes: true,
    });
    const drift = [];

    for (const entry of plan.entries) {
      if (entry.expected === null) {
        drift.push({ path: entry.path, reason: "unexpected file" });
      } else if (!entry.exists) {
        drift.push({ path: entry.path, reason: "file is missing" });
      } else if (
        !Buffer.from(entry.current).equals(Buffer.from(entry.expected))
      ) {
        drift.push({ path: entry.path, reason: "content differs" });
      }
    }

    return {
      plugin,
      diagnostics,
      isCurrent: drift.length === 0,
      drift,
    };
  }
}
