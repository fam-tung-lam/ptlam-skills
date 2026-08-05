import type { PluginSnapshot } from "../models/plugin.ts";
import {
  comparePublications,
  type PluginPublicationDrift,
} from "./compare-publications.ts";
import {
  commitPublication,
  inspectPublicationRoot,
  readCurrentPublication,
  readOptionalManagedFile,
} from "./publication-filesystem.ts";
import { createExpectedPublication } from "./publication-plan.ts";

export interface PluginPublicationGenerateResult {
  readonly changedPaths: readonly string[];
  readonly unchangedPaths: readonly string[];
}

export interface PluginPublicationCheckResult {
  readonly isCurrent: boolean;
  readonly drift: readonly PluginPublicationDrift[];
}

async function planPublication({
  rootDir,
  plugin,
  allowMissingReadme,
}: {
  readonly rootDir: string;
  readonly plugin: PluginSnapshot;
  readonly allowMissingReadme: boolean;
}) {
  const resolvedRoot = await inspectPublicationRoot(rootDir);
  const rootReadme = await readOptionalManagedFile(resolvedRoot, "README.md");
  if (!allowMissingReadme && rootReadme === null) {
    throw new Error("README.md: README source file is missing");
  }
  const expected = await createExpectedPublication({ plugin, rootReadme });
  const current = await readCurrentPublication(resolvedRoot);
  return { expected, difference: comparePublications(expected, current) };
}

/** Compare compiler-owned publication outputs without writing to the repository. */
export async function checkPluginPublication({
  rootDir,
  plugin,
}: {
  readonly rootDir: string;
  readonly plugin: PluginSnapshot;
}): Promise<PluginPublicationCheckResult> {
  const { difference } = await planPublication({
    rootDir,
    plugin,
    allowMissingReadme: true,
  });
  return Object.freeze({
    isCurrent: difference.drift.length === 0,
    drift: Object.freeze([...difference.drift]),
  });
}

/** Replace stale compiler-owned outputs from one validated snapshot. */
export async function generatePluginPublication({
  rootDir,
  plugin,
}: {
  readonly rootDir: string;
  readonly plugin: PluginSnapshot;
}): Promise<PluginPublicationGenerateResult> {
  const { expected, difference } = await planPublication({
    rootDir,
    plugin,
    allowMissingReadme: false,
  });
  await commitPublication(rootDir, expected, difference);
  return Object.freeze({
    changedPaths: Object.freeze([...difference.changedTargets]),
    unchangedPaths: Object.freeze([...difference.unchangedTargets]),
  });
}

export {
  type PluginPublicationDrift,
  PluginPublicationDriftReason,
} from "./compare-publications.ts";
export { MANAGED_OUTPUT_PATHS } from "./publication-plan.ts";
