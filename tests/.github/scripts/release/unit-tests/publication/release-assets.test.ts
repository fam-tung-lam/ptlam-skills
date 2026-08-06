import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "vitest";

import { createReleaseAssetPlan } from "../../../../../../.github/scripts/release/publication/release-assets.ts";

describe("createReleaseAssetPlan", () => {
  it("resolves every durable release asset from the exact tag", () => {
    // GIVEN: A release asset directory and a semantic release tag.
    // WHEN: The complete publication plan is created.
    const plan = createReleaseAssetPlan("release-assets", "v1.2.3");

    // THEN: Coverage, plugin, and checksum paths form one immutable set.
    assert.deepEqual(plan, {
      coverageArchivePath: path.join(
        "release-assets",
        "test-coverage-v1.2.3.tar.gz",
      ),
      pluginArchivePath: path.join(
        "release-assets",
        "ptlam-skills-v1.2.3.tar.gz",
      ),
      checksumPath: path.join("release-assets", "SHA256SUMS"),
      paths: [
        path.join("release-assets", "test-coverage-v1.2.3.tar.gz"),
        path.join("release-assets", "ptlam-skills-v1.2.3.tar.gz"),
        path.join("release-assets", "SHA256SUMS"),
      ],
    });
    assert.equal(Object.isFrozen(plan), true);
    assert.equal(Object.isFrozen(plan.paths), true);
  });
});
