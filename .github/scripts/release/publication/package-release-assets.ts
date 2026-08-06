import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

import { requireBinaryCommand } from "../command-runner.ts";
import { createReleaseAssetPlan } from "./release-assets.ts";

export interface PackageReleaseAssetRequest {
  readonly repositoryRoot: string;
  readonly outputDirectory: string;
  readonly tag: string;
}

async function writeGzipArchive(
  archivePath: string,
  tarBytes: Buffer,
): Promise<string> {
  await mkdir(path.dirname(archivePath), { recursive: true });
  await writeFile(archivePath, gzipSync(tarBytes, { level: 9 }));
  return archivePath;
}

/** Package the complete generated coverage directory as one promoted file. */
export async function packageCoverageAsset(
  request: PackageReleaseAssetRequest,
): Promise<string> {
  const archivePath = createReleaseAssetPlan(
    request.outputDirectory,
    request.tag,
  ).coverageArchivePath;
  const tarBytes = requireBinaryCommand(
    "tar",
    ["-cf", "-", "-C", request.repositoryRoot, "coverage"],
    {
      cwd: request.repositoryRoot,
      env: { ...process.env, COPYFILE_DISABLE: "1" },
    },
  );
  return writeGzipArchive(archivePath, tarBytes);
}

/** Package only committed installable plugin outputs from the checked-out SHA. */
export async function packagePluginAsset(
  request: PackageReleaseAssetRequest,
): Promise<string> {
  const archivePath = createReleaseAssetPlan(
    request.outputDirectory,
    request.tag,
  ).pluginArchivePath;
  const tarBytes = requireBinaryCommand(
    "git",
    [
      "archive",
      "--format=tar",
      `--prefix=ptlam-skills-${request.tag}/`,
      "HEAD",
      ".claude-plugin",
      "skills",
      "README.md",
      "LICENSE",
    ],
    { cwd: request.repositoryRoot },
  );
  return writeGzipArchive(archivePath, tarBytes);
}

/** Generate a deterministic checksum manifest for all promoted archives. */
export async function generateReleaseChecksums(
  assetsDirectory: string,
): Promise<string> {
  const archiveNames = (await readdir(assetsDirectory))
    .filter((name) => name.endsWith(".tar.gz"))
    .sort();
  if (archiveNames.length === 0) {
    throw new Error("No .tar.gz release assets found for checksums.");
  }
  const lines = await Promise.all(
    archiveNames.map(async (name) => {
      const bytes = await readFile(path.join(assetsDirectory, name));
      return `${createHash("sha256").update(bytes).digest("hex")}  ${name}`;
    }),
  );
  const checksumPath = path.join(assetsDirectory, "SHA256SUMS");
  await writeFile(checksumPath, `${lines.join("\n")}\n`, "utf8");
  return checksumPath;
}
