import path from "node:path";

import { createPluginSnapshot, type PluginSnapshot } from "../models/plugin.ts";
import { PluginValidationError } from "./plugin-validation-error.ts";
import { validatePluginManifest } from "./validate-plugin-manifest.ts";
import { validateSkillGraph } from "./validate-skill-graph.ts";
import { validateSkillSources } from "./validate-skill-sources.ts";

/** Repository source accepted by {@link validatePlugin}. */
export interface ValidatePluginRequest {
  readonly rootDir?: string;
}

/** Successful validation output returned by {@link validatePlugin}. */
export interface ValidatePluginResult {
  readonly plugin: PluginSnapshot;
  readonly warnings: readonly string[];
}

/** Validate canonical v1 sources and return one immutable source graph. */
export async function validatePlugin({
  rootDir,
}: ValidatePluginRequest = {}): Promise<ValidatePluginResult> {
  const repositoryRoot = path.resolve(rootDir ?? process.cwd());
  const manifestResult = await validatePluginManifest(repositoryRoot);
  if (!("manifest" in manifestResult)) {
    throw new PluginValidationError(manifestResult.errors);
  }

  const manifest = manifestResult.manifest;
  const graph = validateSkillGraph(manifest.categories, manifest.skills);
  const sources = await validateSkillSources(repositoryRoot, manifest.skills);
  const errors = [...graph.errors, ...sources.errors];
  if (errors.length > 0) throw new PluginValidationError(errors);

  const plugin = createPluginSnapshot({
    ...manifest,
    categories: manifest.categories,
    skills: sources.skills,
  });
  return Object.freeze({
    plugin,
    warnings: Object.freeze([...graph.warnings]),
  });
}
