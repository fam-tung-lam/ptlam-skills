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
import { format } from "prettier";
import { updateClaudePlugin } from "./helpers/update-claude-plugin.ts";
import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  SKILLS_README_END_MARKER,
  SKILLS_README_START_MARKER,
  updatePluginReadme,
} from "./helpers/update-plugin-readme.ts";
import { validateMarkdownLinks } from "./helpers/validate-markdown-links.ts";
import type { CompilerPlugin } from "./models/plugin.ts";
import {
  PluginValidator,
  type PluginValidatorPort,
} from "./plugin-validator.ts";
import {
  type ComposedSkillEntry,
  composePublishedSkills,
} from "./skill-composer.ts";

/** Compiler-owned repository outputs. `skills` denotes the complete directory. */
export const MANAGED_OUTPUT_PATHS = Object.freeze([
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "README.md",
  "skills",
]);

export type OutputContent = string | Buffer;

export interface OutputPlanEntry {
  path: string;
  expected: OutputContent | null;
  current: OutputContent | null;
  exists: boolean;
}

export interface ExpectedOutputPlan {
  entries: OutputPlanEntry[];
  missing: string[];
  expectedSkills: Map<string, OutputContent>;
}

export interface GeneratePluginResult {
  plugin: CompilerPlugin;
  diagnostics: readonly string[];
  changedPaths: string[];
  unchangedPaths: string[];
}

export interface BuildExpectedOutputPlanRequest {
  rootDir: string;
  plugin: CompilerPlugin;
  allowMissingReadmes?: boolean;
}

export interface PluginGeneratorPort {
  buildExpectedOutputPlan(
    request: BuildExpectedOutputPlanRequest,
  ): Promise<ExpectedOutputPlan>;
  generatePlugin(request: { rootDir: string }): Promise<GeneratePluginResult>;
}

const OUTSIDE_SKILLS_PATHS = MANAGED_OUTPUT_PATHS.slice(0, 3);
const EMPTY_ROOT_README = `${ROOT_README_START_MARKER}\n${ROOT_README_END_MARKER}`;
const EMPTY_SKILLS_README = `# Skills\n\nThis directory is generated from \`plugin/plugin.yml\` and \`plugin/skills/\`. Do not edit it directly.\n\n${SKILLS_README_START_MARKER}\n${SKILLS_README_END_MARKER}\n`;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function contentsEqual(
  left: OutputContent | null,
  right: OutputContent | null,
): boolean {
  if (left === null || right === null) return left === right;
  const leftBuffer = Buffer.isBuffer(left) ? left : Buffer.from(left);
  const rightBuffer = Buffer.isBuffer(right) ? right : Buffer.from(right);
  return leftBuffer.equals(rightBuffer);
}

async function readOptionalText(
  rootDir: string,
  relativePath: string,
): Promise<string | null> {
  try {
    return await readFile(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") return null;
    throw error;
  }
}

async function assertRealRepository(rootDir: string): Promise<void> {
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

async function snapshotDirectory(
  rootDir: string,
  relativeDirectory: string,
): Promise<Map<string, Buffer>> {
  const absoluteDirectory = path.join(rootDir, relativeDirectory);
  let rootStats: Stats;
  try {
    rootStats = await lstat(absoluteDirectory);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") return new Map();
    throw error;
  }
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error(
      `${relativeDirectory}: managed output must be a real directory`,
    );
  }

  const files = new Map<string, Buffer>();
  async function visit(directory: string, prefix: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        throw new Error(
          `${relativeDirectory}/${relativePath}: managed output contains a symbolic link`,
        );
      }
      if (entry.isDirectory()) {
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
  return files;
}

async function replaceFile(
  rootDir: string,
  relativePath: string,
  content: OutputContent,
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
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

async function stageSkillsDirectory(
  rootDir: string,
  expectedSkills: ReadonlyMap<string, OutputContent>,
): Promise<string> {
  const token = randomUUID();
  const stagedPath = path.join(rootDir, `.plugin-compiler-skills-${token}.tmp`);
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
  expectedSkills: ReadonlyMap<string, OutputContent>,
): Promise<void> {
  const stagedName = path.basename(stagedPath);
  const stagedSnapshot = await snapshotDirectory(
    path.dirname(stagedPath),
    stagedName,
  );
  const actual = new Map<string, Buffer>(
    [...stagedSnapshot].map(([relativePath, content]) => [
      relativePath.slice(stagedName.length + 1),
      content,
    ]),
  );
  const expected = new Map<string, OutputContent>(
    [...expectedSkills].map(([relativePath, content]) => [
      relativePath.slice("skills/".length),
      content,
    ]),
  );
  const diagnostics: string[] = [];
  const allPaths = [...new Set([...expected.keys(), ...actual.keys()])].sort();

  for (const relativePath of allPaths) {
    if (!expected.has(relativePath)) {
      diagnostics.push(`${relativePath}: unexpected staged file`);
    } else if (!actual.has(relativePath)) {
      diagnostics.push(`${relativePath}: staged file is missing`);
    } else if (
      !contentsEqual(
        actual.get(relativePath) ?? null,
        expected.get(relativePath) ?? null,
      )
    ) {
      diagnostics.push(
        `${relativePath}: staged bytes differ from the output plan`,
      );
    }
  }

  for (const [relativePath, content] of actual) {
    if (!relativePath.endsWith(".md")) continue;
    const rootSkillId = relativePath.split("/")[0];
    const isCatalogReadme = relativePath === "README.md";
    const prefix = isCatalogReadme ? "" : `${rootSkillId}/`;
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
        skillPath: isCatalogReadme ? "skills" : `skills/${rootSkillId}`,
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

async function formatComposedSkill(content: string): Promise<string> {
  const closing = "\n---\n";
  const closingIndex = content.indexOf(closing, 4);
  if (!content.startsWith("---\n") || closingIndex === -1) {
    throw new Error("Composed SKILL.md is missing generated frontmatter");
  }
  const formattedFrontmatter = await format(content.slice(4, closingIndex), {
    parser: "yaml",
    proseWrap: "always",
  });
  return `---\n${formattedFrontmatter}---\n${content.slice(
    closingIndex + closing.length,
  )}`;
}

async function commitSkillsDirectory(
  rootDir: string,
  stagedPath: string,
): Promise<void> {
  const token = randomUUID();
  const targetPath = path.join(rootDir, "skills");
  const backupPath = path.join(rootDir, `.plugin-compiler-skills-${token}.bak`);
  let targetMoved = false;
  let stagedInstalled = false;

  try {
    try {
      await rename(targetPath, backupPath);
      targetMoved = true;
    } catch (error) {
      if (!isErrnoException(error) || error.code !== "ENOENT") throw error;
    }
    await rename(stagedPath, targetPath);
    stagedInstalled = true;
  } catch (error) {
    await rm(stagedPath, { recursive: true, force: true });
    if (targetMoved && !stagedInstalled) {
      await rename(backupPath, targetPath).catch(() => {});
    }
    throw error;
  }

  if (targetMoved) {
    await rm(backupPath, { recursive: true, force: true }).catch(() => {});
  }
}

/** Validate, plan, and generate compiler-owned publication outputs. */
export class PluginGenerator implements PluginGeneratorPort {
  readonly validator: PluginValidatorPort;

  constructor({
    validator = new PluginValidator(),
  }: { validator?: PluginValidatorPort } = {}) {
    this.validator = validator;
  }

  async buildExpectedOutputPlan({
    rootDir,
    plugin,
    allowMissingReadmes = false,
  }: BuildExpectedOutputPlanRequest): Promise<ExpectedOutputPlan> {
    const resolvedRoot = path.resolve(rootDir);
    await assertRealRepository(resolvedRoot);
    await Promise.all(
      OUTSIDE_SKILLS_PATHS.map((relativePath) =>
        assertSafeFilePath(resolvedRoot, relativePath),
      ),
    );

    const currentOutside = new Map<string, string | null>(
      await Promise.all(
        OUTSIDE_SKILLS_PATHS.map(
          async (relativePath) =>
            [
              relativePath,
              await readOptionalText(resolvedRoot, relativePath),
            ] as const,
        ),
      ),
    );
    const missing = ["README.md"].filter(
      (relativePath) => currentOutside.get(relativePath) === null,
    );
    if (!allowMissingReadmes && missing.length > 0) {
      throw new Error("README.md: README source file is missing");
    }

    const composed = composePublishedSkills({ plugin });
    const composedEntries: ComposedSkillEntry[] = await Promise.all(
      composed.entries.map(
        async (entry): Promise<ComposedSkillEntry> => ({
          ...entry,
          content: entry.path.endsWith("/SKILL.md")
            ? await formatComposedSkill(String(entry.content))
            : entry.content,
        }),
      ),
    );
    const claude = updateClaudePlugin({ plugin });
    const readmes = updatePluginReadme({
      plugin,
      rootReadme: currentOutside.get("README.md") ?? EMPTY_ROOT_README,
      skillsReadme: EMPTY_SKILLS_README,
    });
    const expectedOutside = new Map([
      [".claude-plugin/plugin.json", claude.pluginJson],
      [".claude-plugin/marketplace.json", claude.marketplaceJson],
      ["README.md", readmes.rootReadme],
    ]);
    const expectedSkills = new Map<string, OutputContent>();
    expectedSkills.set(
      "skills/README.md",
      await format(readmes.skillsReadme, {
        parser: "markdown",
        proseWrap: "always",
      }),
    );
    for (const entry of composedEntries) {
      expectedSkills.set(entry.path, entry.content);
    }
    const currentSkills = await snapshotDirectory(resolvedRoot, "skills");
    const entries: OutputPlanEntry[] = [];

    for (const relativePath of OUTSIDE_SKILLS_PATHS) {
      const current = currentOutside.get(relativePath) ?? null;
      entries.push({
        path: relativePath,
        expected: expectedOutside.get(relativePath) ?? null,
        current,
        exists: current !== null,
      });
    }
    const skillPaths = [
      ...new Set([...expectedSkills.keys(), ...currentSkills.keys()]),
    ].sort();
    for (const relativePath of skillPaths) {
      entries.push({
        path: relativePath,
        expected: expectedSkills.get(relativePath) ?? null,
        current: currentSkills.get(relativePath) ?? null,
        exists: currentSkills.has(relativePath),
      });
    }

    return { entries, missing, expectedSkills };
  }

  async generatePlugin({
    rootDir,
  }: {
    rootDir: string;
  }): Promise<GeneratePluginResult> {
    const { plugin, diagnostics } = await this.validator.validatePlugin({
      rootDir,
    });
    const plan = await this.buildExpectedOutputPlan({ rootDir, plugin });
    const changedEntries = plan.entries.filter(
      (entry) => !contentsEqual(entry.current, entry.expected),
    );
    const outsideChanges = changedEntries.filter(
      (entry) => !entry.path.startsWith("skills/"),
    );
    const skillsChanged = changedEntries.some((entry) =>
      entry.path.startsWith("skills/"),
    );

    const resolvedRoot = path.resolve(rootDir);
    const stagedSkills = skillsChanged
      ? await stageSkillsDirectory(resolvedRoot, plan.expectedSkills)
      : null;
    try {
      if (stagedSkills) {
        await validateStagedSkillsDirectory(stagedSkills, plan.expectedSkills);
      }
      for (const entry of outsideChanges) {
        if (entry.expected === null) {
          throw new Error(`${entry.path}: expected output is missing`);
        }
        await replaceFile(rootDir, entry.path, entry.expected);
      }
      if (stagedSkills) {
        await commitSkillsDirectory(resolvedRoot, stagedSkills);
      }
    } catch (error) {
      if (stagedSkills) {
        await rm(stagedSkills, { recursive: true, force: true });
      }
      throw error;
    }

    return {
      plugin,
      diagnostics,
      changedPaths: [
        ...outsideChanges.map((entry) => entry.path),
        ...(skillsChanged ? ["skills"] : []),
      ],
      unchangedPaths: MANAGED_OUTPUT_PATHS.filter(
        (relativePath) =>
          relativePath !== "skills" &&
          !outsideChanges.some((entry) => entry.path === relativePath),
      ).concat(skillsChanged ? [] : ["skills"]),
    };
  }
}
