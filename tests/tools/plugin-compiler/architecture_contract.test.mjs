import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const toolRoot = path.join(repositoryRoot, "tools/plugin-compiler");

async function moduleNames(directory) {
  return (await readdir(directory))
    .filter((name) => name.endsWith(".mjs"))
    .sort();
}

test("keeps only the four command components at the tool root", async () => {
  assert.deepEqual(await moduleNames(toolRoot), [
    "plugin_checker.mjs",
    "plugin_compiler_cli.mjs",
    "plugin_generator.mjs",
    "plugin_validator.mjs",
  ]);
});

test("keeps one explicit file per approved domain model", async () => {
  assert.deepEqual(await moduleNames(path.join(toolRoot, "models")), [
    "category.mjs",
    "plugin.mjs",
    "plugin_metadata.mjs",
    "skill.mjs",
    "skill_frontmatter.mjs",
  ]);
});

test("keeps Claude and README content updaters in their own folder", async () => {
  assert.deepEqual(await moduleNames(path.join(toolRoot, "output_updaters")), [
    "update_claude_plugin.mjs",
    "update_plugin_readme.mjs",
  ]);
});

test("keeps pure updaters free of filesystem imports", async () => {
  for (const name of await moduleNames(
    path.join(toolRoot, "output_updaters"),
  )) {
    const source = await readFile(
      path.join(toolRoot, "output_updaters", name),
      "utf8",
    );
    assert.doesNotMatch(source, /(?:node:)?fs(?:\/promises)?/u, name);
  }
});

test("keeps Checker free of filesystem mutation APIs", async () => {
  const source = await readFile(
    path.join(toolRoot, "plugin_checker.mjs"),
    "utf8",
  );
  assert.doesNotMatch(
    source,
    /\b(?:writeFile|rename|unlink|mkdir|rm|rmdir|truncate|appendFile)\b/u,
  );
});
