import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { selectPublishedSkills } from "../../../../../tools/plugin-compiler/publication/select-published-skills.ts";
import { makeUnsafeMutablePluginSnapshotFixture } from "./test-fixtures/unsafe-mutable-plugin-snapshot-fixture.ts";

describe("selectPublishedSkills", () => {
  it("selects eligible roots in manifest order without mutating input", () => {
    // GIVEN: A manifest-ordered catalog covers every visibility and lifecycle case.
    const plugin = makeUnsafeMutablePluginSnapshotFixture();
    const originalSkillIds = plugin.skills.map((skill) => skill.id);

    // WHEN: Publication roots are selected.
    const publishedSkills = selectPublishedSkills(plugin.skills);

    // THEN: Only active or deprecated public roots remain in original order.
    assert.deepEqual(
      publishedSkills.map((skill) => skill.id),
      ["visualize-html", "old-visualizer"],
    );
    assert.deepEqual(
      plugin.skills.map((skill) => skill.id),
      originalSkillIds,
    );
  });
});
