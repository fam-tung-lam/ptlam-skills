import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import {
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import { validateMarkdownLinks } from "../validation/validate-markdown-links.ts";
import type {
  CurrentPublication,
  PublicationDifference,
} from "./compare-publications.ts";
import {
  type ExpectedPublication,
  OUTSIDE_SKILLS_PATHS,
} from "./publication-plan.ts";

interface DirectorySnapshot {
  readonly files: ReadonlyMap<string, Buffer>;
  readonly directories: ReadonlySet<string>;
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function assertRealRepository(rootDir: string): Promise<void> {
  const stats = await lstat(rootDir);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error("Repository root must be a real directory, not a link");
  }
}

async function assertSafeFilePath(
  rootDir: string,
  relativePath: string,
): Promise<string> {
  const resolvedRoot = path.resolve(rootDir);
  const segments = relativePath.split("/");
  const targetPath = path.resolve(resolvedRoot, ...segments);
  const relativeTarget = path.relative(resolvedRoot, targetPath);
  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    throw new Error(`${relativePath}: managed output escapes the repository`);
  }

  let currentPath = resolvedRoot;
  for (const [index, segment] of segments.entries()) {
    currentPath = path.join(currentPath, segment);
    let stats: Stats;
    try {
      stats = await lstat(currentPath);
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") return targetPath;
      throw error;
    }

    const checkedPath = segments.slice(0, index + 1).join("/");
    if (stats.isSymbolicLink()) {
      throw new Error(
        `${relativePath}: managed output path contains symbolic link ${checkedPath}`,
      );
    }
    if (index < segments.length - 1 && !stats.isDirectory()) {
      throw new Error(
        `${relativePath}: managed output parent is not a directory: ${checkedPath}`,
      );
    }
    if (index === segments.length - 1 && !stats.isFile()) {
      throw new Error(
        `${relativePath}: managed output target is not a regular file`,
      );
    }
  }
  return targetPath;
}

export async function inspectPublicationRoot(rootDir: string): Promise<string> {
  const resolvedRoot = path.resolve(rootDir);
  await assertRealRepository(resolvedRoot);
  await Promise.all(
    OUTSIDE_SKILLS_PATHS.map((relativePath) =>
      assertSafeFilePath(resolvedRoot, relativePath),
    ),
  );
  return resolvedRoot;
}

export async function readOptionalManagedFile(
  rootDir: string,
  relativePath: string,
): Promise<Buffer | null> {
  const targetPath = await assertSafeFilePath(rootDir, relativePath);
  try {
    return await readFile(targetPath);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

async function snapshotDirectory(
  rootDir: string,
  relativeDirectory: string,
): Promise<DirectorySnapshot> {
  const absoluteDirectory = path.join(rootDir, relativeDirectory);
  let rootStats: Stats;
  try {
    rootStats = await lstat(absoluteDirectory);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return { files: new Map(), directories: new Set() };
    }
    throw error;
  }
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error(
      `${relativeDirectory}: managed output must be a real directory`,
    );
  }

  const files = new Map<string, Buffer>();
  const directories = new Set<string>([relativeDirectory]);
  async function visit(directory: string, prefix: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => compareCodePoints(left.name, right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        throw new Error(
          `${relativeDirectory}/${relativePath}: managed output contains a symbolic link`,
        );
      }
      if (entry.isDirectory()) {
        directories.add(`${relativeDirectory}/${relativePath}`);
        await visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.set(
          `${relativeDirectory}/${relativePath}`,
          await readFile(absolutePath),
        );
      } else {
        throw new Error(
          `${relativeDirectory}/${relativePath}: managed output is not a regular file`,
        );
      }
    }
  }
  await visit(absoluteDirectory, "");
  return { files, directories };
}

/** Snapshot all managed output bytes and the existence of managed directories. */
export async function readCurrentPublication(
  rootDir: string,
): Promise<CurrentPublication> {
  const resolvedRoot = await inspectPublicationRoot(rootDir);
  const outsideEntries = await Promise.all(
    OUTSIDE_SKILLS_PATHS.map(async (relativePath) => {
      const content = await readOptionalManagedFile(resolvedRoot, relativePath);
      return [relativePath, content] as const;
    }),
  );
  const skills = await snapshotDirectory(resolvedRoot, "skills");
  const files = new Map<string, Buffer>();
  for (const [relativePath, content] of outsideEntries) {
    if (content !== null) files.set(relativePath, content);
  }
  for (const [relativePath, content] of skills.files) {
    files.set(relativePath, content);
  }
  return {
    files,
    directories: skills.directories,
  };
}

async function replaceFile(
  rootDir: string,
  relativePath: string,
  content: Buffer,
): Promise<void> {
  const targetPath = await assertSafeFilePath(rootDir, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, content, { flag: "wx" });
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function stageSkillsDirectory(
  rootDir: string,
  expectedSkills: ReadonlyMap<string, Buffer>,
): Promise<string> {
  const stagedPath = path.join(
    rootDir,
    `.plugin-compiler-skills-${randomUUID()}.tmp`,
  );
  try {
    await mkdir(stagedPath, { recursive: false });
    for (const [relativePath, content] of expectedSkills) {
      const localPath = relativePath.slice("skills/".length);
      const outputPath = path.join(stagedPath, ...localPath.split("/"));
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content, { flag: "wx" });
    }
    return stagedPath;
  } catch (error) {
    await rm(stagedPath, { recursive: true, force: true });
    throw error;
  }
}

async function validateStagedSkillsDirectory(
  stagedPath: string,
  expectedSkills: ReadonlyMap<string, Buffer>,
): Promise<void> {
  const stagedName = path.basename(stagedPath);
  const stagedSnapshot = await snapshotDirectory(
    path.dirname(stagedPath),
    stagedName,
  );
  const actual = new Map<string, Buffer>(
    [...stagedSnapshot.files].map(([relativePath, content]) => [
      relativePath.slice(stagedName.length + 1),
      content,
    ]),
  );
  const expected = new Map<string, Buffer>(
    [...expectedSkills].map(([relativePath, content]) => [
      relativePath.slice("skills/".length),
      content,
    ]),
  );
  const diagnostics: string[] = [];
  const allPaths = [...new Set([...expected.keys(), ...actual.keys()])].sort(
    compareCodePoints,
  );

  for (const relativePath of allPaths) {
    const expectedContent = expected.get(relativePath);
    const actualContent = actual.get(relativePath);
    if (expectedContent === undefined) {
      diagnostics.push(`${relativePath}: unexpected staged file`);
    } else if (actualContent === undefined) {
      diagnostics.push(`${relativePath}: staged file is missing`);
    } else if (!actualContent.equals(expectedContent)) {
      diagnostics.push(
        `${relativePath}: staged bytes differ from the output plan`,
      );
    }
  }

  for (const [relativePath, content] of actual) {
    if (!relativePath.endsWith(".md")) continue;
    const rootSkillId = relativePath.split("/")[0];
    if (rootSkillId === undefined) continue;
    const prefix = `${rootSkillId}/`;
    const sourceFiles = new Set(
      [...actual.keys()]
        .filter((candidate) => candidate.startsWith(prefix))
        .map((candidate) => candidate.slice(prefix.length)),
    );
    diagnostics.push(
      ...validateMarkdownLinks({
        source: content.toString("utf8"),
        markdownPath: relativePath.slice(prefix.length),
        sourceFiles,
        skillPath: `skills/${rootSkillId}`,
      }),
    );
  }

  if (diagnostics.length > 0) {
    throw new Error(
      `Generated skills validation failed:\n${diagnostics
        .map((diagnostic) => `- ${diagnostic}`)
        .join("\n")}`,
    );
  }
}

/** Install a staged tree and preserve the previous tree on installation failure. */
export async function installStagedSkillsDirectory(
  rootDir: string,
  stagedPath: string,
): Promise<void> {
  const targetPath = path.join(rootDir, "skills");
  const backupPath = path.join(
    rootDir,
    `.plugin-compiler-skills-${randomUUID()}.bak`,
  );
  let targetMoved = false;

  try {
    try {
      await rename(targetPath, backupPath);
      targetMoved = true;
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "ENOENT") throw error;
    }
    await rename(stagedPath, targetPath);
  } catch (installError) {
    const recoveryErrors: unknown[] = [];
    try {
      await rm(stagedPath, { recursive: true, force: true });
    } catch (cleanupError) {
      recoveryErrors.push(cleanupError);
    }
    if (targetMoved) {
      try {
        await rename(backupPath, targetPath);
      } catch (restorationError) {
        recoveryErrors.push(restorationError);
      }
    }
    if (recoveryErrors.length > 0) {
      throw new AggregateError(
        [installError, ...recoveryErrors],
        "Failed to install skills publication and fully restore the prior managed tree",
        { cause: installError },
      );
    }
    throw installError;
  }

  if (targetMoved) {
    try {
      await rm(backupPath, { recursive: true, force: true });
    } catch (cleanupError) {
      throw new Error(
        `Installed skills publication but failed to remove preserved backup ${path.basename(
          backupPath,
        )}: ${errorMessage(cleanupError)}`,
        { cause: cleanupError },
      );
    }
  }
}

/** Commit only changed managed targets from a fully rendered publication. */
export async function commitPublication(
  rootDir: string,
  expected: ExpectedPublication,
  difference: PublicationDifference,
): Promise<void> {
  const resolvedRoot = await inspectPublicationRoot(rootDir);
  const expectedSkills = new Map(
    [...expected.files].filter(([relativePath]) =>
      relativePath.startsWith("skills/"),
    ),
  );
  const skillsChanged = difference.changedTargets.includes("skills");
  const stagedSkills = skillsChanged
    ? await stageSkillsDirectory(resolvedRoot, expectedSkills)
    : null;

  try {
    if (stagedSkills !== null) {
      await validateStagedSkillsDirectory(stagedSkills, expectedSkills);
    }
    for (const relativePath of OUTSIDE_SKILLS_PATHS) {
      if (!difference.changedTargets.includes(relativePath)) continue;
      const content = expected.files.get(relativePath);
      if (content === undefined) {
        throw new Error(`${relativePath}: expected output is missing`);
      }
      await replaceFile(resolvedRoot, relativePath, content);
    }
    if (stagedSkills !== null) {
      await installStagedSkillsDirectory(resolvedRoot, stagedSkills);
    }
  } catch (error) {
    if (stagedSkills !== null) {
      await rm(stagedSkills, { recursive: true, force: true });
    }
    throw error;
  }
}
