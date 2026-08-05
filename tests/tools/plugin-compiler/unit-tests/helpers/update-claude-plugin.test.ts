import assert from "node:assert/strict";
import { describe, test } from "vitest";

import { updateClaudePlugin } from "../../../../../tools/plugin-compiler/helpers/update-claude-plugin.ts";
import { makePluginCatalogFixture } from "./test-fixtures/plugin-catalog-fixture.ts";

describe("updateClaudePlugin", () => {
  test("Claude updater renders exact host manifests without internal dependency metadata", () => {
    // GIVEN: A validated plugin catalog fixture is prepared.
    const plugin = makePluginCatalogFixture();

    // WHEN: The Claude plugin updater renders the catalog.
    const result = updateClaudePlugin({ plugin });

    // THEN: The rendered host manifests are verified.
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
    "./skills/visualize-html",
    "./skills/old-visualizer"
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
    assert.equal(result.marketplaceJson.includes("required_skills"), false);
  });
});
