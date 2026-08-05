import assert from "node:assert/strict";
import { describe, test } from "vitest";

import { REQUIRED_SKILLS_MARKER } from "../../../../../tools/plugin-compiler/models/skill.ts";
import { createExpectedPublication } from "../../../../../tools/plugin-compiler/publication/publication-plan.ts";
import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
} from "../../../../../tools/plugin-compiler/publication/render-plugin-readme.ts";
import { makeUnsafeMutablePluginSnapshotFixture } from "./test-fixtures/unsafe-mutable-plugin-snapshot-fixture.ts";

describe("publication plan", () => {
  test("normalizes expected files to bytes and declares the skills directory", async () => {
    // GIVEN: Renderable publication input contains text and resource bytes.
    const plugin = makeUnsafeMutablePluginSnapshotFixture();
    for (const skill of plugin.skills) {
      skill.source_body = `# ${skill.id}\n\n${REQUIRED_SKILLS_MARKER}\n`;
    }
    plugin.skills[2]?.resources.push({
      path: "references/example.bin",
      content: Buffer.from([0, 255, 1]),
    });

    // WHEN: The expected publication is constructed.
    const expected = await createExpectedPublication({
      plugin,
      rootReadme: Buffer.from(
        `${ROOT_README_START_MARKER}\nold\n${ROOT_README_END_MARKER}`,
      ),
    });

    // THEN: Every expected file is bytes and required empty-capable directories are explicit.
    assert.equal([...expected.files.values()].every(Buffer.isBuffer), true);
    assert.deepEqual([...expected.directories], ["skills"]);
    assert.deepEqual(
      expected.files.get("skills/visualize-html/references/example.bin"),
      Buffer.from([0, 255, 1]),
    );
  });
});
