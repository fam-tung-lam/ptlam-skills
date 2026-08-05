import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const toolRoot = path.join(repositoryRoot, "tools/plugin-compiler");
const testRoot = path.join(repositoryRoot, "tests/tools/plugin-compiler");

async function moduleNames(directory) {
  return (await readdir(directory))
    .filter((name) => name.endsWith(".mjs"))
    .sort();
}

async function modulePaths(directory) {
  return (await readdir(directory, { recursive: true }))
    .filter((name) => name.endsWith(".mjs"))
    .sort();
}

test("keeps every plugin compiler module filename in kebab-case", async () => {
  // Given
  const moduleRoots = [toolRoot, testRoot];
  const kebabCaseModule = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.test)?\.mjs$/u;

  // When
  const modulePathsByRoot = await Promise.all(moduleRoots.map(modulePaths));

  // Then
  for (const modulePathsForRoot of modulePathsByRoot) {
    for (const modulePath of modulePathsForRoot) {
      assert.match(path.basename(modulePath), kebabCaseModule, modulePath);
    }
  }
});

test("keeps only the four command components at the tool root", async () => {
  // Given
  const expectedModules = [
    "plugin-checker.mjs",
    "plugin-compiler-cli.mjs",
    "plugin-generator.mjs",
    "plugin-validator.mjs",
  ];

  // When
  const actualModules = await moduleNames(toolRoot);

  // Then
  assert.deepEqual(actualModules, expectedModules);
});

test("keeps one explicit file per approved domain model", async () => {
  // Given
  const expectedModels = [
    "category.mjs",
    "plugin-metadata.mjs",
    "plugin.mjs",
    "skill-frontmatter.mjs",
    "skill-requirement.mjs",
    "skill-resource.mjs",
    "skill.mjs",
  ];

  // When
  const actualModels = await moduleNames(path.join(toolRoot, "models"));

  // Then
  assert.deepEqual(actualModels, expectedModels);
});

test("keeps Claude and README content updaters in their own folder", async () => {
  // Given
  const expectedUpdaters = [
    "update-claude-plugin.mjs",
    "update-plugin-readme.mjs",
  ];

  // When
  const actualUpdaters = await moduleNames(
    path.join(toolRoot, "output_updaters"),
  );

  // Then
  assert.deepEqual(actualUpdaters, expectedUpdaters);
});

test("keeps pure updaters free of filesystem imports", async () => {
  // Given
  const updaterNames = await moduleNames(
    path.join(toolRoot, "output_updaters"),
  );

  // When
  const updaterSources = await Promise.all(
    updaterNames.map((name) =>
      readFile(path.join(toolRoot, "output_updaters", name), "utf8"),
    ),
  );

  // Then
  for (const [index, source] of updaterSources.entries()) {
    const name = updaterNames[index];
    assert.doesNotMatch(source, /(?:node:)?fs(?:\/promises)?/u, name);
  }
});

test("keeps Checker free of filesystem mutation APIs", async () => {
  // Given
  const checkerPath = path.join(toolRoot, "plugin-checker.mjs");

  // When
  const source = await readFile(checkerPath, "utf8");

  // Then
  assert.doesNotMatch(
    source,
    /\b(?:writeFile|rename|unlink|mkdir|rm|rmdir|truncate|appendFile)\b/u,
  );
});
