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
  // GIVEN: The expected compiler architecture rule is defined.
  const moduleRoots = [toolRoot, testRoot];
  const kebabCaseModule = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.test)?\.mjs$/u;

  // WHEN: The relevant production or test files are inspected.
  const modulePathsByRoot = await Promise.all(moduleRoots.map(modulePaths));

  // THEN: The discovered structure is compared with the architecture rule.
  for (const modulePathsForRoot of modulePathsByRoot) {
    for (const modulePath of modulePathsForRoot) {
      assert.match(path.basename(modulePath), kebabCaseModule, modulePath);
    }
  }
});

test("keeps command components and the skill composer at the tool root", async () => {
  // GIVEN: The expected compiler architecture rule is defined.
  const expectedModules = [
    "plugin-checker.mjs",
    "plugin-compiler-cli.mjs",
    "plugin-generator.mjs",
    "plugin-validator.mjs",
    "skill-composer.mjs",
  ];

  // WHEN: The relevant production or test files are inspected.
  const actualModules = await moduleNames(toolRoot);

  // THEN: The discovered structure is compared with the architecture rule.
  assert.deepEqual(actualModules, expectedModules);
});

test("keeps one explicit file per approved domain model", async () => {
  // GIVEN: The expected compiler architecture rule is defined.
  const expectedModels = [
    "category.mjs",
    "plugin-metadata.mjs",
    "plugin.mjs",
    "skill-frontmatter.mjs",
    "skill-requirement.mjs",
    "skill-resource.mjs",
    "skill.mjs",
  ];

  // WHEN: The relevant production or test files are inspected.
  const actualModels = await moduleNames(path.join(toolRoot, "models"));

  // THEN: The discovered structure is compared with the architecture rule.
  assert.deepEqual(actualModels, expectedModels);
});

test("keeps shared compiler helpers in their own folder", async () => {
  // GIVEN: The expected compiler architecture rule is defined.
  const expectedHelpers = [
    "update-claude-plugin.mjs",
    "update-plugin-readme.mjs",
    "validate-markdown-links.mjs",
  ];

  // WHEN: The relevant production or test files are inspected.
  const actualHelpers = await moduleNames(path.join(toolRoot, "helpers"));

  // THEN: The discovered structure is compared with the architecture rule.
  assert.deepEqual(actualHelpers, expectedHelpers);
});

test("mirrors root modules and helpers in the unit-test tree", async () => {
  // GIVEN: The expected compiler architecture rule is defined.
  const expectedRootTests = [
    "plugin-compiler-cli.test.mjs",
    "skill-composer.test.mjs",
  ];
  const expectedHelperTests = [
    "update-claude-plugin.test.mjs",
    "update-plugin-readme.test.mjs",
    "validate-markdown-links.test.mjs",
  ];

  // WHEN: The relevant production or test files are inspected.
  const actualRootTests = await moduleNames(path.join(testRoot, "unit-tests"));
  const actualHelperTests = await moduleNames(
    path.join(testRoot, "unit-tests", "helpers"),
  );

  // THEN: The discovered structure is compared with the architecture rule.
  assert.deepEqual(actualRootTests, expectedRootTests);
  assert.deepEqual(actualHelperTests, expectedHelperTests);
});

test("keeps phase comments uppercase, explanatory, and consistently punctuated", async () => {
  // GIVEN: Every plugin compiler test source is available for convention checks.
  const testPaths = (await modulePaths(testRoot)).filter((relativePath) =>
    relativePath.endsWith(".test.mjs"),
  );
  const phaseComment = /^\s*\/\/ (GIVEN|WHEN|THEN):( .+[.!?]|)$/u;
  const phasePrefix = /^\s*\/\/ (?:Given|When|Then|GIVEN|WHEN|THEN)\b/u;
  const bullet = /^\s*\/\/ - .+[.!?]$/u;

  // WHEN: Phase comments are collected from every test file.
  const sources = await Promise.all(
    testPaths.map(async (relativePath) => ({
      relativePath,
      lines: (await readFile(path.join(testRoot, relativePath), "utf8")).split(
        "\n",
      ),
    })),
  );

  // THEN: Each phase uses an explanatory sentence or a punctuated bullet list.
  for (const { relativePath, lines } of sources) {
    for (const [index, line] of lines.entries()) {
      if (!phasePrefix.test(line)) continue;
      assert.match(line, phaseComment, `${relativePath}:${index + 1}`);
      if (!line.endsWith(":")) continue;

      let bulletIndex = index + 1;
      assert.match(
        lines[bulletIndex] ?? "",
        bullet,
        `${relativePath}:${bulletIndex + 1}`,
      );
      while (bullet.test(lines[bulletIndex] ?? "")) bulletIndex += 1;
    }
  }
});

test("keeps pure helpers free of filesystem imports", async () => {
  // GIVEN: The expected compiler architecture rule is defined.
  const helperNames = await moduleNames(path.join(toolRoot, "helpers"));

  // WHEN: The relevant production or test files are inspected.
  const helperSources = await Promise.all(
    helperNames.map((name) =>
      readFile(path.join(toolRoot, "helpers", name), "utf8"),
    ),
  );

  // THEN: The discovered structure is compared with the architecture rule.
  for (const [index, source] of helperSources.entries()) {
    const name = helperNames[index];
    assert.doesNotMatch(source, /(?:node:)?fs(?:\/promises)?/u, name);
  }
});

test("keeps Checker free of filesystem mutation APIs", async () => {
  // GIVEN: The expected compiler architecture rule is defined.
  const checkerPath = path.join(toolRoot, "plugin-checker.mjs");

  // WHEN: The relevant production or test files are inspected.
  const source = await readFile(checkerPath, "utf8");

  // THEN: The discovered structure is compared with the architecture rule.
  assert.doesNotMatch(
    source,
    /\b(?:writeFile|rename|unlink|mkdir|rm|rmdir|truncate|appendFile)\b/u,
  );
});
