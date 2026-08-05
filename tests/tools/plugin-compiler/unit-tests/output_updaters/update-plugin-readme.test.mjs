import assert from "node:assert/strict";
import test from "node:test";

import { format } from "prettier";

import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  SKILLS_README_END_MARKER,
  SKILLS_README_START_MARKER,
  updatePluginReadme,
} from "../../../../../tools/plugin-compiler/output_updaters/update-plugin-readme.mjs";
import { makePluginCatalogFixture } from "./test-fixtures/plugin-catalog-fixture.mjs";

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

| Skill            | Category     | Description                      | Status                                                                       | Replacement      |
| ---------------- | ------------ | -------------------------------- | ---------------------------------------------------------------------------- | ---------------- |
| \`visualize-html\` | Productivity | Create a polished HTML artifact. | Active                                                                       | —                |
| \`old-visualizer\` | Productivity | Create legacy visual artifacts.  | Deprecated — Superseded by visualize-html. Use the replacement for new work. | \`visualize-html\` |

${ROOT_README_END_MARKER}\r\nsuffix`,
  );
  assert.equal(
    result.skillsReadme,
    `skills prefix\r\n${SKILLS_README_START_MARKER}

## Categories

| Category       | Skills                             |
| -------------- | ---------------------------------- |
| \`engineering\`  | —                                  |
| \`productivity\` | \`visualize-html\`, \`old-visualizer\` |
| \`empty\`        | —                                  |

${SKILLS_README_END_MARKER}\r\nskills suffix`,
  );
});

test("README updater excludes internal draft and archived skills", () => {
  // Given
  const plugin = makePluginCatalogFixture();
  plugin.skills.push({
    id: "archived-skill",
    category_id: "engineering",
    description: "Archived skill.",
    visibility: "public",
    status: "archived",
    required_skills: [],
  });
  const rootReadme = `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`;
  const skillsReadme = `${SKILLS_README_START_MARKER}\nold\n${SKILLS_README_END_MARKER}`;

  // When
  const result = updatePluginReadme({ plugin, rootReadme, skillsReadme });

  // Then
  assert.match(result.rootReadme, /## Available skills/u);
  assert.doesNotMatch(result.rootReadme, /review-code-change/u);
  assert.doesNotMatch(result.rootReadme, /plan-task/u);
  assert.doesNotMatch(result.rootReadme, /archived-skill/u);
});

test("README updater emits pinned-Prettier-compatible Unicode tables", async () => {
  // Given
  const plugin = makePluginCatalogFixture();
  plugin.categories[1].name = "工具";
  plugin.skills[2].description = "创建一个可移植的视觉作品。";
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

  plugin.skills[2].description =
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
  const unsafeDescriptions = [
    "ANSI \u001b[31m",
    "zero\u200bwidth",
    "bad\ud800value",
  ];

  // When
  const updateWithDescription = (description) => {
    const plugin = makePluginCatalogFixture();
    plugin.skills[2].description = description;
    return () =>
      updatePluginReadme({
        plugin,
        rootReadme: validRoot,
        skillsReadme: validSkills,
      });
  };

  // Then
  for (const description of unsafeDescriptions) {
    assert.throws(
      updateWithDescription(description),
      /must not contain control, format, or surrogate characters/,
    );
  }
});
