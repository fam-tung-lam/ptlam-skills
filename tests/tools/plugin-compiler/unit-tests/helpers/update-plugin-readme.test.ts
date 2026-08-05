import assert from "node:assert/strict";
import { format } from "prettier";
import { describe, test } from "vitest";

import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  SKILLS_README_END_MARKER,
  SKILLS_README_START_MARKER,
  updatePluginReadme,
} from "../../../../../tools/plugin-compiler/helpers/update-plugin-readme.ts";
import { makePluginCatalogFixture } from "./test-fixtures/plugin-catalog-fixture.ts";

function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  assert.ok(item);
  return item;
}

describe("updatePluginReadme", () => {
  test("README updater replaces only ordered managed regions", () => {
    // GIVEN: A plugin catalog and managed README sources are prepared.
    const plugin = makePluginCatalogFixture();
    const rootReadme =
      `prefix\r\n${ROOT_README_START_MARKER}\r\nstale\r\n` +
      `${ROOT_README_END_MARKER}\r\nsuffix`;
    const skillsReadme =
      `skills prefix\r\n${SKILLS_README_START_MARKER}\r\nstale\r\n` +
      `${SKILLS_README_END_MARKER}\r\nskills suffix`;

    // WHEN: The README updater renders the managed regions.
    const result = updatePluginReadme({ plugin, rootReadme, skillsReadme });

    // THEN: The complete README outputs or reported failures are verified.
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
    // GIVEN: A plugin catalog and managed README sources are prepared.
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

    // WHEN: The README updater renders the managed regions.
    const result = updatePluginReadme({ plugin, rootReadme, skillsReadme });

    // THEN: The complete README outputs or reported failures are verified.
    assert.match(result.rootReadme, /## Available skills/u);
    assert.doesNotMatch(result.rootReadme, /review-code-change/u);
    assert.doesNotMatch(result.rootReadme, /plan-task/u);
    assert.doesNotMatch(result.rootReadme, /archived-skill/u);
  });

  test("README updater emits pinned-Prettier-compatible Unicode tables", async () => {
    // GIVEN: A plugin catalog and managed README sources are prepared.
    const plugin = makePluginCatalogFixture();
    itemAt(plugin.categories, 1).name = "工具";
    itemAt(plugin.skills, 2).description = "创建一个可移植的视觉作品。";
    const rootReadme =
      `# Catalog\n\n${ROOT_README_START_MARKER}\nold\n` +
      `${ROOT_README_END_MARKER}\n`;
    const skillsReadme =
      `# Skills\n\n${SKILLS_README_START_MARKER}\nold\n` +
      `${SKILLS_README_END_MARKER}\n`;

    // WHEN: The README updater renders the managed regions.
    const result = updatePluginReadme({ plugin, rootReadme, skillsReadme });

    // THEN: The complete README outputs or reported failures are verified.
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
    // GIVEN: A plugin catalog and managed README sources are prepared.
    const plugin = makePluginCatalogFixture();
    const validRoot = `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`;
    const validSkills = `${SKILLS_README_START_MARKER}\nold\n${SKILLS_README_END_MARKER}`;

    // WHEN: The README updater renders the managed regions.
    const update = (rootReadme: string) =>
      updatePluginReadme({ plugin, rootReadme, skillsReadme: validSkills });

    // THEN: The complete README outputs or reported failures are verified.
    assert.throws(
      () => update(validRoot.replace(ROOT_README_START_MARKER, "")),
      /README\.md: missing start marker/,
    );
    assert.throws(
      () => update(validRoot.replace(ROOT_README_END_MARKER, "")),
      /README\.md: missing end marker/,
    );
    assert.throws(
      () => update(`${validRoot}\n${ROOT_README_START_MARKER}`),
      /README\.md: duplicate start marker/,
    );
    assert.throws(
      () => update(`${validRoot}\n${ROOT_README_END_MARKER}`),
      /README\.md: duplicate end marker/,
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

    itemAt(plugin.skills, 2).description =
      "Reserved <!-- BEGIN GENERATED:PLUGIN-CATALOG:OTHER --> marker.";
    assert.throws(
      () => update(validRoot),
      /generated content contains a reserved marker/,
    );
  });

  test.each([
    { name: "ANSI control characters", description: "ANSI \u001b[31m" },
    { name: "zero-width format characters", description: "zero\u200bwidth" },
    { name: "unpaired surrogates", description: "bad\ud800value" },
  ])("rejects $name in generated tables", ({ description }) => {
    // GIVEN: A plugin catalog contains one unsafe table-cell description.
    const validRoot = `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`;
    const validSkills = `${SKILLS_README_START_MARKER}\nold\n${SKILLS_README_END_MARKER}`;
    const plugin = makePluginCatalogFixture();
    itemAt(plugin.skills, 2).description = description;

    // WHEN: The README updater attempts to render the managed regions.
    const update = () =>
      updatePluginReadme({
        plugin,
        rootReadme: validRoot,
        skillsReadme: validSkills,
      });

    // THEN: The unsafe character is rejected explicitly.
    assert.throws(
      update,
      /must not contain control, format, or surrogate characters/,
    );
  });
});
