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
    assetsDirectory,
    expectedCommit: releaseCommit,
    repository: "owner/repository",
    tag: "v1.2.3",
  } as const;
}

describe("ReleaseAutomation", () => {
  test("publishes and verifies complete assets from an annotated tag", async () => {
    // GIVEN: An annotated tag, no existing release, and successful verification.
    const commands = new ScriptedCommandRunner([
      success(`tag\t${annotatedTag}`),
      success(`commit\t${releaseCommit}`),
      { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" },
      success(),
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: The public release workflow is executed.
    const result = await automation.publishRelease(publishRequest());

    // THEN: The tag is peeled, exact assets are created, and the result is immutable.
    assert.ok(
      commands.calls[1]?.args.includes(
        `repos/owner/repository/git/tags/${annotatedTag}`,
      ),
    );
    assert.deepEqual(commands.calls[3]?.args, [
      "release",
      "create",
      "v1.2.3",
      "--verify-tag",
      "--generate-notes",
      "--fail-on-no-commits",
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
    // GIVEN: A verified prerelease tag with no existing GitHub Release.
    const commands = new ScriptedCommandRunner([
      success(`commit\t${releaseCommit}`),
      { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" },
      success(),
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication runs through the public release facade.
    await automation.publishRelease({
      ...publishRequest(),
      tag: "v2.0.0-rc.1",
    });

    // THEN: GitHub receives prerelease controls before the immutable assets.
    assert.deepEqual(commands.calls[2]?.args, [
      "release",
      "create",
      "v2.0.0-rc.1",
      "--verify-tag",
      "--generate-notes",
      "--fail-on-no-commits",
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
      success(`commit\t${releaseCommit}`),
      releaseState(false, true),
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication resumes after a previous successful run.
    await automation.publishRelease(publishRequest());

    // THEN: It skips mutation but repeats complete release verification.
    assert.deepEqual(
      commands.calls.slice(2).map((call) => call.args.slice(0, 3)),
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
      ...verificationResults(),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication resumes the draft.
    await automation.publishRelease(publishRequest(assetsDirectory));

    // THEN: Only missing assets are uploaded before publish and verification.
    assert.deepEqual(
      commands.calls.slice(2, 5).map((call) => call.args.slice(0, 3)),
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
        success(`commit\t${releaseCommit}`),
        state,
      ]);
      const automation = new ReleaseAutomation({ commands });

      // WHEN: Publication evaluates the existing state.
      const publication = automation.publishRelease(publishRequest());

      // THEN: It never mutates public release assets.
      await assert.rejects(publication, new RegExp(message, "u"));
      assert.equal(commands.calls.length, 2);
    },
  );

  test("rejects a remote tag that no longer identifies the gated commit", async () => {
    // GIVEN: The remote tag resolves to a different commit before publication.
    const commands = new ScriptedCommandRunner([
      success("commit\t2222222222222222222222222222222222222222"),
    ]);
    const automation = new ReleaseAutomation({ commands });

    // WHEN: Publication re-resolves the remote tag.
    const publication = automation.publishRelease(publishRequest());

    // THEN: It stops before looking up or creating a release.
    await assert.rejects(publication, /no longer points/u);
    assert.equal(commands.calls.length, 1);
  });
});
