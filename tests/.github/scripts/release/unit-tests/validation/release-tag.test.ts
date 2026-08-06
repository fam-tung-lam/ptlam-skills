import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  compareReleaseTags,
  parseReleaseTag,
} from "../../../../../../.github/scripts/release/validation/release-tag.ts";

describe("parseReleaseTag", () => {
  it.each([
    ["v0.1.0", "0.1.0", false],
    ["v2.4.1-beta.2", "2.4.1-beta.2", true],
    ["v2.4.1+build.7", "2.4.1+build.7", false],
    ["v2.4.1-beta.2+build.7", "2.4.1-beta.2+build.7", true],
  ])(
    "parses semantic release tag %s",
    (value, expectedVersion, expectedPrerelease) => {
      // GIVEN: A semantic plugin release tag.
      // WHEN: The shared release identity is parsed.
      const tag = parseReleaseTag(value);

      // THEN: Its exact version and prerelease state are immutable.
      assert.deepEqual(tag, {
        value,
        version: expectedVersion,
        prerelease: expectedPrerelease,
      });
      assert.equal(Object.isFrozen(tag), true);
    },
  );

  it.each(["0.1.0", "v1.2", "v1.2.3/unsafe", "vx.y.z"])(
    "rejects unsafe release tag %s",
    (value) => {
      // GIVEN: A tag that is not v-prefixed semantic versioning.
      // WHEN: The shared release identity is parsed.
      const parse = () => parseReleaseTag(value);

      // THEN: It cannot become a path or GitHub release identifier.
      assert.throws(parse, /must use the form v<semantic-version>/u);
    },
  );

  it("requires the tag to equal the expected plugin version", () => {
    // GIVEN: A semantic tag for a different plugin version.
    // WHEN: It is parsed against the manifest version.
    const parse = () => parseReleaseTag("v1.2.4", "1.2.3");

    // THEN: The release is rejected before any artifact is built.
    assert.throws(parse, /must equal plugin version v1\.2\.3/u);
  });

  it.each([
    ["v1.0.0-alpha", "v1.0.0-alpha.1", -1],
    ["v1.0.0-alpha.1", "v1.0.0-alpha.beta", -1],
    ["v1.0.0-beta.2", "v1.0.0-beta.11", -1],
    ["v1.0.0-rc.1", "v1.0.0", -1],
    ["v1.9.9", "v2.0.0", -1],
    ["v2.0.0+build.1", "v2.0.0+build.2", 0],
    ["v10.0.0", "v2.0.0", 1],
  ] as const)(
    "orders %s against %s by semantic precedence",
    (left, right, expected) => {
      // GIVEN: Two validated release tags with known Semantic Version order.
      const leftTag = parseReleaseTag(left);
      const rightTag = parseReleaseTag(right);

      // WHEN: Their release precedence is compared.
      const result = compareReleaseTags(leftTag, rightTag);

      // THEN: Numeric, prerelease, and build metadata rules are preserved.
      assert.equal(result, expected);
    },
  );
});
