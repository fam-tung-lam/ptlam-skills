import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import {
  LineCounter,
  isAlias,
  isPair,
  isScalar,
  parseDocument,
  visit,
} from "yaml";

import { Category } from "./models/category.mjs";
import { Plugin } from "./models/plugin.mjs";
import { PluginMetadata } from "./models/plugin-metadata.mjs";
import { Skill } from "./models/skill.mjs";
import { SkillFrontmatter } from "./models/skill-frontmatter.mjs";

const validatorDirectory = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(
  validatorDirectory,
  "schemas",
  "plugin.schema.json",
);
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const validateManifestSchema = new Ajv2020({
  allErrors: true,
  strict: true,
}).compile(schema);

/**
 * Aggregates actionable diagnostics from plugin manifest and skill validation.
 * Catch this error when callers need to present every validation problem in one
 * pass instead of stopping at the first invalid field.
 *
 * @property {"PluginValidationError"} name Stable error type name.
 * @property {string} message Formatted summary followed by every diagnostic.
 * @property {readonly string[]} diagnostics Deduplicated, frozen diagnostics.
 */
export class PluginValidationError extends Error {
  /**
   * @param {Iterable<string>} diagnostics Validation messages to deduplicate and report.
   * @throws {TypeError} If diagnostics is not iterable.
   */
  constructor(diagnostics) {
    const normalizedDiagnostics = [...new Set(diagnostics)].filter(Boolean);
    super(
      `Plugin validation failed with ${normalizedDiagnostics.length} diagnostic${normalizedDiagnostics.length === 1 ? "" : "s"}:\n${normalizedDiagnostics
        .map((diagnostic) => `- ${diagnostic}`)
        .join("\n")}`,
    );
    this.name = "PluginValidationError";
    this.diagnostics = Object.freeze(normalizedDiagnostics);
  }
}

/**
 * Loads a repository's canonical plugin sources and returns a normalized model.
 *
 * @example
 * const { plugin } = await new PluginValidator().validatePlugin({
 *   rootDir: "/path/to/repository",
 * });
 */
export class PluginValidator {
  /**
   * Load and validate a repository plugin manifest and its skill frontmatter.
   *
   * @param {{ rootDir?: string }} [request={}] Validation options.
   * @param {string} [request.rootDir=process.cwd()] Repository root containing `plugin.yml` and `skills/`.
   * @returns {Promise<{ plugin: Plugin, diagnostics: readonly string[] }>} Frozen validated model and an empty diagnostic list.
   * @throws {PluginValidationError} If repository sources cannot be read safely or violate schema and catalog invariants.
   * @throws {TypeError} If `rootDir` is not a valid path value.
   */
  async validatePlugin({ rootDir } = {}) {
    const repositoryRoot = path.resolve(rootDir ?? process.cwd());
    await validateRepositoryRoot(repositoryRoot);

    const manifestSource = await readPluginManifest(repositoryRoot);
    const manifest = parseStrictYaml(manifestSource, "plugin.yml", {
      requireQuotedPluginVersion: true,
    });

    if (!validateManifestSchema(manifest)) {
      throw new PluginValidationError(
        validateManifestSchema.errors.map((error) => formatSchemaError(error)),
      );
    }

    const diagnostics = [];
    const categoryCounts = countBy(manifest.categories, ({ id }) => id);
    const skillCounts = countBy(manifest.skills, ({ id }) => id);
    const categoriesById = new Map();
    const skillsById = new Map();

    manifest.categories.forEach((category, index) => {
      if (categoryCounts.get(category.id) > 1) {
        diagnostics.push(
          `plugin.yml#/categories/${index}/id: duplicate category id "${category.id}"`,
        );
      }
      if (!categoriesById.has(category.id)) {
        categoriesById.set(category.id, category);
      }
    });

    manifest.skills.forEach((skill, index) => {
      if (skillCounts.get(skill.id) > 1) {
        diagnostics.push(
          `plugin.yml#/skills/${index}/id: duplicate skill id "${skill.id}"`,
        );
      }
      if (!skillsById.has(skill.id)) {
        skillsById.set(skill.id, skill);
      }
      if (!categoriesById.has(skill.category)) {
        diagnostics.push(
          `plugin.yml#/skills/${index}/category: unknown category "${skill.category}" for skill "${skill.id}"`,
        );
      }
    });

    validateRequiredSkills(
      manifest.skills,
      skillsById,
      skillCounts,
      diagnostics,
    );

    const manifestPathCounts = countBy(
      manifest.skills,
      (skill) => `skills/${skill.category}/${skill.id}/SKILL.md`,
    );
    const discoveredPaths = await discoverSkillManifests(
      repositoryRoot,
      diagnostics,
    );

    for (const discoveredPath of discoveredPaths) {
      const count = manifestPathCounts.get(discoveredPath) ?? 0;
      if (count === 0) {
        diagnostics.push(
          `${discoveredPath}: discovered skill is not listed in plugin.yml`,
        );
      } else if (count > 1) {
        diagnostics.push(
          `${discoveredPath}: skill path is listed ${count} times in plugin.yml`,
        );
      }
    }

    const skills = [];
    for (let index = 0; index < manifest.skills.length; index += 1) {
      const sourceSkill = manifest.skills[index];
      const skillPath = `skills/${sourceSkill.category}/${sourceSkill.id}`;
      const skillManifestPath = `${skillPath}/SKILL.md`;
      const pathDiagnostic = await validateRegularRepositoryPath(
        repositoryRoot,
        skillManifestPath,
        { kind: "skill", terminalName: "SKILL.md" },
      );
      if (pathDiagnostic) {
        diagnostics.push(pathDiagnostic);
        continue;
      }

      let skillSource;
      try {
        skillSource = await readFile(
          path.join(repositoryRoot, ...skillManifestPath.split("/")),
          "utf8",
        );
      } catch (error) {
        diagnostics.push(
          `plugin.yml#/skills/${index}: expected ${skillManifestPath} (${filesystemMessage(error)})`,
        );
        continue;
      }

      let frontmatter;
      try {
        frontmatter = parseSkillFrontmatter(skillSource, skillManifestPath);
      } catch (error) {
        if (error instanceof PluginValidationError) {
          diagnostics.push(...error.diagnostics);
          continue;
        }
        throw error;
      }

      if (
        typeof frontmatter.name !== "string" ||
        frontmatter.name.trim() === ""
      ) {
        diagnostics.push(
          `${skillManifestPath}#name: must be a non-empty string`,
        );
      } else if (frontmatter.name !== sourceSkill.id) {
        diagnostics.push(
          `${skillManifestPath}#name: expected "${sourceSkill.id}" from plugin.yml and directory name, found "${frontmatter.name}"`,
        );
      }

      if (
        typeof frontmatter.description !== "string" ||
        frontmatter.description.trim() === ""
      ) {
        diagnostics.push(
          `${skillManifestPath}#description: must be a non-empty string`,
        );
      }

      skills.push(
        new Skill({
          id: sourceSkill.id,
          category_id: sourceSkill.category,
          kind: sourceSkill.kind,
          summary: sourceSkill.summary,
          required_skill_ids: sourceSkill.required_skill_ids,
          path: skillPath,
          frontmatter: new SkillFrontmatter({
            name: frontmatter.name,
            description:
              typeof frontmatter.description === "string"
                ? frontmatter.description.trim()
                : "",
          }),
        }),
      );
    }

    if (diagnostics.length > 0) {
      throw new PluginValidationError(diagnostics);
    }

    const plugin = new Plugin({
      schema_version: manifest.schema_version,
      metadata: new PluginMetadata(manifest.plugin),
      marketplace: manifest.marketplace,
      categories: manifest.categories.map((category) => new Category(category)),
      skills,
    });
    return Object.freeze({ plugin, diagnostics: Object.freeze([]) });
  }
}

async function validateRepositoryRoot(repositoryRoot) {
  let stats;
  try {
    stats = await lstat(repositoryRoot);
  } catch (error) {
    throw new PluginValidationError([
      `repository root: cannot inspect ${repositoryRoot} (${filesystemMessage(error)})`,
    ]);
  }
  if (stats.isSymbolicLink()) {
    throw new PluginValidationError([
      "repository root: symbolic links are not supported",
    ]);
  }
  if (!stats.isDirectory()) {
    throw new PluginValidationError(["repository root: expected a directory"]);
  }
}

async function readPluginManifest(repositoryRoot) {
  const manifestPath = "plugin.yml";
  const pathDiagnostic = await validateRegularRepositoryPath(
    repositoryRoot,
    manifestPath,
    { terminalName: "plugin.yml" },
  );
  if (pathDiagnostic) {
    throw new PluginValidationError([pathDiagnostic]);
  }
  try {
    return await readFile(path.join(repositoryRoot, manifestPath), "utf8");
  } catch (error) {
    throw new PluginValidationError([
      `plugin.yml: cannot read plugin manifest (${filesystemMessage(error)})`,
    ]);
  }
}

function parseStrictYaml(
  source,
  sourceName,
  { requireQuotedPluginVersion = false } = {},
) {
  const lineCounter = new LineCounter();
  const document = parseDocument(source, {
    lineCounter,
    merge: false,
    prettyErrors: false,
    schema: "core",
    uniqueKeys: true,
    version: "1.2",
  });
  const diagnostics = [
    ...document.errors.map(
      (error) => `${sourceName}: invalid YAML (${error.message})`,
    ),
    ...document.warnings.map(
      (warning) => `${sourceName}: unsupported YAML (${warning.message})`,
    ),
  ];

  if (document.contents !== null) {
    visit(document, (_key, node) => {
      const location = yamlLocation(sourceName, lineCounter, node);
      if (node?.anchor) {
        diagnostics.push(`${location}: YAML anchors are not supported`);
      }
      if (isAlias(node)) {
        diagnostics.push(`${location}: YAML aliases are not supported`);
      }
      if (node?.tag) {
        diagnostics.push(`${location}: explicit YAML tags are not supported`);
      }
      if (isPair(node)) {
        if (!isScalar(node.key) || typeof node.key.value !== "string") {
          diagnostics.push(`${location}: YAML mapping keys must be strings`);
        } else if (node.key.value === "<<") {
          diagnostics.push(`${location}: YAML merge keys are not supported`);
        }
      }
    });
  }

  if (requireQuotedPluginVersion) {
    const versionNode = mappingValue(
      mappingValue(document.contents, "plugin"),
      "version",
    );
    if (
      isScalar(versionNode) &&
      typeof versionNode.value === "string" &&
      versionNode.type === "PLAIN"
    ) {
      diagnostics.push(
        `${yamlLocation(sourceName, lineCounter, versionNode)}: plugin.version must be quoted`,
      );
    }
  }

  if (diagnostics.length > 0) {
    throw new PluginValidationError(diagnostics);
  }

  let value;
  try {
    value = document.toJS({ mapAsMap: false, maxAliasCount: 0 });
  } catch (error) {
    throw new PluginValidationError([
      `${sourceName}: cannot convert YAML to JSON-compatible values (${error.message})`,
    ]);
  }

  const jsonDiagnostic = findNonJsonValue(value, "#");
  if (jsonDiagnostic) {
    throw new PluginValidationError([`${sourceName}${jsonDiagnostic}`]);
  }
  return value;
}

function parseSkillFrontmatter(source, sourceName) {
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/u.exec(
    source,
  );
  if (!match) {
    throw new PluginValidationError([
      `${sourceName}: missing leading YAML frontmatter delimited by ---`,
    ]);
  }
  const frontmatter = parseStrictYaml(match[1], sourceName);
  if (!isPlainObject(frontmatter)) {
    throw new PluginValidationError([
      `${sourceName}: YAML frontmatter must be a mapping`,
    ]);
  }
  return frontmatter;
}

async function discoverSkillManifests(repositoryRoot, diagnostics) {
  const skillsDirectory = path.join(repositoryRoot, "skills");
  let categoryEntries;
  try {
    const skillsStats = await lstat(skillsDirectory);
    if (skillsStats.isSymbolicLink()) {
      diagnostics.push(
        "skills: symbolic links are not supported in skill paths",
      );
      return [];
    }
    if (!skillsStats.isDirectory()) {
      diagnostics.push("skills/: expected a directory");
      return [];
    }
    categoryEntries = await readdir(skillsDirectory, { withFileTypes: true });
  } catch (error) {
    diagnostics.push(
      `skills/: cannot inspect skill directories (${filesystemMessage(error)})`,
    );
    return [];
  }

  const discovered = [];
  for (const categoryEntry of categoryEntries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (categoryEntry.isSymbolicLink()) {
      diagnostics.push(
        `skills/${categoryEntry.name}: symbolic links are not supported in skill paths`,
      );
      continue;
    }
    if (!categoryEntry.isDirectory()) {
      continue;
    }

    const categoryDirectory = path.join(skillsDirectory, categoryEntry.name);
    let skillEntries;
    try {
      skillEntries = await readdir(categoryDirectory, { withFileTypes: true });
    } catch (error) {
      diagnostics.push(
        `skills/${categoryEntry.name}/: cannot inspect skill directories (${filesystemMessage(error)})`,
      );
      continue;
    }

    for (const skillEntry of skillEntries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      if (skillEntry.isSymbolicLink()) {
        diagnostics.push(
          `skills/${categoryEntry.name}/${skillEntry.name}: symbolic links are not supported in skill paths`,
        );
        continue;
      }
      if (!skillEntry.isDirectory()) {
        continue;
      }

      const skillDirectory = path.join(categoryDirectory, skillEntry.name);
      let entries;
      try {
        entries = await readdir(skillDirectory, { withFileTypes: true });
      } catch (error) {
        diagnostics.push(
          `skills/${categoryEntry.name}/${skillEntry.name}/: cannot inspect skill directory (${filesystemMessage(error)})`,
        );
        continue;
      }

      const skillManifestEntry = entries.find(
        (entry) => entry.name === "SKILL.md",
      );
      if (skillManifestEntry?.isSymbolicLink()) {
        diagnostics.push(
          `skills/${categoryEntry.name}/${skillEntry.name}/SKILL.md: symbolic links are not supported in skill paths`,
        );
      } else if (skillManifestEntry?.isFile()) {
        discovered.push(
          `skills/${categoryEntry.name}/${skillEntry.name}/SKILL.md`,
        );
      }
    }
  }
  return discovered;
}

async function validateRegularRepositoryPath(
  repositoryRoot,
  relativePath,
  { kind = "plugin", terminalName = "source" } = {},
) {
  const segments = relativePath.split("/");
  let currentPath = repositoryRoot;

  for (let index = 0; index < segments.length; index += 1) {
    currentPath = path.join(currentPath, segments[index]);
    let stats;
    try {
      stats = await lstat(currentPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
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

function validateRequiredSkills(skills, skillsById, skillCounts, diagnostics) {
  skills.forEach((skill, index) => {
    for (const target of skill.required_skill_ids) {
      const field = `plugin.yml#/skills/${index}/required_skill_ids`;
      if (!skillsById.has(target)) {
        diagnostics.push(
          `${field}: skill "${skill.id}" references unknown skill "${target}"`,
        );
      }
      if (target === skill.id) {
        diagnostics.push(`${field}: skill "${skill.id}" cannot require itself`);
      }
    }
  });

  if ([...skillCounts.values()].some((count) => count > 1)) {
    return;
  }

  const state = new Map();
  const stack = [];
  let cycleReported = false;

  function visitRequiredSkills(skillId) {
    state.set(skillId, 1);
    stack.push(skillId);
    const skill = skillsById.get(skillId);

    for (const target of skill.required_skill_ids) {
      if (!skillsById.has(target) || target === skillId) {
        continue;
      }
      if (state.get(target) === 1 && !cycleReported) {
        const cycleStart = stack.indexOf(target);
        const cycle = [...stack.slice(cycleStart), target];
        diagnostics.push(
          `plugin.yml#skills: required_skill_ids must form an acyclic graph; found ${cycle.join(" -> ")}`,
        );
        cycleReported = true;
      } else if (!state.has(target)) {
        visitRequiredSkills(target);
      }
    }

    stack.pop();
    state.set(skillId, 2);
  }

  for (const skill of skills) {
    if (!state.has(skill.id)) {
      visitRequiredSkills(skill.id);
    }
  }
}

function formatSchemaError(error) {
  let field = `plugin.yml${error.instancePath || "#"}`;
  if (error.keyword === "required") {
    field += `/${error.params.missingProperty}`;
  } else if (error.keyword === "additionalProperties") {
    field += `/${error.params.additionalProperty}`;
  }
  return `${field}: ${error.message}`;
}

function countBy(items, keyOf) {
  const counts = new Map();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function mappingValue(mapping, key) {
  const pair = mapping?.items?.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === key,
  );
  return pair?.value;
}

function yamlLocation(sourceName, lineCounter, node) {
  const offset = node?.range?.[0];
  if (typeof offset !== "number") {
    return sourceName;
  }
  const { line, col } = lineCounter.linePos(offset);
  return `${sourceName}:${line}:${col}`;
}

function findNonJsonValue(value, pointer) {
  if (value === null || ["string", "boolean"].includes(typeof value)) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? null
      : `${pointer}: numbers must be finite JSON values`;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const diagnostic = findNonJsonValue(value[index], `${pointer}/${index}`);
      if (diagnostic) return diagnostic;
    }
    return null;
  }
  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const diagnostic = findNonJsonValue(
        child,
        `${pointer}/${escapePointer(key)}`,
      );
      if (diagnostic) return diagnostic;
    }
    return null;
  }
  return `${pointer}: value is not JSON-compatible`;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function escapePointer(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function filesystemMessage(error) {
  return error?.code ? `${error.code}: ${error.message}` : String(error);
}
