import assert from "node:assert/strict";
import test from "node:test";

import { validateMarkdownLinks } from "../../../../../tools/plugin-compiler/helpers/validate-markdown-links.mjs";

test("accepts secure external, fragment, image, inline, and reference links", () => {
  // GIVEN: A Markdown source references existing local files and allowed remote targets.
  const source = [
    "[rules](references/rules.md#scope)",
    "![diagram](assets/flow.png)",
    "[secure](https://example.test/docs)",
    "[section](#usage)",
    "[guide][guide-ref]",
    "[guide-ref]: <references/guide.md>",
  ].join("\n");
  const sourceFiles = new Set([
    "SKILL.md",
    "references/rules.md",
    "references/guide.md",
    "assets/flow.png",
  ]);

  // WHEN: The source links are validated at the skill root.
  const diagnostics = validateMarkdownLinks({
    source,
    markdownPath: "SKILL.md",
    sourceFiles,
    skillPath: "plugin/skills/example",
  });

  // THEN: Every supported link resolves without a diagnostic.
  assert.deepEqual(diagnostics, []);
});

test("reports unsafe, malformed, escaping, and missing link targets in source order", () => {
  // GIVEN:
  // - A nested Markdown source contains each unsupported local-link failure mode.
  // - The isolated skill file set contains none of the referenced targets.
  const source = [
    "[insecure](http://example.test/docs)",
    "[malformed](%ZZ)",
    "[absolute](/tmp/rules.md)",
    "[home](~/rules.md)",
    "[escape](../../outside.md)",
    "[missing](missing.md)",
  ].join("\n");

  // WHEN: The nested source links are validated against the isolated file set.
  const diagnostics = validateMarkdownLinks({
    source,
    markdownPath: "references/topic.md",
    sourceFiles: new Set(["references/topic.md"]),
    skillPath: "plugin/skills/example",
  });

  // THEN: One precise diagnostic is returned for every invalid target.
  assert.deepEqual(diagnostics, [
    'plugin/skills/example/references/topic.md: unsupported link scheme in "http://example.test/docs"; only https links are allowed externally',
    'plugin/skills/example/references/topic.md: invalid encoded link "%ZZ"',
    'plugin/skills/example/references/topic.md: local link must be skill-relative: "/tmp/rules.md"',
    'plugin/skills/example/references/topic.md: local link must be skill-relative: "~/rules.md"',
    'plugin/skills/example/references/topic.md: local link escapes the skill: "../../outside.md"',
    'plugin/skills/example/references/topic.md: local link target does not exist: "missing.md"',
  ]);
});
