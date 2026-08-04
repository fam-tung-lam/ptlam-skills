import { PluginGenerator } from "./plugin_generator.mjs";
import { PluginValidator } from "./plugin_validator.mjs";

export class PluginChecker {
  constructor({ validator = new PluginValidator(), generator } = {}) {
    this.validator = validator;
    this.generator = generator ?? new PluginGenerator({ validator });
  }

  /**
   * Validate and compare all managed outputs without writing any file.
   *
   * @param {{ rootDir: string }} request
   * @returns {Promise<{plugin: object, isCurrent: boolean, drift: Array<{path: string, reason: string}>}>}
   */
  async checkPlugin({ rootDir }) {
    const validation = await this.validator.validatePlugin({ rootDir });
    const { plugin } = validation;
    const plan = await this.generator.buildExpectedOutputPlan({
      rootDir,
      plugin,
      allowMissingReadmes: true,
    });
    const drift = [];

    for (const entry of plan.entries) {
      if (!entry.exists) {
        drift.push({ path: entry.path, reason: "file is missing" });
      } else if (entry.current !== entry.expected) {
        drift.push({ path: entry.path, reason: "content differs" });
      }
    }

    return {
      plugin,
      isCurrent: drift.length === 0,
      drift,
    };
  }
}
