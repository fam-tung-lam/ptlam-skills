import assert from "node:assert/strict";
import { describe, test } from "vitest";

import { validateMarkdownLinks } from "../../../../../tools/plugin-compiler/validation/validate-markdown-links.ts";

describe("validateMarkdownLinks", () => {
  test("accepts actual secure external, fragment, image, inline, and reference destinations", () => {
    // GIVEN: A Markdown source references existing local files and allowed remote targets.
    const source = [
      "[rules](references/rules.md#scope)",
      "![diagram](assets/flow.png)",
      "[secure](HTTPS://example.test/docs)",
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
    const errors = validateMarkdownLinks({
      source,
      markdownPath: "SKILL.md",
      sourceFiles,
      skillPath: "plugin/skills/example",
    });

    // THEN: Every supported link resolves without a diagnostic.
    assert.deepEqual(errors, []);
  });

  test("ignores link examples in code escaped syntax and comments", () => {
    // GIVEN: Non-link Markdown constructs contain missing-looking destinations.
    const source = [
      "```markdown",
      "[fenced](missing-fenced.md)",
      "```",
      "`[inline](missing-inline.md)`",
      String.raw`\[escaped](missing-escaped.md)`,
      "<!-- [comment](missing-comment.md) -->",
    ].join("\n");

    // WHEN: The Markdown AST destinations are validated.
    const errors = validateMarkdownLinks({
      source,
      markdownPath: "SKILL.md",
      sourceFiles: new Set(["SKILL.md"]),
      skillPath: "plugin/skills/example",
    });

    // THEN: Syntax examples do not become false missing-link errors.
    assert.deepEqual(errors, []);
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
    const errors = validateMarkdownLinks({
      source,
      markdownPath: "references/topic.md",
      sourceFiles: new Set(["references/topic.md"]),
      skillPath: "plugin/skills/example",
    });

    // THEN: One precise diagnostic is returned for every invalid target.
    assert.deepEqual(errors, [
      'plugin/skills/example/references/topic.md: unsupported link scheme in "http://example.test/docs"; only https links are allowed externally',
      'plugin/skills/example/references/topic.md: invalid encoded link "%ZZ"',
      'plugin/skills/example/references/topic.md: local link must be skill-relative: "/tmp/rules.md"',
      'plugin/skills/example/references/topic.md: local link must be skill-relative: "~/rules.md"',
      'plugin/skills/example/references/topic.md: local link escapes the skill: "../../outside.md"',
      'plugin/skills/example/references/topic.md: local link target does not exist: "missing.md"',
    ]);
  });
});
