import assert from "node:assert/strict";
import test from "node:test";

import { format } from "prettier";

import { updateClaudePlugin } from "../../../tools/plugin-compiler/output_updaters/update_claude_plugin.mjs";
import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  SKILLS_README_END_MARKER,
  SKILLS_README_START_MARKER,
  updatePluginReadme,
} from "../../../tools/plugin-compiler/output_updaters/update_plugin_readme.mjs";
import { makeOutputPlugin } from "./output_test_fixture.mjs";

test("Claude updater renders exact deterministic host artifacts", () => {
  const plugin = makeOutputPlugin();
  const result = updateClaudePlugin({ plugin });

  assert.equal(
    result.pluginJson,
    `{
  "name": "fixture-skills",
  "version": "1.2.3",
  "description": "Fixture plugin description.",
  "author": {
    "name": "Fixture Owner",
    "email": "owner@example.test",
    "url": "https://example.test"
  },
  "homepage": "https://example.test/readme",
  "repository": "https://example.test/repository",
  "license": "MIT",
  "keywords": [
    "agent-skills",
    "fixtures"
  ],
  "skills": [
    "./skills/engineering/test-review-change",
    "./skills/productivity/plan-task",
    "./skills/productivity/visualize-html"
  ]
}
`,
  );
  assert.equal(
    result.marketplaceJson,
    `{
  "name": "fixture",
  "owner": {
    "name": "Fixture Owner",
    "email": "owner@example.test",
    "url": "https://example.test"
  },
  "description": "Fixture marketplace.",
  "plugins": [
    {
      "name": "fixture-skills",
      "source": "./",
      "description": "Installable fixture skills.",
      "category": "development",
      "keywords": [
        "agent-skills",
        "testing"
      ]
    }
  ]
}
`,
  );
  assert.equal(result.marketplaceJson.includes('"version"'), false);
  assert.equal(result.marketplaceJson.includes('"dependencies"'), false);
  assert.equal(result.marketplaceJson.includes("required_skill_ids"), false);
});

test("README updater preserves outside bytes and renders ordered exact regions", () => {
  const plugin = makeOutputPlugin();
  const rootReadme =
    `prefix\r\n${ROOT_README_START_MARKER}\r\nstale\r\n` +
    `${ROOT_README_END_MARKER}\r\nsuffix`;
  const skillsReadme =
    `skills prefix\r\n${SKILLS_README_START_MARKER}\r\nstale\r\n` +
    `${SKILLS_README_END_MARKER}\r\nskills suffix`;

  const result = updatePluginReadme({ plugin, rootReadme, skillsReadme });

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

test("README updater produces pinned-Prettier-compatible Unicode tables", async () => {
  const plugin = makeOutputPlugin();
  plugin.categories[0].title = "工具";
  plugin.skills[0].summary = "检查一个变化。";
  const rootReadme =
    `# Catalog\n\n${ROOT_README_START_MARKER}\nold\n` +
    `${ROOT_README_END_MARKER}\n`;
  const skillsReadme =
    `# Skills\n\n${SKILLS_README_START_MARKER}\nold\n` +
    `${SKILLS_README_END_MARKER}\n`;

  const result = updatePluginReadme({ plugin, rootReadme, skillsReadme });

  assert.equal(
    await format(result.rootReadme, { parser: "markdown" }),
    result.rootReadme,
  );
  assert.equal(
    await format(result.skillsReadme, { parser: "markdown" }),
    result.skillsReadme,
  );
});

test("README updater rejects invalid markers and reserved generated markers", () => {
  const plugin = makeOutputPlugin();
  const validRoot = `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`;
  const validSkills = `${SKILLS_README_START_MARKER}\nold\n${SKILLS_README_END_MARKER}`;

  assert.throws(
    () =>
      updatePluginReadme({
        plugin,
        rootReadme: validRoot.replace(ROOT_README_START_MARKER, ""),
        skillsReadme: validSkills,
      }),
    /README\.md: missing start marker/,
  );
  assert.throws(
    () =>
      updatePluginReadme({
        plugin,
        rootReadme: `${validRoot}\n${ROOT_README_START_MARKER}`,
        skillsReadme: validSkills,
      }),
    /README\.md: duplicate start marker/,
  );
  assert.throws(
    () =>
      updatePluginReadme({
        plugin,
        rootReadme: `${ROOT_README_END_MARKER}\n${ROOT_README_START_MARKER}`,
        skillsReadme: validSkills,
      }),
    /README\.md: managed markers are reversed/,
  );
  assert.throws(
    () =>
      updatePluginReadme({
        plugin,
        rootReadme:
          `${ROOT_README_START_MARKER}\n${SKILLS_README_START_MARKER}\n` +
          `${SKILLS_README_END_MARKER}\n${ROOT_README_END_MARKER}`,
        skillsReadme: validSkills,
      }),
    /README\.md: managed markers must not be nested/,
  );

  plugin.skills[0].summary =
    "Reserved <!-- BEGIN GENERATED:PLUGIN-CATALOG:OTHER --> marker.";
  assert.throws(
    () =>
      updatePluginReadme({
        plugin,
        rootReadme: validRoot,
        skillsReadme: validSkills,
      }),
    /generated content contains a reserved marker/,
  );
});

test("README updater rejects unsafe table characters defensively", () => {
  const validRoot = `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`;
  const validSkills = `${SKILLS_README_START_MARKER}\nold\n${SKILLS_README_END_MARKER}`;

  for (const summary of [
    "ANSI \u001b[31m",
    "zero\u200bwidth",
    "bad\ud800value",
  ]) {
    const plugin = makeOutputPlugin();
    plugin.skills[0].summary = summary;
    assert.throws(
      () =>
        updatePluginReadme({
          plugin,
          rootReadme: validRoot,
          skillsReadme: validSkills,
        }),
      /must not contain control, format, or surrogate characters/,
    );
  }
});
