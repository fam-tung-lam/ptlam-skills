import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, onTestFinished } from "vitest";

import type {
  CommandOptions,
  CommandResult,
  CommandRunner,
} from "../../../../../../.github/scripts/release/command-runner.ts";
import { planRelease } from "../../../../../../.github/scripts/release/validation/plan-release.ts";

const releaseCommit = "1111111111111111111111111111111111111111";
const tagObject = "2222222222222222222222222222222222222222";

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

function notFound(): CommandResult {
  return { status: 1, stdout: "", stderr: "gh: Not Found (HTTP 404)" };
}

async function createManifest(
  document = 'name: fixture\nversion: "1.2.3"\n',
): Promise<string> {
  const rootDir = await mkdtemp(path.join(tmpdir(), "release-plan-"));
  onTestFinished(() => rm(rootDir, { force: true, recursive: true }));
  await mkdir(path.join(rootDir, "plugin"));
  await writeFile(path.join(rootDir, "plugin/plugin.yml"), document, "utf8");
  return rootDir;
}

function planRequest(repositoryRoot: string) {
  return {
    expectedCommit: releaseCommit,
    repository: "owner/repository",
    repositoryRoot,
  } as const;
}

function newReleaseResults(remoteTags = ""): readonly CommandResult[] {
  return [
    success(releaseCommit),
    success(),
    success(),
    success(remoteTags),
    notFound(),
  ];
}

describe("planRelease", () => {
  it.each([
    ['version: "1.2.3"', "v1.2.3"],
    ["version: '1.2.3-beta.1'", "v1.2.3-beta.1"],
    ["version: 1.2.3+build.4", "v1.2.3+build.4"],
  ])(
    "plans one strict top-level plugin version from %s",
    async (manifest, tag) => {
      // GIVEN: A new supported manifest version on the successful CI commit.
      const repositoryRoot = await createManifest(`${manifest}\n`);
      const commands = new ScriptedCommandRunner(newReleaseResults());

      // WHEN: The public release planning operation evaluates the repository.
      const result = await planRelease(planRequest(repositoryRoot), commands);

      // THEN: The exact manifest version becomes an immutable release candidate.
      assert.deepEqual(result, {
        releaseCommit,
        releaseRequired: true,
        tag,
      });
      assert.equal(Object.isFrozen(result), true);
    },
  );

  it.each([
    ["name: plugin", "exactly one top-level version"],
    ["version: 1.2.3\nversion: 2.0.0", "exactly one top-level version"],
    ["  version: 1.2.3", "exactly one top-level version"],
    ["version: 1.2.3 # mutable", "must not contain a comment"],
    ["version: latest", "semantic-version"],
  ])("rejects an unsafe manifest version in %s", async (manifest, expected) => {
    // GIVEN: A missing, ambiguous, nested, commented, or non-SemVer version.
    const repositoryRoot = await createManifest(`${manifest}\n`);
    const commands = new ScriptedCommandRunner([]);

    // WHEN: Release planning reads the manifest.
    const planning = planRelease(planRequest(repositoryRoot), commands);

    // THEN: It fails closed before checking repository state.
    await assert.rejects(planning, new RegExp(expected, "u"));
    assert.equal(commands.calls.length, 0);
  });

  it("plans a version newer than every remote release tag", async () => {
    // GIVEN: The candidate follows the greatest stable and prerelease tags.
    const repositoryRoot = await createManifest();
    const commands = new ScriptedCommandRunner(
      newReleaseResults(
        `${tagObject}\trefs/tags/v1.1.9\n${tagObject}\trefs/tags/v1.2.3-beta.1`,
      ),
    );

    // WHEN: Release planning compares semantic precedence.
    const result = await planRelease(planRequest(repositoryRoot), commands);

    // THEN: The greater stable version is selected for publication.
    assert.equal(result.releaseRequired, true);
    assert.equal(result.tag, "v1.2.3");
  });

  it.each(["v2.0.0", "v1.2.3+build.7"])(
    "rejects candidate v1.2.3 when remote tag %s is not older",
    async (remoteTag) => {
      // GIVEN: A remote release tag with equal or greater Semantic Version precedence.
      const repositoryRoot = await createManifest();
      const commands = new ScriptedCommandRunner(
        newReleaseResults(`${tagObject}\trefs/tags/${remoteTag}`),
      );

      // WHEN: Release planning compares the candidate with existing tags.
      const planning = planRelease(planRequest(repositoryRoot), commands);

      // THEN: A rollback or duplicate precedence cannot reach approval.
      await assert.rejects(planning, /must be newer than latest release tag/u);
    },
  );

  it("skips a plugin version that already has an immutable release", async () => {
    // GIVEN: Main still declares a version whose immutable release exists.
    const repositoryRoot = await createManifest();
    const commands = new ScriptedCommandRunner([
      success(releaseCommit),
      success(),
      success(),
      success(`${tagObject}\trefs/tags/v1.2.3`),
      success("false\ttrue"),
    ]);

    // WHEN: Another successful CI run evaluates the unchanged version.
    const result = await planRelease(planRequest(repositoryRoot), commands);

    // THEN: CD ends without rebuilding or requesting another approval.
    assert.deepEqual(result, {
      releaseCommit,
      releaseRequired: false,
      tag: "v1.2.3",
    });
  });

  it.each([notFound(), success("true\tfalse")])(
    "resumes an approved candidate whose matching tag already exists",
    async (releaseState) => {
      // GIVEN: A prior publication attempt created the exact tag at this commit.
      const repositoryRoot = await createManifest();
      const commands = new ScriptedCommandRunner([
        success(releaseCommit),
        success(),
        success(),
        success(`${tagObject}\trefs/tags/v1.2.3`),
        releaseState,
        success(
          `${tagObject}\trefs/tags/v1.2.3\n${releaseCommit}\trefs/tags/v1.2.3^{}`,
        ),
      ]);

      // WHEN: The same candidate is planned again.
      const result = await planRelease(planRequest(repositoryRoot), commands);

      // THEN: Matching partial state remains eligible for approval and recovery.
      assert.equal(result.releaseRequired, true);
      assert.equal(result.tag, "v1.2.3");
    },
  );

  it("rejects an existing candidate tag at another commit", async () => {
    // GIVEN: The manifest tag already points outside the successful CI commit.
    const repositoryRoot = await createManifest();
    const commands = new ScriptedCommandRunner([
      success(releaseCommit),
      success(),
      success(),
      success(`${tagObject}\trefs/tags/v1.2.3`),
      notFound(),
      success("3333333333333333333333333333333333333333\trefs/tags/v1.2.3"),
    ]);

    // WHEN: Release planning evaluates the conflicting remote tag.
    const planning = planRelease(planRequest(repositoryRoot), commands);

    // THEN: It fails before any release artifact is built.
    await assert.rejects(planning, /points to another commit/u);
  });

  it("rejects a successful CI event for another checkout", async () => {
    // GIVEN: The checked-out commit differs from the completed CI run.
    const repositoryRoot = await createManifest();
    const commands = new ScriptedCommandRunner([
      success("2222222222222222222222222222222222222222"),
    ]);

    // WHEN: Release planning validates the event identity.
    const planning = planRelease(planRequest(repositoryRoot), commands);

    // THEN: It stops before fetching or querying GitHub.
    await assert.rejects(planning, /must equal the successful CI commit/u);
    assert.equal(commands.calls.length, 1);
  });

  it("rejects a release commit outside main history", async () => {
    // GIVEN: The successful CI commit is not reachable from current main.
    const repositoryRoot = await createManifest();
    const commands = new ScriptedCommandRunner([
      success(releaseCommit),
      success(),
      { status: 1, stdout: "", stderr: "" },
    ]);

    // WHEN: Release planning validates main ancestry.
    const planning = planRelease(planRequest(repositoryRoot), commands);

    // THEN: Detached or superseded history cannot reach approval.
    await assert.rejects(planning, /must be reachable from origin\/main/u);
  });

  it("rejects an existing mutable release", async () => {
    // GIVEN: The manifest tag already names a published mutable release.
    const repositoryRoot = await createManifest();
    const commands = new ScriptedCommandRunner([
      success(releaseCommit),
      success(),
      success(),
      success(`${tagObject}\trefs/tags/v1.2.3`),
      success("false\tfalse"),
    ]);

    // WHEN: Release planning inspects the existing release.
    const planning = planRelease(planRequest(repositoryRoot), commands);

    // THEN: It refuses to treat mutable public state as a safe retry.
    await assert.rejects(planning, /without immutability/u);
  });
});
