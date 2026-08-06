import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "vitest";

import type {
  CommandOptions,
  CommandResult,
  CommandRunner,
} from "../../../../../.github/scripts/release/command-runner.ts";
import { ReleaseAutomation } from "../../../../../.github/scripts/release/release-automation.ts";

const releaseCommit = "1111111111111111111111111111111111111111";
const annotatedTag = "2222222222222222222222222222222222222222";

class ScriptedCommandRunner implements CommandRunner {
  readonly calls: {
    readonly command: string;
    readonly args: readonly string[];
  }[] = [];
  readonly #results: CommandResult[];

  constructor(results: readonly CommandResult[]) {
    this.#results = [...results];
  }

  run(
    command: string,
    args: readonly string[],
    _options?: CommandOptions,
  ): CommandResult {
    this.calls.push({ command, args });
    const result = this.#results.shift();
    if (result === undefined) throw new Error("Unexpected release command.");
    return result;
  }
}

function success(stdout = ""): CommandResult {
  return { status: 0, stdout, stderr: "" };
}

function releaseState(
  draft: boolean,
  immutable: boolean,
  assets: readonly {
    readonly name: string;
    readonly digest: string | null;
  }[] = [],
): CommandResult {
  return success(JSON.stringify({ assets, draft, immutable }));
}

function verificationResults(): readonly CommandResult[] {
  return [success("true"), success(), success(), success(), success()];
}

function publishRequest(assetsDirectory = "release-assets") {
  return {
    approvalEnvironment: "release",
    assetsDirectory,
    expectedCommit: releaseCommit,
    repository: "owner/repository",
    tag: "v1.2.3",
  } as const;
}

describe("ReleaseAutomation", () => {
  test("creates the approved tag and publishes complete verified assets", async () => {
    // GIVEN: A protected approval environment and no existing tag or release.
    const commands = new ScriptedCommandRunner([
      success("1"),
      { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" },
      { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" },
      success(),
      success(`commit\t${releaseCommit}`),
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: The public release workflow is executed.
    const result = await automation.publishRelease(publishRequest());

    // THEN: GitHub creates the tag at the approved commit before verification.
    assert.deepEqual(commands.calls[3]?.args, [
      "release",
      "create",
      "v1.2.3",
      "--generate-notes",
      "--fail-on-no-commits",
      "--target",
      releaseCommit,
      "--repo",
      "owner/repository",
      "release-assets/test-coverage-v1.2.3.tar.gz",
      "release-assets/ptlam-skills-v1.2.3.tar.gz",
      "release-assets/SHA256SUMS",
    ]);
    assert.deepEqual(
      commands.calls.slice(-5).map((call) => call.args.slice(0, 3)),
      [
        ["release", "view", "v1.2.3"],
        ["release", "verify", "v1.2.3"],
        ["release", "verify-asset", "v1.2.3"],
        ["release", "verify-asset", "v1.2.3"],
        ["release", "verify-asset", "v1.2.3"],
      ],
    );
    assert.equal(result.tag, "v1.2.3");
    assert.equal(result.assetPaths.length, 3);
    assert.equal(Object.isFrozen(result), true);
  });

  test("publishes a prerelease without marking it latest", async () => {
    // GIVEN: An approved prerelease candidate with no tag or GitHub Release.
    const commands = new ScriptedCommandRunner([
      success("1"),
      { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" },
      { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" },
      success(),
      success(`commit\t${releaseCommit}`),
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication runs through the public release facade.
    await automation.publishRelease({
      ...publishRequest(),
      tag: "v2.0.0-rc.1",
    });

    // THEN: GitHub receives prerelease controls before the immutable assets.
    assert.deepEqual(commands.calls[3]?.args, [
      "release",
      "create",
      "v2.0.0-rc.1",
      "--generate-notes",
      "--fail-on-no-commits",
      "--target",
      releaseCommit,
      "--prerelease",
      "--latest=false",
      "--repo",
      "owner/repository",
      "release-assets/test-coverage-v2.0.0-rc.1.tar.gz",
      "release-assets/ptlam-skills-v2.0.0-rc.1.tar.gz",
      "release-assets/SHA256SUMS",
    ]);
  });

  test("treats an existing immutable release as a verified safe rerun", async () => {
    // GIVEN: The verified tag already has an immutable published release.
    const commands = new ScriptedCommandRunner([
      success("1"),
      success(`commit\t${releaseCommit}`),
      releaseState(false, true),
      success(`commit\t${releaseCommit}`),
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication resumes after a previous successful run.
    await automation.publishRelease(publishRequest());

    // THEN: It skips mutation but repeats complete release verification.
    assert.deepEqual(
      commands.calls.slice(-5).map((call) => call.args.slice(0, 3)),
      [
        ["release", "view", "v1.2.3"],
        ["release", "verify", "v1.2.3"],
        ["release", "verify-asset", "v1.2.3"],
        ["release", "verify-asset", "v1.2.3"],
        ["release", "verify-asset", "v1.2.3"],
      ],
    );
  });

  test("resumes a matching draft without overwriting promoted bytes", async ({
    onTestFinished,
  }) => {
    // GIVEN: An interrupted draft has one matching asset and two missing assets.
    const assetsDirectory = mkdtempSync(path.join(tmpdir(), "release-draft-"));
    onTestFinished(() =>
      rmSync(assetsDirectory, { force: true, recursive: true }),
    );
    const coverageName = "test-coverage-v1.2.3.tar.gz";
    const coverageBytes = Buffer.from("coverage");
    for (const [name, bytes] of [
      [coverageName, coverageBytes],
      ["ptlam-skills-v1.2.3.tar.gz", Buffer.from("plugin")],
      ["SHA256SUMS", Buffer.from("checksums")],
    ] as const) {
      writeFileSync(path.join(assetsDirectory, name), bytes);
    }
    const commands = new ScriptedCommandRunner([
      success("1"),
      success(`commit\t${releaseCommit}`),
      releaseState(true, false, [
        {
          name: coverageName,
          digest: `sha256:${createHash("sha256").update(coverageBytes).digest("hex")}`,
        },
      ]),
      success(),
      success(),
      success(),
      success(`commit\t${releaseCommit}`),
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication resumes the draft.
    await automation.publishRelease(publishRequest(assetsDirectory));

    // THEN: Only missing assets are uploaded before publish and verification.
    assert.deepEqual(
      commands.calls.slice(3, 6).map((call) => call.args.slice(0, 3)),
      [
        ["release", "upload", "v1.2.3"],
        ["release", "upload", "v1.2.3"],
        ["release", "edit", "v1.2.3"],
      ],
    );
  });

  test.each([
    [releaseState(false, false), "without immutability"],
    [
      { status: 1, stdout: "", stderr: "HTTP 403: Resource not accessible" },
      "HTTP 403",
    ],
  ])(
    "fails closed for unsafe existing release state",
    async (state, message) => {
      // GIVEN: A stable tag and an unsafe or inconclusive release lookup.
      const commands = new ScriptedCommandRunner([
        success("1"),
        success(`commit\t${releaseCommit}`),
        state,
      ]);
      const automation = new ReleaseAutomation({ commands });

      // WHEN: Publication evaluates the existing state.
      const publication = automation.publishRelease(publishRequest());

      // THEN: It never mutates public release assets.
      await assert.rejects(publication, new RegExp(message, "u"));
      assert.equal(commands.calls.length, 3);
    },
  );

  test("rejects a remote tag that no longer identifies the gated commit", async () => {
    // GIVEN: The remote tag resolves to a different commit before publication.
    const commands = new ScriptedCommandRunner([
      success("1"),
      success("commit\t2222222222222222222222222222222222222222"),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication re-resolves the remote tag.
    const publication = automation.publishRelease(publishRequest());

    // THEN: It stops before looking up or creating a release.
    await assert.rejects(publication, /no longer points/u);
    assert.equal(commands.calls.length, 2);
  });

  test("fails before tag creation when the environment has no required reviewer", async () => {
    // GIVEN: The referenced release environment has no approval protection.
    const commands = new ScriptedCommandRunner([success("0")]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication reaches its final protected operation.
    const publication = automation.publishRelease(publishRequest());

    // THEN: It fails closed before resolving, creating, or publishing a tag.
    await assert.rejects(publication, /must require at least one reviewer/u);
    assert.equal(commands.calls.length, 1);
  });

  test("reuses an existing annotated tag only when it points to the approved commit", async () => {
    // GIVEN: A protected environment and an annotated tag from a partial attempt.
    const commands = new ScriptedCommandRunner([
      success("1"),
      success(`tag\t${annotatedTag}`),
      success(`commit\t${releaseCommit}`),
      { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" },
      success(),
      success(`tag\t${annotatedTag}`),
      success(`commit\t${releaseCommit}`),
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication resumes with the pre-existing approved tag.
    await automation.publishRelease(publishRequest());

    // THEN: Release creation verifies rather than recreates that tag.
    assert.deepEqual(commands.calls[4]?.args.slice(0, 7), [
      "release",
      "create",
      "v1.2.3",
      "--generate-notes",
      "--fail-on-no-commits",
      "--verify-tag",
      "--repo",
    ]);
  });
});
