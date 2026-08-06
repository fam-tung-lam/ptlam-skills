import path from "node:path";

import { parseReleaseTag } from "../validation/release-tag.ts";

export interface ReleaseAssetPlan {
  readonly checksumPath: string;
  readonly coverageArchivePath: string;
  readonly paths: readonly string[];
  readonly pluginArchivePath: string;
}

/** Resolve the complete immutable asset set promoted for one release tag. */
export function createReleaseAssetPlan(
  assetsDirectory: string,
  tag: string,
): ReleaseAssetPlan {
  const releaseTag = parseReleaseTag(tag);
  const coverageArchivePath = path.join(
    assetsDirectory,
    `test-coverage-${releaseTag.value}.tar.gz`,
  );
  const pluginArchivePath = path.join(
    assetsDirectory,
    `ptlam-skills-${releaseTag.value}.tar.gz`,
  );
  const checksumPath = path.join(assetsDirectory, "SHA256SUMS");

  return Object.freeze({
    checksumPath,
    coverageArchivePath,
    paths: Object.freeze([
      coverageArchivePath,
      pluginArchivePath,
      checksumPath,
    ]),
    pluginArchivePath,
  });
}
