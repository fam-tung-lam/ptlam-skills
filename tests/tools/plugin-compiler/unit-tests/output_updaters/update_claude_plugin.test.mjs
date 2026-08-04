import assert from "node:assert/strict";
import test from "node:test";

import { updateClaudePlugin } from "../../../../../tools/plugin-compiler/output_updaters/update_claude_plugin.mjs";
import { makePluginCatalogFixture } from "./test-fixtures/plugin_catalog_fixture.mjs";

test("Claude updater renders exact host manifests without internal dependency metadata", () => {
  // Given
  const plugin = makePluginCatalogFixture();

  // When
  const result = updateClaudePlugin({ plugin });

  // Then
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
