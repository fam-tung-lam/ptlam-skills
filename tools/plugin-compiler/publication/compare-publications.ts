import {
  type ExpectedPublication,
  MANAGED_OUTPUT_PATHS,
} from "./publication-plan.ts";

export interface CurrentPublication {
  readonly files: ReadonlyMap<string, Buffer>;
  readonly directories: ReadonlySet<string>;
}

export enum PluginPublicationDriftReason {
  UnexpectedFile = "unexpected file",
  UnexpectedDirectory = "unexpected directory",
  MissingFile = "file is missing",
  MissingDirectory = "directory is missing",
  ContentDiffers = "content differs",
}

export interface PluginPublicationDrift {
  readonly path: string;
  readonly reason: PluginPublicationDriftReason;
}

export interface PublicationDifference {
  readonly drift: readonly PluginPublicationDrift[];
  readonly changedTargets: readonly string[];
  readonly unchangedTargets: readonly string[];
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Compare expected bytes and existence with an observed publication. */
export function comparePublications(
  expected: ExpectedPublication,
  current: CurrentPublication,
): PublicationDifference {
  const drift: PluginPublicationDrift[] = [];
  const allPaths = [
    ...new Set([
      ...expected.directories,
      ...current.directories,
      ...expected.files.keys(),
      ...current.files.keys(),
    ]),
  ].sort(compareCodePoints);

  for (const publicationPath of allPaths) {
    if (
      expected.directories.has(publicationPath) &&
      !current.directories.has(publicationPath)
    ) {
      drift.push({
        path: publicationPath,
        reason: PluginPublicationDriftReason.MissingDirectory,
      });
      continue;
    }
    if (
      current.directories.has(publicationPath) &&
      !expected.directories.has(publicationPath)
    ) {
      drift.push({
        path: publicationPath,
        reason: PluginPublicationDriftReason.UnexpectedDirectory,
      });
      continue;
    }
    const expectedContent = expected.files.get(publicationPath);
    const currentContent = current.files.get(publicationPath);
    if (expectedContent === undefined && currentContent === undefined) continue;
    if (expectedContent === undefined) {
      drift.push({
        path: publicationPath,
        reason: PluginPublicationDriftReason.UnexpectedFile,
      });
    } else if (currentContent === undefined) {
      drift.push({
        path: publicationPath,
        reason: PluginPublicationDriftReason.MissingFile,
      });
    } else if (!currentContent.equals(expectedContent)) {
      drift.push({
        path: publicationPath,
        reason: PluginPublicationDriftReason.ContentDiffers,
      });
    }
  }

  const changedTargets = MANAGED_OUTPUT_PATHS.filter((target) =>
    drift.some(
      (entry) =>
        entry.path === target ||
        (target === "skills" && entry.path.startsWith("skills/")),
    ),
  );
  return {
    drift,
    changedTargets,
    unchangedTargets: MANAGED_OUTPUT_PATHS.filter(
      (target) => !changedTargets.includes(target),
    ),
  };
}
