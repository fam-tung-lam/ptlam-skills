import assert from "node:assert/strict";
import { describe, test } from "vitest";

import {
  comparePublications,
  PluginPublicationDriftReason,
} from "../../../../../tools/plugin-compiler/publication/compare-publications.ts";

describe("comparePublications", () => {
  test("compares existence and bytes into deterministic target-level differences", () => {
    // GIVEN: Expected and current state differ by directory, missing, stale, and extra files.
    const expected = {
      files: new Map([
        ["skills/中.md", Buffer.from("expected")],
        ["README.md", Buffer.from("expected")],
        ["skills/z.md", Buffer.from("same")],
      ]),
      directories: new Set(["skills"]),
    };
    const current = {
      files: new Map([
        ["skills/ä.md", Buffer.from("extra")],
        ["README.md", Buffer.from("stale")],
        ["skills/z.md", Buffer.from("same")],
      ]),
      directories: new Set<string>(),
    };

    // WHEN: The pure publication comparator runs.
    const difference = comparePublications(expected, current);

    // THEN: Drift uses code-point order and rolls up to managed targets.
    assert.deepEqual(difference.drift, [
      {
        path: "README.md",
        reason: PluginPublicationDriftReason.ContentDiffers,
      },
      {
        path: "skills",
        reason: PluginPublicationDriftReason.MissingDirectory,
      },
      {
        path: "skills/ä.md",
        reason: PluginPublicationDriftReason.UnexpectedFile,
      },
      {
        path: "skills/中.md",
        reason: PluginPublicationDriftReason.MissingFile,
      },
    ]);
    assert.deepEqual(difference.changedTargets, ["README.md", "skills"]);
    assert.deepEqual(difference.unchangedTargets, [
      ".claude-plugin/plugin.json",
      ".claude-plugin/marketplace.json",
    ]);
  });
});
