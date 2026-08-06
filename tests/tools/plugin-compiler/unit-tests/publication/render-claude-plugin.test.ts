import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { renderClaudePluginArtifacts } from "../../../../../tools/plugin-compiler/publication/render-claude-plugin.ts";
import { makeUnsafeMutablePluginSnapshotFixture } from "./test-fixtures/unsafe-mutable-plugin-snapshot-fixture.ts";

describe("renderClaudePluginArtifacts", () => {
  it("renders exact host manifests without internal dependency metadata", () => {
    // GIVEN: A validated-looking catalog contains public and internal skills.
    const plugin = makeUnsafeMutablePluginSnapshotFixture();

    // WHEN: Claude host metadata is rendered.
    const result = renderClaudePluginArtifacts({ plugin });

    // THEN: Host manifests contain only publication metadata and public roots.
    assert.deepEqual(JSON.parse(result.pluginJson), {
      name: "fixture-skills",
      version: "1.2.3",
      description: "Fixture plugin description.",
      author: {
        name: "Fixture Owner",
        email: "owner@example.test",
        url: "https://example.test",
      },
      homepage: "https://example.test/readme",
      repository: "https://example.test/repository",
      license: "MIT",
      keywords: ["agent-skills", "fixtures"],
      skills: ["./skills/visualize-html", "./skills/old-visualizer"],
    });
    assert.equal(result.pluginJson.endsWith("\n"), true);
    assert.equal(result.marketplaceJson.endsWith("\n"), true);
    assert.equal(result.marketplaceJson.includes('"version"'), false);
    assert.equal(result.marketplaceJson.includes("required_skills"), false);
  });
});
