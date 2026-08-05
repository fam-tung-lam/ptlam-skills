import assert from "node:assert/strict";
import { format } from "prettier";
import { describe, test } from "vitest";
import {
  SkillStatus,
  SkillVisibility,
} from "../../../../../tools/plugin-compiler/models/skill.ts";
import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  renderPluginReadme,
} from "../../../../../tools/plugin-compiler/publication/render-plugin-readme.ts";
import { makeUnsafeMutablePluginSnapshotFixture } from "./test-fixtures/unsafe-mutable-plugin-snapshot-fixture.ts";

function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  assert.ok(item);
  return item;
}

describe("renderPluginReadme", () => {
  test("replaces only the ordered managed catalog region", () => {
    // GIVEN: A README surrounds one stale managed region with human-owned bytes.
    const plugin = makeUnsafeMutablePluginSnapshotFixture();
    const rootReadme =
      `prefix\r\n${ROOT_README_START_MARKER}\r\nstale\r\n` +
      `${ROOT_README_END_MARKER}\r\nsuffix`;

    // WHEN: The README is rendered from the publication catalog.
    const result = renderPluginReadme({ plugin, rootReadme });

    // THEN: Human bytes remain and eligible skills appear in manifest order.
    assert.equal(
      result.startsWith(`prefix\r\n${ROOT_README_START_MARKER}`),
      true,
    );
    assert.equal(result.endsWith(`${ROOT_README_END_MARKER}\r\nsuffix`), true);
    assert.ok(
      result.indexOf("`visualize-html`") < result.indexOf("`old-visualizer`"),
    );
    assert.doesNotMatch(result, /review-code-change|plan-task/u);
  });

  test("excludes archived public roots from the catalog", () => {
    // GIVEN: A public archived skill is appended to the catalog.
    const plugin = makeUnsafeMutablePluginSnapshotFixture();
    plugin.skills.push({
      id: "archived-skill",
      category_id: "engineering",
      description: "Archived skill.",
      visibility: SkillVisibility.Public,
      status: SkillStatus.Archived,
      required_skills: [],
      source_path: "plugin/skills/archived-skill",
      source_body: "# Archived skill\n",
      resources: [],
    });

    // WHEN: The managed README region is rendered.
    const result = renderPluginReadme({
      plugin,
      rootReadme: `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`,
    });

    // THEN: The archived skill remains absent from publication guidance.
    assert.doesNotMatch(result, /archived-skill/u);
  });

  test("renders Unicode tables accepted by the pinned formatter", async () => {
    // GIVEN: Catalog labels and descriptions contain wide Unicode characters.
    const plugin = makeUnsafeMutablePluginSnapshotFixture();
    itemAt(plugin.categories, 1).name = "工具";
    itemAt(plugin.skills, 2).description = "创建一个可移植的视觉作品。";

    // WHEN: The managed README region is rendered.
    const result = renderPluginReadme({
      plugin,
      rootReadme:
        `# Catalog\n\n${ROOT_README_START_MARKER}\nold\n` +
        `${ROOT_README_END_MARKER}\n`,
    });

    // THEN: The emitted table is already formatter-stable.
    assert.equal(await format(result, { parser: "markdown" }), result);
  });

  test.each([
    {
      name: "missing start",
      source: `${ROOT_README_END_MARKER}`,
      expected: /missing start marker/u,
    },
    {
      name: "missing end",
      source: `${ROOT_README_START_MARKER}`,
      expected: /missing end marker/u,
    },
    {
      name: "reversed markers",
      source: `${ROOT_README_END_MARKER}\n${ROOT_README_START_MARKER}`,
      expected: /managed markers are reversed/u,
    },
    {
      name: "nested markers",
      source:
        `${ROOT_README_START_MARKER}\n` +
        "<!-- BEGIN GENERATED:PLUGIN-CATALOG:OTHER -->\n" +
        "<!-- END GENERATED:PLUGIN-CATALOG:OTHER -->\n" +
        ROOT_README_END_MARKER,
      expected: /managed markers must not be nested/u,
    },
  ])("rejects $name", ({ source, expected }) => {
    // GIVEN: The README managed-region markers are structurally invalid.
    const plugin = makeUnsafeMutablePluginSnapshotFixture();

    // WHEN: Rendering attempts to replace that region.
    const render = () => renderPluginReadme({ plugin, rootReadme: source });

    // THEN: The invalid marker contract is rejected explicitly.
    assert.throws(render, expected);
  });

  test.each([
    { name: "control", description: "ANSI \u001b[31m" },
    { name: "format", description: "zero\u200bwidth" },
    { name: "surrogate", description: "bad\ud800value" },
  ])("rejects $name characters in generated cells", ({ description }) => {
    // GIVEN: One generated table cell contains an unsafe character.
    const plugin = makeUnsafeMutablePluginSnapshotFixture();
    itemAt(plugin.skills, 2).description = description;

    // WHEN: Rendering attempts to build the catalog table.
    const render = () =>
      renderPluginReadme({
        plugin,
        rootReadme: `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`,
      });

    // THEN: Unsafe Markdown content is rejected before publication.
    assert.throws(
      render,
      /must not contain control, format, or surrogate characters/u,
    );
  });
});
