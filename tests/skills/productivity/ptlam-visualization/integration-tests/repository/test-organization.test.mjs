import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

async function testFilesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return testFilesUnder(path);
      return entry.isFile() && entry.name.endsWith(".test.mjs") ? [path] : [];
    }),
  );
  return nested.flat();
}

test("test tree uses level-first ownership", async () => {
  // Given the approved test levels and their behavior owners.
  const rootDirectories = ["integration-tests", "unit-tests"];
  const requiredOwnershipDirectories = [
    "unit-tests/html",
    "unit-tests/mermaid",
    "integration-tests/html",
    "integration-tests/mermaid",
    "integration-tests/combined",
    "integration-tests/cross-capability",
    "integration-tests/repository",
    "integration-tests/test_doubles",
    "integration-tests/utils",
  ];

  // When the complete ptlam-visualization test tree is inspected.
  await Promise.all(
    requiredOwnershipDirectories.map((path) => access(join(testRoot, path))),
  );
  const actualRootDirectories = (
    await readdir(testRoot, { withFileTypes: true })
  )
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();
  const paths = await testFilesUnder(testRoot);
  const misplaced = paths
    .map((path) => relative(testRoot, path).split(sep))
    .filter((segments) => !rootDirectories.includes(segments[0]))
    .map((segments) => segments.join("/"));

  // Then levels are the only root classification and every test belongs to one.
  assert.deepEqual(actualRootDirectories, rootDirectories);
  assert.deepEqual(misplaced, []);
});

test("Given, When, and Then comments stay next to their executable phase", async () => {
  // Given every ptlam-visualization test and its phase-comment syntax.
  const paths = await testFilesUnder(testRoot);
  const phasePattern = /^\s*\/\/ (Given|When|Then)\b/u;

  // When consecutive phase comments are sought without executable code between them.
  const violations = [];
  for (const path of paths) {
    const lines = (await readFile(path, "utf8")).split("\n");
    let previousPhase;
    for (const [index, line] of lines.entries()) {
      const phase = line.match(phasePattern)?.[1];
      if (phase) {
        if (previousPhase) {
          violations.push(
            `${relative(testRoot, path)}:${previousPhase.line}-${index + 1} ${previousPhase.phase}->${phase}`,
          );
        }
        previousPhase = { line: index + 1, phase };
      } else if (line.trim() !== "" && !/^\s*\/\//u.test(line)) {
        previousPhase = undefined;
      }
    }
  }

  // Then no test groups phase descriptions ahead of their executable code.
  assert.deepEqual(violations, []);
});
