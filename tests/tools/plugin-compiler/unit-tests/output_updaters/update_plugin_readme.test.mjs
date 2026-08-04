import assert from "node:assert/strict";
import test from "node:test";

import { format } from "prettier";

import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  SKILLS_README_END_MARKER,
  SKILLS_README_START_MARKER,
  updatePluginReadme,
} from "../../../../../tools/plugin-compiler/output_updaters/update_plugin_readme.mjs";
import { makePluginCatalogFixture } from "./test-fixtures/plugin_catalog_fixture.mjs";

test("README updater replaces only ordered managed regions", () => {
  // Given
  const plugin = makePluginCatalogFixture();
  const rootReadme =
    `prefix\r\n${ROOT_README_START_MARKER}\r\nstale\r\n` +
    `${ROOT_README_END_MARKER}\r\nsuffix`;
  const skillsReadme =
    `skills prefix\r\n${SKILLS_README_START_MARKER}\r\nstale\r\n` +
    `${SKILLS_README_END_MARKER}\r\nskills suffix`;

  // When
  const result = updatePluginReadme({ plugin, rootReadme, skillsReadme });

  // Then
  assert.equal(
    result.rootReadme,
    `prefix\r\n${ROOT_README_START_MARKER}

## Available skills

| Skill            | Category     | Purpose                          |
| ---------------- | ------------ | -------------------------------- |
| \`visualize-html\` | Productivity | Create a polished HTML artifact. |

## Test collection

| Skill                | Category     | Purpose                    |
| -------------------- | ------------ | -------------------------- |
| \`test-review-change\` | Engineering  | Review a small change.     |
| \`plan-task\`          | Productivity | Turn one goal into a plan. |

The test skills are intentionally simple. They verify collection discovery,
installation, metadata, and invocation independently from the available skills.

${ROOT_README_END_MARKER}\r\nsuffix`,
  );
  assert.equal(
    result.skillsReadme,
    `skills prefix\r\n${SKILLS_README_START_MARKER}

## Initial categories

| Category       | Skills                        |
| -------------- | ----------------------------- |
| \`engineering\`  | \`test-review-change\`          |
| \`productivity\` | \`visualize-html\`, \`plan-task\` |
| \`empty\`        | —                             |

${SKILLS_README_END_MARKER}\r\nskills suffix`,
  );
});

test("README updater emits pinned-Prettier-compatible Unicode tables", async () => {
  // Given
  const plugin = makePluginCatalogFixture();
  plugin.categories[0].title = "工具";
  plugin.skills[0].summary = "检查一个变化。";
  const rootReadme =
    `# Catalog\n\n${ROOT_README_START_MARKER}\nold\n` +
    `${ROOT_README_END_MARKER}\n`;
  const skillsReadme =
    `# Skills\n\n${SKILLS_README_START_MARKER}\nold\n` +
    `${SKILLS_README_END_MARKER}\n`;

  // When
  const result = updatePluginReadme({ plugin, rootReadme, skillsReadme });

  // Then
  assert.equal(
    await format(result.rootReadme, { parser: "markdown" }),
    result.rootReadme,
  );
  assert.equal(
    await format(result.skillsReadme, { parser: "markdown" }),
    result.skillsReadme,
  );
});

test("README updater rejects missing, duplicate, reversed, nested, and reserved markers", () => {
  // Given
  const plugin = makePluginCatalogFixture();
  const validRoot = `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`;
  const validSkills = `${SKILLS_README_START_MARKER}\nold\n${SKILLS_README_END_MARKER}`;

  // When
  const update = (rootReadme) =>
    updatePluginReadme({ plugin, rootReadme, skillsReadme: validSkills });

  // Then
  assert.throws(
    () => update(validRoot.replace(ROOT_README_START_MARKER, "")),
    /README\.md: missing start marker/,
  );
  assert.throws(
    () => update(`${validRoot}\n${ROOT_README_START_MARKER}`),
    /README\.md: duplicate start marker/,
  );
  assert.throws(
    () => update(`${ROOT_README_END_MARKER}\n${ROOT_README_START_MARKER}`),
    /README\.md: managed markers are reversed/,
  );
  assert.throws(
    () =>
      update(
        `${ROOT_README_START_MARKER}\n${SKILLS_README_START_MARKER}\n` +
          `${SKILLS_README_END_MARKER}\n${ROOT_README_END_MARKER}`,
      ),
    /README\.md: managed markers must not be nested/,
  );

  plugin.skills[0].summary =
    "Reserved <!-- BEGIN GENERATED:PLUGIN-CATALOG:OTHER --> marker.";
  assert.throws(
    () => update(validRoot),
    /generated content contains a reserved marker/,
  );
});

test("README updater rejects characters that can corrupt generated tables", () => {
  // Given
  const validRoot = `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`;
  const validSkills = `${SKILLS_README_START_MARKER}\nold\n${SKILLS_README_END_MARKER}`;
  const unsafeSummaries = [
    "ANSI \u001b[31m",
    "zero\u200bwidth",
    "bad\ud800value",
  ];

  // When
  const updateWithSummary = (summary) => {
    const plugin = makePluginCatalogFixture();
    plugin.skills[0].summary = summary;
    return () =>
      updatePluginReadme({
        plugin,
        rootReadme: validRoot,
        skillsReadme: validSkills,
      });
  };

  // Then
  for (const summary of unsafeSummaries) {
    assert.throws(
      updateWithSummary(summary),
      /must not contain control, format, or surrogate characters/,
    );
  }
});
