import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, onTestFinished, test } from "vitest";

import type {
  CommandOptions,
  CommandResult,
  CommandRunner,
} from "../../../../../../.github/scripts/release/command-runner.ts";
import { validateReleaseTag } from "../../../../../../.github/scripts/release/validation/validate-release-tag.ts";

const releaseCommit = "1111111111111111111111111111111111111111";

class ScriptedGitRunner implements CommandRunner {
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
    if (result === undefined) throw new Error("Unexpected Git command.");
    return result;
  }
}

function success(stdout = ""): CommandResult {
  return { status: 0, stdout, stderr: "" };
}

async function createManifest(
  document = 'name: fixture\nversion: "1.2.3"\n',
): Promise<string> {
  const rootDir = await mkdtemp(path.join(tmpdir(), "release-validation-"));
  onTestFinished(() => rm(rootDir, { force: true, recursive: true }));
  await mkdir(path.join(rootDir, "plugin"));
  await writeFile(path.join(rootDir, "plugin/plugin.yml"), document, "utf8");
  return rootDir;
}

describe("validateReleaseTag", () => {
  test.each([
    ['version: "1.2.3"', "v1.2.3"],
    ["version: '1.2.3-beta.1'", "v1.2.3-beta.1"],
    ["version: 1.2.3+build.4", "v1.2.3+build.4"],
  ])(
    "accepts one strict top-level plugin version from %s",
    async (manifest, tag) => {
      // GIVEN: A supported scalar spelling for the top-level manifest version.
      const repositoryRoot = await createManifest(`${manifest}\n`);
      const git = new ScriptedGitRunner([
        success(releaseCommit),
        success(releaseCommit),
        success(),
        success(),
      ]);

      // WHEN: The public release validation operation reads the manifest.
      const result = await validateReleaseTag({ repositoryRoot, tag }, git);

      // THEN: The supported version reaches complete Git validation.
      assert.deepEqual(result, { releaseCommit });
      assert.equal(git.calls.length, 4);
    },
  );

  test.each([
    ["name: plugin", "exactly one top-level version"],
    ["version: 1.2.3\nversion: 2.0.0", "exactly one top-level version"],
    ["  version: 1.2.3", "exactly one top-level version"],
    ["version: 1.2.3 # mutable", "must not contain a comment"],
    ["version: latest", "semantic-version"],
  ])("rejects an unsafe manifest version in %s", async (manifest, expected) => {
    // GIVEN: A missing, ambiguous, nested, commented, or non-SemVer version.
    const repositoryRoot = await createManifest(`${manifest}\n`);
    const git = new ScriptedGitRunner([]);

    // WHEN: The public release validation operation reads the manifest.
    const validation = validateReleaseTag(
      { repositoryRoot, tag: "v1.2.3" },
      git,
    );

    // THEN: It fails closed before checking Git state.
    await assert.rejects(validation, new RegExp(expected, "u"));
    assert.equal(git.calls.length, 0);
  });

  test("accepts the manifest tag at a commit reachable from main", async () => {
    // GIVEN: A manifest, tag, and checkout at one commit in main history.
    const repositoryRoot = await createManifest();
    const git = new ScriptedGitRunner([
      success(releaseCommit),
      success(releaseCommit),
      success(),
      success(),
    ]);

    // WHEN: The complete local release contract is validated.
    const result = await validateReleaseTag(
      { repositoryRoot, tag: "v1.2.3" },
      git,
    );

    // THEN: The immutable result returns the exact commit and refreshes main.
    assert.deepEqual(result, { releaseCommit });
    assert.equal(Object.isFrozen(result), true);
    assert.deepEqual(git.calls[2], {
      command: "git",
      args: ["fetch", "--no-tags", "origin", "main:refs/remotes/origin/main"],
    });
  });

  test("rejects a tag that moved away from the triggering checkout", async () => {
    // GIVEN: A valid manifest and a tag that peels to a different commit.
    const repositoryRoot = await createManifest();
    const git = new ScriptedGitRunner([
      success("2222222222222222222222222222222222222222"),
      success(releaseCommit),
    ]);

    // WHEN: Release Git state is validated.
    const validation = validateReleaseTag(
      { repositoryRoot, tag: "v1.2.3" },
      git,
    );

    // THEN: Publication stops before fetching or building.
    await assert.rejects(validation, /Release tag moved/u);
    assert.equal(git.calls.length, 2);
  });

  test("rejects a release commit outside main history", async () => {
    // GIVEN: Matching tag and checkout commits that are not ancestors of main.
    const repositoryRoot = await createManifest();
    const git = new ScriptedGitRunner([
      success(releaseCommit),
      success(releaseCommit),
      success(),
      { status: 1, stdout: "", stderr: "" },
    ]);

    // WHEN: Release Git state is validated.
    const validation = validateReleaseTag(
      { repositoryRoot, tag: "v1.2.3" },
      git,
    );

    // THEN: Detached or feature history cannot be released.
    await assert.rejects(validation, /must be reachable from origin\/main/u);
  });
});
