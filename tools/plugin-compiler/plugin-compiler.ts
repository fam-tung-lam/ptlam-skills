import {
  checkPluginPublication,
  generatePluginPublication,
  type PluginPublicationDrift,
} from "./publication/plugin-publication.ts";
import {
  type ValidatePluginResult,
  validatePlugin as validatePluginSources,
} from "./validation/validate-plugin.ts";

export interface PluginCompilerRequest {
  readonly rootDir: string;
}

export interface PluginCheckResult extends ValidatePluginResult {
  readonly isCurrent: boolean;
  readonly drift: readonly PluginPublicationDrift[];
}

export interface PluginGenerateResult extends ValidatePluginResult {
  readonly changedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
}

/**
 * Own the complete plugin workflow: validate canonical sources, then inspect or
 * replace their publication. Callers do not coordinate validation, planning,
 * comparison, or writes themselves.
 */
export class PluginCompiler {
  /** Validate canonical sources and return an immutable workflow result. */
  async validatePlugin({
    rootDir,
  }: PluginCompilerRequest): Promise<ValidatePluginResult> {
    const { plugin, warnings } = await validatePluginSources({ rootDir });
    return Object.freeze({
      plugin,
      warnings: Object.freeze([...warnings]),
    });
  }

  /** Compare generated outputs without mutating the repository. */
  async checkPlugin({
    rootDir,
  }: PluginCompilerRequest): Promise<PluginCheckResult> {
    const validation = await validatePluginSources({ rootDir });
    const publication = await checkPluginPublication({
      rootDir,
      plugin: validation.plugin,
    });
    return Object.freeze({
      ...validation,
      ...publication,
      warnings: Object.freeze([...validation.warnings]),
      drift: Object.freeze([...publication.drift]),
    });
  }

  /** Replace stale generated outputs from one validated source snapshot. */
  async generatePlugin({
    rootDir,
  }: PluginCompilerRequest): Promise<PluginGenerateResult> {
    const validation = await validatePluginSources({ rootDir });
    const publication = await generatePluginPublication({
      rootDir,
      plugin: validation.plugin,
    });
    return Object.freeze({
      ...validation,
      ...publication,
      warnings: Object.freeze([...validation.warnings]),
      changedPaths: Object.freeze([...publication.changedPaths]),
      unchangedPaths: Object.freeze([...publication.unchangedPaths]),
    });
  }
}

export type PluginDrift = PluginPublicationDrift;
