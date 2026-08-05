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
import { Skill } from "./models/skill.mjs";
import { SkillRequirement } from "./models/skill-requirement.mjs";
import { SkillResource } from "./models/skill-resource.mjs";
import { validateMarkdownLinks } from "./helpers/validate-markdown-links.mjs";

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

export const REQUIRED_SKILLS_MARKER =
  "<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->";
const SOURCE_MANIFEST_PATH = "plugin/plugin.yml";
const SOURCE_SKILLS_PATH = "plugin/skills";
const RESERVED_REQUIRED_SKILLS_PATH = "references/required-skills";

/** Aggregated, immutable validation diagnostics. */
export class PluginValidationError extends Error {
  /** @param {Iterable<string>} diagnostics */
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

/** Validate canonical v2 plugin sources and return an immutable source plan. */
export class PluginValidator {
  /**
   * @param {{ rootDir?: string }} [request]
   * @returns {Promise<{plugin: Plugin, diagnostics: readonly string[]}>}
   */
  async validatePlugin({ rootDir } = {}) {
    const repositoryRoot = path.resolve(rootDir ?? process.cwd());
    await validateRepositoryRoot(repositoryRoot);

    const manifestSource = await readPluginManifest(repositoryRoot);
    const manifest = parseStrictYaml(manifestSource, SOURCE_MANIFEST_PATH, {
      requireQuotedPluginVersion: true,
    });
    if (!validateManifestSchema(manifest)) {
      throw new PluginValidationError(
        validateManifestSchema.errors.map(formatSchemaError),
      );
    }

    const errors = [];
    const warnings = [];
    const categoryCounts = countBy(manifest.categories, ({ id }) => id);
    const skillCounts = countBy(manifest.skills, ({ id }) => id);
    const categoriesById = new Map();
    const skillsById = new Map();

    manifest.categories.forEach((category, index) => {
      if (categoryCounts.get(category.id) > 1) {
        errors.push(
          `${SOURCE_MANIFEST_PATH}#/categories/${index}/id: duplicate category id "${category.id}"`,
        );
      }
      if (!categoriesById.has(category.id))
        categoriesById.set(category.id, category);
    });

    manifest.skills.forEach((skill, index) => {
      if (skillCounts.get(skill.id) > 1) {
        errors.push(
          `${SOURCE_MANIFEST_PATH}#/skills/${index}/id: duplicate skill id "${skill.id}"`,
        );
      }
      if (!skillsById.has(skill.id)) skillsById.set(skill.id, skill);
      if (!categoriesById.has(skill.category_id)) {
        errors.push(
          `${SOURCE_MANIFEST_PATH}#/skills/${index}/category_id: unknown category "${skill.category_id}" for skill "${skill.id}"`,
        );
      }
    });

    validateSkillGraph(
      manifest.skills,
      skillsById,
      skillCounts,
      errors,
      warnings,
    );
    const discoveredSkillIds = await discoverSourceSkills(
      repositoryRoot,
      errors,
    );
    validateSourceMapping(manifest.skills, discoveredSkillIds, errors);

    const skills = [];
    for (const [index, sourceSkill] of manifest.skills.entries()) {
      const snapshot = await inspectSkillSource(
        repositoryRoot,
        sourceSkill,
        index,
        errors,
      );
      if (!snapshot) continue;
      skills.push(
        new Skill({
          ...sourceSkill,
          required_skills: sourceSkill.required_skills.map(
            (requirement) => new SkillRequirement(requirement),
          ),
          ...snapshot,
        }),
      );
    }

    if (errors.length > 0) throw new PluginValidationError(errors);

    const plugin = new Plugin({
      ...manifest,
      categories: manifest.categories.map((category) => new Category(category)),
      skills,
    });
    return Object.freeze({
      plugin,
      diagnostics: Object.freeze(warnings),
    });
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
  const diagnostic = await validateRegularRepositoryPath(
    repositoryRoot,
    SOURCE_MANIFEST_PATH,
    { terminalName: "plugin.yml" },
  );
  if (diagnostic) throw new PluginValidationError([diagnostic]);
  try {
    return await readFile(
      path.join(repositoryRoot, "plugin", "plugin.yml"),
      "utf8",
    );
  } catch (error) {
    throw new PluginValidationError([
      `${SOURCE_MANIFEST_PATH}: cannot read plugin manifest (${filesystemMessage(error)})`,
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
      if (node?.anchor)
        diagnostics.push(`${location}: YAML anchors are not supported`);
      if (isAlias(node))
        diagnostics.push(`${location}: YAML aliases are not supported`);
      if (node?.tag)
        diagnostics.push(`${location}: explicit YAML tags are not supported`);
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
    const versionNode = mappingValue(document.contents, "version");
    if (isScalar(versionNode) && versionNode.type === "PLAIN") {
      diagnostics.push(
        `${yamlLocation(sourceName, lineCounter, versionNode)}: version must be quoted`,
      );
    }
  }
  if (diagnostics.length > 0) throw new PluginValidationError(diagnostics);

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
  const interpolationDiagnostic = findInterpolation(value, "#");
  if (interpolationDiagnostic) {
    throw new PluginValidationError([
      `${sourceName}${interpolationDiagnostic}: interpolation is not supported`,
    ]);
  }
  return value;
}

async function discoverSourceSkills(repositoryRoot, diagnostics) {
  const skillsDirectory = path.join(repositoryRoot, "plugin", "skills");
  const pathDiagnostic = await validateDirectoryPath(
    repositoryRoot,
    SOURCE_SKILLS_PATH,
    "skill source",
  );
  if (pathDiagnostic) {
    diagnostics.push(pathDiagnostic);
    return new Set();
  }

  let entries;
  try {
    entries = await readdir(skillsDirectory, { withFileTypes: true });
  } catch (error) {
    diagnostics.push(
      `${SOURCE_SKILLS_PATH}/: cannot inspect skill directories (${filesystemMessage(error)})`,
    );
    return new Set();
  }

  const ids = new Set();
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = `${SOURCE_SKILLS_PATH}/${entry.name}`;
    if (entry.isSymbolicLink()) {
      diagnostics.push(
        `${relativePath}: symbolic links are not supported in skill source paths`,
      );
    } else if (!entry.isDirectory()) {
      diagnostics.push(
        `${relativePath}: only skill directories are allowed directly in ${SOURCE_SKILLS_PATH}/`,
      );
    } else {
      ids.add(entry.name);
    }
  }
  return ids;
}

function validateSourceMapping(skills, discoveredSkillIds, diagnostics) {
  const manifestIds = new Set(skills.map(({ id }) => id));
  for (const id of discoveredSkillIds) {
    if (!manifestIds.has(id)) {
      diagnostics.push(
        `${SOURCE_SKILLS_PATH}/${id}: source skill is not listed in ${SOURCE_MANIFEST_PATH}`,
      );
    }
  }
  for (const id of manifestIds) {
    if (!discoveredSkillIds.has(id)) {
      diagnostics.push(
        `${SOURCE_MANIFEST_PATH}#skills: expected ${SOURCE_SKILLS_PATH}/${id}/SKILL.md`,
      );
    }
  }
}

async function inspectSkillSource(
  repositoryRoot,
  sourceSkill,
  index,
  diagnostics,
) {
  const sourcePath = `${SOURCE_SKILLS_PATH}/${sourceSkill.id}`;
  const sourceDirectory = path.join(repositoryRoot, ...sourcePath.split("/"));
  const skillPath = `${sourcePath}/SKILL.md`;
  const skillPathDiagnostic = await validateRegularRepositoryPath(
    repositoryRoot,
    skillPath,
    { kind: "skill source", terminalName: "SKILL.md" },
  );
  if (skillPathDiagnostic) {
    diagnostics.push(skillPathDiagnostic);
    return null;
  }

  const filePaths = [];
  await inspectSourceTree(
    sourceDirectory,
    "",
    sourcePath,
    filePaths,
    diagnostics,
  );
  if (!filePaths.includes("SKILL.md")) {
    diagnostics.push(
      `${SOURCE_MANIFEST_PATH}#/skills/${index}: expected ${skillPath}`,
    );
    return null;
  }

  let sourceBody;
  try {
    sourceBody = await readFile(path.join(sourceDirectory, "SKILL.md"), "utf8");
  } catch (error) {
    diagnostics.push(
      `${skillPath}: cannot read source (${filesystemMessage(error)})`,
    );
    return null;
  }
  if (/^\uFEFF?---[ \t]*(?:\r?\n|$)/u.test(sourceBody)) {
    diagnostics.push(
      `${skillPath}: authored SKILL.md must not contain YAML frontmatter`,
    );
  }
  const markerCount = sourceBody.split(REQUIRED_SKILLS_MARKER).length - 1;
  if (markerCount !== 1) {
    diagnostics.push(
      `${skillPath}: expected exactly one ${REQUIRED_SKILLS_MARKER} marker, found ${markerCount}`,
    );
  }

  const resources = [];
  const sourceFiles = new Set(filePaths);
  for (const relativePath of filePaths) {
    const absolutePath = path.join(sourceDirectory, ...relativePath.split("/"));
    const content = await readFile(absolutePath);
    if (relativePath !== "SKILL.md") {
      resources.push(
        new SkillResource({
          path: relativePath,
          content_base64: content.toString("base64"),
        }),
      );
    }
    if (relativePath.endsWith(".md")) {
      diagnostics.push(
        ...validateMarkdownLinks({
          source: content.toString("utf8"),
          markdownPath: relativePath,
          sourceFiles,
          skillPath: sourcePath,
        }),
      );
    }
  }

  return {
    source_path: sourcePath,
    source_body: sourceBody,
    resources,
  };
}

async function inspectSourceTree(
  absoluteDirectory,
  relativeDirectory,
  sourcePath,
  filePaths,
  diagnostics,
) {
  let entries;
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    diagnostics.push(
      `${sourcePath}${relativeDirectory ? `/${relativeDirectory}` : ""}: cannot inspect source directory (${filesystemMessage(error)})`,
    );
    return;
  }

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    const displayPath = `${sourcePath}/${relativePath}`;
    if (entry.name === ".DS_Store") {
      diagnostics.push(`${displayPath}: unsupported service file`);
      continue;
    }
    if (
      relativePath === RESERVED_REQUIRED_SKILLS_PATH ||
      relativePath.startsWith(`${RESERVED_REQUIRED_SKILLS_PATH}/`)
    ) {
      diagnostics.push(
        `${displayPath}: ${RESERVED_REQUIRED_SKILLS_PATH}/ is owned by the plugin compiler`,
      );
      continue;
    }
    if (entry.isSymbolicLink()) {
      diagnostics.push(
        `${displayPath}: symbolic links are not supported in skill sources`,
      );
    } else if (entry.isDirectory()) {
      await inspectSourceTree(
        path.join(absoluteDirectory, entry.name),
        relativePath,
        sourcePath,
        filePaths,
        diagnostics,
      );
    } else if (entry.isFile()) {
      filePaths.push(relativePath);
    } else {
      diagnostics.push(`${displayPath}: expected a regular file or directory`);
    }
  }
}

function validateSkillGraph(skills, skillsById, skillCounts, errors, warnings) {
  skills.forEach((skill, index) => {
    const requirementCounts = countBy(
      skill.required_skills,
      ({ skill_id }) => skill_id,
    );
    for (const [
      requirementIndex,
      requirement,
    ] of skill.required_skills.entries()) {
      const field = `${SOURCE_MANIFEST_PATH}#/skills/${index}/required_skills/${requirementIndex}/skill_id`;
      const target = skillsById.get(requirement.skill_id);
      if (requirementCounts.get(requirement.skill_id) > 1) {
        errors.push(
          `${field}: duplicate required skill "${requirement.skill_id}"`,
        );
      }
      if (!target) {
        errors.push(
          `${field}: skill "${skill.id}" references unknown skill "${requirement.skill_id}"`,
        );
        continue;
      }
      if (target.id === skill.id) {
        errors.push(`${field}: skill "${skill.id}" cannot require itself`);
        continue;
      }
      if (target.status === "archived" && skill.status !== "archived") {
        errors.push(
          `${field}: non-archived skill "${skill.id}" cannot require archived skill "${target.id}"`,
        );
      }
      if (
        ["active", "deprecated"].includes(skill.status) &&
        ["draft", "archived"].includes(target.status)
      ) {
        errors.push(
          `${field}: ${skill.status} skill "${skill.id}" cannot require ${target.status} skill "${target.id}"`,
        );
      }
      if (target.status === "deprecated") {
        warnings.push(
          `${field}: skill "${skill.id}" requires deprecated skill "${target.id}"`,
        );
      }
    }

    validateReplacement(skill, index, "deprecation", skillsById, errors);
    validateReplacement(skill, index, "archive", skillsById, errors);
  });

  if ([...skillCounts.values()].some((count) => count > 1)) return;
  validateAcyclicGraph(skills, skillsById, errors);
  warnForUnreachableInternalSkills(skills, skillsById, warnings);
}

function validateReplacement(skill, index, fieldName, skillsById, errors) {
  const replacementId = skill[fieldName]?.replacement_skill_id;
  if (!replacementId) return;
  const field = `${SOURCE_MANIFEST_PATH}#/skills/${index}/${fieldName}/replacement_skill_id`;
  const replacement = skillsById.get(replacementId);
  if (!replacement) {
    errors.push(`${field}: references unknown skill "${replacementId}"`);
  } else if (replacementId === skill.id) {
    errors.push(`${field}: skill "${skill.id}" cannot replace itself`);
  } else if (replacement.status !== "active") {
    errors.push(
      `${field}: replacement skill "${replacementId}" must have status active`,
    );
  }
}

function validateAcyclicGraph(skills, skillsById, errors) {
  const state = new Map();
  const stack = [];
  let cycleReported = false;

  function visitSkill(skillId) {
    state.set(skillId, 1);
    stack.push(skillId);
    const skill = skillsById.get(skillId);
    for (const { skill_id: target } of skill.required_skills) {
      if (!skillsById.has(target) || target === skillId) continue;
      if (state.get(target) === 1 && !cycleReported) {
        const cycle = [...stack.slice(stack.indexOf(target)), target];
        errors.push(
          `${SOURCE_MANIFEST_PATH}#skills: required_skills must form an acyclic graph; found ${cycle.join(" -> ")}`,
        );
        cycleReported = true;
      } else if (!state.has(target)) {
        visitSkill(target);
      }
    }
    stack.pop();
    state.set(skillId, 2);
  }

  for (const skill of skills) {
    if (!state.has(skill.id)) visitSkill(skill.id);
  }
}

function warnForUnreachableInternalSkills(skills, skillsById, warnings) {
  const reachable = new Set();
  const roots = skills.filter(
    ({ visibility, status }) =>
      visibility === "public" && ["active", "deprecated"].includes(status),
  );
  function visitSkill(skill) {
    if (reachable.has(skill.id)) return;
    reachable.add(skill.id);
    for (const { skill_id } of skill.required_skills) {
      const target = skillsById.get(skill_id);
      if (target) visitSkill(target);
    }
  }
  roots.forEach(visitSkill);
  for (const skill of skills) {
    if (
      skill.visibility === "internal" &&
      skill.status === "active" &&
      !reachable.has(skill.id)
    ) {
      warnings.push(
        `${SOURCE_MANIFEST_PATH}#skills: internal active skill "${skill.id}" is unreachable from published outputs`,
      );
    }
  }
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
      if (error.code === "ENOENT") return null;
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

async function validateDirectoryPath(repositoryRoot, relativePath, kind) {
  const segments = relativePath.split("/");
  let currentPath = repositoryRoot;
  for (let index = 0; index < segments.length; index += 1) {
    currentPath = path.join(currentPath, segments[index]);
    let stats;
    try {
      stats = await lstat(currentPath);
    } catch (error) {
      if (error.code === "ENOENT")
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

function formatSchemaError(error) {
  let field = `${SOURCE_MANIFEST_PATH}${error.instancePath || "#"}`;
  if (error.keyword === "required") field += `/${error.params.missingProperty}`;
  if (error.keyword === "additionalProperties")
    field += `/${error.params.additionalProperty}`;
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
  if (typeof offset !== "number") return sourceName;
  const { line, col } = lineCounter.linePos(offset);
  return `${sourceName}:${line}:${col}`;
}

function findNonJsonValue(value, pointer) {
  if (value === null || ["string", "boolean"].includes(typeof value))
    return null;
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? null
      : `${pointer}: numbers must be finite JSON values`;
  }
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      const diagnostic = findNonJsonValue(child, `${pointer}/${index}`);
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

function findInterpolation(value, pointer) {
  if (typeof value === "string") {
    return /\$\{[^}]*\}/u.test(value) ? pointer : null;
  }
  if (Array.isArray(value)) {
    for (const [index, child] of value.entries()) {
      const diagnostic = findInterpolation(child, `${pointer}/${index}`);
      if (diagnostic) return diagnostic;
    }
  } else if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      const diagnostic = findInterpolation(
        child,
        `${pointer}/${escapePointer(key)}`,
      );
      if (diagnostic) return diagnostic;
    }
  }
  return null;
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
