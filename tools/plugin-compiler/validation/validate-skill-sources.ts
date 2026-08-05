import type { Dirent, Stats } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  type ManifestSkill,
  REQUIRED_SKILLS_MARKER,
  type SkillResourceInput,
  type SkillSnapshotInput,
} from "../models/skill.ts";
import { validateMarkdownLinks } from "./validate-markdown-links.ts";
import { SOURCE_MANIFEST_PATH } from "./validate-plugin-manifest.ts";

const SOURCE_SKILLS_PATH = "plugin/skills";
const RESERVED_REQUIRED_SKILLS_PATH = "references/required-skills";

interface InspectedSourceFile {
  readonly path: string;
  readonly content: Buffer;
}

/** Source-tree validation output used by the validator orchestrator. */
export interface SkillSourceValidationResult {
  readonly skills: readonly SkillSnapshotInput[];
  readonly errors: readonly string[];
}

/** Validate one-to-one skill directories and snapshot each source file once. */
export async function validateSkillSources(
  repositoryRoot: string,
  manifestSkills: readonly ManifestSkill[],
): Promise<SkillSourceValidationResult> {
  const errors: string[] = [];
  const discoveredSkillIds = await discoverSourceSkills(repositoryRoot, errors);
  validateSourceMapping(manifestSkills, discoveredSkillIds, errors);

  const skills: SkillSnapshotInput[] = [];
  for (const [index, manifestSkill] of manifestSkills.entries()) {
    const inspected = await inspectSkillSource(
      repositoryRoot,
      manifestSkill,
      index,
      errors,
    );
    if (inspected !== null) skills.push({ ...manifestSkill, ...inspected });
  }
  return { skills, errors };
}

async function discoverSourceSkills(
  repositoryRoot: string,
  errors: string[],
): Promise<Set<string>> {
  const skillsDirectory = path.join(repositoryRoot, "plugin", "skills");
  const pathError = await validateDirectoryPath(
    repositoryRoot,
    SOURCE_SKILLS_PATH,
    "skill source",
  );
  if (pathError !== null) {
    errors.push(pathError);
    return new Set<string>();
  }

  let entries: Dirent<string>[];
  try {
    entries = await readdir(skillsDirectory, { withFileTypes: true });
  } catch (error) {
    errors.push(
      `${SOURCE_SKILLS_PATH}/: cannot inspect skill directories (${filesystemMessage(error)})`,
    );
    return new Set<string>();
  }

  const ids = new Set<string>();
  for (const entry of entries.sort(compareDirents)) {
    const relativePath = `${SOURCE_SKILLS_PATH}/${entry.name}`;
    if (entry.isSymbolicLink()) {
      errors.push(
        `${relativePath}: symbolic links are not supported in skill source paths`,
      );
    } else if (!entry.isDirectory()) {
      errors.push(
        `${relativePath}: only skill directories are allowed directly in ${SOURCE_SKILLS_PATH}/`,
      );
    } else {
      ids.add(entry.name);
    }
  }
  return ids;
}

function validateSourceMapping(
  skills: readonly ManifestSkill[],
  discoveredSkillIds: ReadonlySet<string>,
  errors: string[],
): void {
  const manifestIds = new Set(skills.map(({ id }) => id));
  for (const id of discoveredSkillIds) {
    if (!manifestIds.has(id)) {
      errors.push(
        `${SOURCE_SKILLS_PATH}/${id}: source skill is not listed in ${SOURCE_MANIFEST_PATH}`,
      );
    }
  }
  for (const id of manifestIds) {
    if (!discoveredSkillIds.has(id)) {
      errors.push(
        `${SOURCE_MANIFEST_PATH}#skills: expected ${SOURCE_SKILLS_PATH}/${id}/SKILL.md`,
      );
    }
  }
}

async function inspectSkillSource(
  repositoryRoot: string,
  manifestSkill: ManifestSkill,
  index: number,
  errors: string[],
): Promise<{
  readonly source_path: string;
  readonly source_body: string;
  readonly resources: readonly SkillResourceInput[];
} | null> {
  const sourcePath = `${SOURCE_SKILLS_PATH}/${manifestSkill.id}`;
  const sourceDirectory = path.join(repositoryRoot, ...sourcePath.split("/"));
  const skillPath = `${sourcePath}/SKILL.md`;
  const skillPathError = await validateRegularRepositoryPath(
    repositoryRoot,
    skillPath,
    "skill source",
    "SKILL.md",
  );
  if (skillPathError !== null) {
    errors.push(skillPathError);
    return null;
  }

  const filePaths: string[] = [];
  await inspectSourceTree(sourceDirectory, "", sourcePath, filePaths, errors);
  if (!filePaths.includes("SKILL.md")) {
    errors.push(
      `${SOURCE_MANIFEST_PATH}#/skills/${index}: expected ${skillPath}`,
    );
    return null;
  }

  const files: InspectedSourceFile[] = [];
  for (const relativePath of filePaths) {
    try {
      files.push({
        path: relativePath,
        content: await readFile(
          path.join(sourceDirectory, ...relativePath.split("/")),
        ),
      });
    } catch (error) {
      errors.push(
        `${sourcePath}/${relativePath}: cannot read source (${filesystemMessage(error)})`,
      );
    }
  }

  const skillFile = files.find(({ path: filePath }) => filePath === "SKILL.md");
  if (skillFile === undefined) return null;
  const sourceBody = skillFile.content.toString("utf8");
  if (/^\uFEFF?---[ \t]*(?:\r?\n|$)/u.test(sourceBody)) {
    errors.push(
      `${skillPath}: authored SKILL.md must not contain YAML frontmatter`,
    );
  }
  const markerCount = sourceBody.split(REQUIRED_SKILLS_MARKER).length - 1;
  if (markerCount !== 1) {
    errors.push(
      `${skillPath}: expected exactly one ${REQUIRED_SKILLS_MARKER} marker, found ${markerCount}`,
    );
  }

  const sourceFiles = new Set(filePaths);
  for (const file of files) {
    if (file.path.endsWith(".md")) {
      errors.push(
        ...validateMarkdownLinks({
          source: file.content.toString("utf8"),
          markdownPath: file.path,
          sourceFiles,
          skillPath: sourcePath,
        }),
      );
    }
  }

  return {
    source_path: sourcePath,
    source_body: sourceBody,
    resources: files
      .filter(({ path: filePath }) => filePath !== "SKILL.md")
      .map(({ path: filePath, content }) => ({ path: filePath, content })),
  };
}

async function inspectSourceTree(
  absoluteDirectory: string,
  relativeDirectory: string,
  sourcePath: string,
  filePaths: string[],
  errors: string[],
): Promise<void> {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    errors.push(
      `${sourcePath}${relativeDirectory ? `/${relativeDirectory}` : ""}: cannot inspect source directory (${filesystemMessage(error)})`,
    );
    return;
  }

  for (const entry of entries.sort(compareDirents)) {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    const displayPath = `${sourcePath}/${relativePath}`;
    if (entry.name === ".DS_Store") {
      errors.push(`${displayPath}: unsupported service file`);
      continue;
    }
    if (
      relativePath === RESERVED_REQUIRED_SKILLS_PATH ||
      relativePath.startsWith(`${RESERVED_REQUIRED_SKILLS_PATH}/`)
    ) {
      errors.push(
        `${displayPath}: ${RESERVED_REQUIRED_SKILLS_PATH}/ is owned by the plugin compiler`,
      );
      continue;
    }
    if (entry.isSymbolicLink()) {
      errors.push(
        `${displayPath}: symbolic links are not supported in skill sources`,
      );
    } else if (entry.isDirectory()) {
      await inspectSourceTree(
        path.join(absoluteDirectory, entry.name),
        relativePath,
        sourcePath,
        filePaths,
        errors,
      );
    } else if (entry.isFile()) {
      filePaths.push(relativePath);
    } else {
      errors.push(`${displayPath}: expected a regular file or directory`);
    }
  }
}

async function validateRegularRepositoryPath(
  repositoryRoot: string,
  relativePath: string,
  kind: string,
  terminalName: string,
): Promise<string | null> {
  const segments = relativePath.split("/");
  let currentPath = repositoryRoot;
  for (const [index, segment] of segments.entries()) {
    currentPath = path.join(currentPath, segment);
    let stats: Stats;
    try {
      stats = await lstat(currentPath);
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT") return null;
      return `${segments.slice(0, index + 1).join("/")}: cannot inspect ${kind} path (${filesystemMessage(error)})`;
    }
    const checkedPath = segments.slice(0, index + 1).join("/");
    if (stats.isSymbolicLink()) {
      return `${checkedPath}: symbolic links are not supported in ${kind} paths`;
    }
    if (index < segments.length - 1 && !stats.isDirectory()) {
      return `${checkedPath}: expected a directory in the ${kind} path`;
    }
    if (index === segments.length - 1 && !stats.isFile()) {
      return `${checkedPath}: expected a regular ${terminalName} file`;
    }
  }
  return null;
}

async function validateDirectoryPath(
  repositoryRoot: string,
  relativePath: string,
  kind: string,
): Promise<string | null> {
  const segments = relativePath.split("/");
  let currentPath = repositoryRoot;
  for (const [index, segment] of segments.entries()) {
    currentPath = path.join(currentPath, segment);
    let stats: Stats;
    try {
      stats = await lstat(currentPath);
    } catch (error) {
      if (isErrnoException(error) && error.code === "ENOENT")
        return `${relativePath}/: expected a directory`;
      return `${segments.slice(0, index + 1).join("/")}: cannot inspect ${kind} path (${filesystemMessage(error)})`;
    }
    const checkedPath = segments.slice(0, index + 1).join("/");
    if (stats.isSymbolicLink())
      return `${checkedPath}: symbolic links are not supported in ${kind} paths`;
    if (!stats.isDirectory())
      return `${checkedPath}: expected a directory in the ${kind} path`;
  }
  return null;
}

function compareDirents(left: Dirent<string>, right: Dirent<string>): number {
  return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function filesystemMessage(error: unknown): string {
  return isErrnoException(error) && error.code
    ? `${error.code}: ${error.message}`
    : String(error);
}
