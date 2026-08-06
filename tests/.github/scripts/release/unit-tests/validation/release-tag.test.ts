import assert from "node:assert/strict";
import { describe, test } from "vitest";

import { parseReleaseTag } from "../../../../../../.github/scripts/release/validation/release-tag.ts";

describe("parseReleaseTag", () => {
  test.each([
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

  test.each(["0.1.0", "v1.2", "v1.2.3/unsafe", "vx.y.z"])(
    "rejects unsafe release tag %s",
    (value) => {
      // GIVEN: A tag that is not v-prefixed semantic versioning.
      // WHEN: The shared release identity is parsed.
      const parse = () => parseReleaseTag(value);

      // THEN: It cannot become a path or GitHub release identifier.
      assert.throws(parse, /must use the form v<semantic-version>/u);
    },
  );

  test("requires the tag to equal the expected plugin version", () => {
    // GIVEN: A semantic tag for a different plugin version.
    // WHEN: It is parsed against the manifest version.
    const parse = () => parseReleaseTag("v1.2.4", "1.2.3");

    // THEN: The release is rejected before any artifact is built.
    assert.throws(parse, /must equal plugin version v1\.2\.3/u);
  });
});
