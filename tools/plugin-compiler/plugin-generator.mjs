import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  SKILLS_README_END_MARKER,
  SKILLS_README_START_MARKER,
  updatePluginReadme,
} from "./output_updaters/update-plugin-readme.mjs";
import { updateClaudePlugin } from "./output_updaters/update-claude-plugin.mjs";
import { PluginValidator } from "./plugin-validator.mjs";

/**
 * Repository-relative artifacts exclusively maintained by the plugin compiler.
 * Consumers can use this frozen list to report or audit the compiler's write scope.
 *
 * @type {readonly string[]}
 */
export const MANAGED_OUTPUT_PATHS = Object.freeze([
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "README.md",
  "skills/README.md",
]);

const EMPTY_ROOT_README = `${ROOT_README_START_MARKER}\n${ROOT_README_END_MARKER}`;
const EMPTY_SKILLS_README = `${SKILLS_README_START_MARKER}\n${SKILLS_README_END_MARKER}`;

async function readOptionalText(rootDir, relativePath) {
  try {
    return await readFile(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function assertSafeOutputPath(rootDir, relativePath) {
  const resolvedRoot = path.resolve(rootDir);
  const segments = relativePath.split("/");
  const targetPath = path.resolve(resolvedRoot, ...segments);
  const relativeTarget = path.relative(resolvedRoot, targetPath);
  const rootStats = await lstat(resolvedRoot);

  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    throw new Error(`${relativePath}: managed output escapes the repository`);
  }
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error("Repository root must be a real directory, not a link");
  }

  let currentPath = resolvedRoot;
  for (let index = 0; index < segments.length; index += 1) {
    currentPath = path.join(currentPath, segments[index]);
    let stats;
    try {
      stats = await lstat(currentPath);
    } catch (error) {
      if (error.code === "ENOENT") return targetPath;
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

async function assertSafeOutputPaths(rootDir) {
  await Promise.all(
    MANAGED_OUTPUT_PATHS.map((relativePath) =>
      assertSafeOutputPath(rootDir, relativePath),
    ),
  );
}

async function replaceFile(rootDir, relativePath, content) {
  const targetPath = await assertSafeOutputPath(rootDir, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(targetPath),
    `.${path.basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporaryPath, content, { encoding: "utf8", flag: "wx" });
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

/**
 * Plans generated artifacts and replaces each changed file atomically.
 *
 * @property {PluginValidator} validator Validator used before generation.
 *
 * @example
 * const result = await new PluginGenerator().generatePlugin({ rootDir });
 * console.log(result.changedPaths);
 */
export class PluginGenerator {
  /**
   * @param {{ validator?: PluginValidator }} [dependencies={}] Injectable collaborators.
   * @param {PluginValidator} [dependencies.validator] Validator shared with callers such as the checker.
   */
  constructor({ validator = new PluginValidator() } = {}) {
    this.validator = validator;
  }

  /**
   * Build the single expected-output plan shared by generation and checking.
   * This method reads current files but never writes them.
   *
   * @param {object} request Planning inputs.
   * @param {string} request.rootDir Repository root containing current managed outputs.
   * @param {object} request.plugin Validated plugin domain model to render.
   * @param {boolean} [request.allowMissingReadmes=false] Whether absent README source files should be represented as drift instead of rejected.
   * @returns {Promise<{entries: Array<{path: string, expected: string, current: string|null, exists: boolean}>, missing: string[]}>} Expected/current content pairs and missing README paths.
   * @throws {Error} If the repository or a managed path is unsafe, a required README is missing, rendering fails, or a file cannot be read.
   */
  async buildExpectedOutputPlan({
    rootDir,
    plugin,
    allowMissingReadmes = false,
  }) {
    const resolvedRoot = path.resolve(rootDir);
    await assertSafeOutputPaths(resolvedRoot);

    const currentByPath = Object.fromEntries(
      await Promise.all(
        MANAGED_OUTPUT_PATHS.map(async (relativePath) => [
          relativePath,
          await readOptionalText(resolvedRoot, relativePath),
        ]),
      ),
    );
    const missing = ["README.md", "skills/README.md"].filter(
      (relativePath) => currentByPath[relativePath] === null,
    );

    if (!allowMissingReadmes && missing.length > 0) {
      throw new Error(
        `${missing.join(", ")}: README source file${missing.length === 1 ? " is" : "s are"} missing`,
      );
    }

    const claude = updateClaudePlugin({ plugin });
    const readmes = updatePluginReadme({
      plugin,
      rootReadme: currentByPath["README.md"] ?? EMPTY_ROOT_README,
      skillsReadme: currentByPath["skills/README.md"] ?? EMPTY_SKILLS_README,
    });
    const expectedByPath = {
      ".claude-plugin/plugin.json": claude.pluginJson,
      ".claude-plugin/marketplace.json": claude.marketplaceJson,
      "README.md": readmes.rootReadme,
      "skills/README.md": readmes.skillsReadme,
    };

    return {
      entries: MANAGED_OUTPUT_PATHS.map((relativePath) => ({
        path: relativePath,
        expected: expectedByPath[relativePath],
        current: currentByPath[relativePath],
        exists: currentByPath[relativePath] !== null,
      })),
      missing,
    };
  }

  /**
   * Validate and atomically replace each changed complete output file.
   *
   * @param {{ rootDir: string }} request Generation options.
   * @param {string} request.rootDir Repository root whose managed outputs should be updated.
   * @returns {Promise<{plugin: object, changedPaths: string[], unchangedPaths: string[]}>} Validated model and repository-relative output paths grouped by whether they changed.
   * @throws {import("./plugin-validator.mjs").PluginValidationError} If canonical plugin sources are invalid.
   * @throws {Error} If managed output paths are unsafe, README markers are invalid, or filesystem writes fail.
   */
  async generatePlugin({ rootDir }) {
    const validation = await this.validator.validatePlugin({ rootDir });
    const { plugin } = validation;
    const plan = await this.buildExpectedOutputPlan({ rootDir, plugin });
    const changedEntries = plan.entries.filter(
      (entry) => !entry.exists || entry.current !== entry.expected,
    );
    const unchangedPaths = plan.entries
      .filter((entry) => entry.exists && entry.current === entry.expected)
      .map((entry) => entry.path);

    for (const entry of changedEntries) {
      await replaceFile(rootDir, entry.path, entry.expected);
    }

    return {
      plugin,
      changedPaths: changedEntries.map((entry) => entry.path),
      unchangedPaths,
    };
  }
}
