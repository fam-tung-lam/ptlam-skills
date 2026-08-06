import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  type CommandResult,
  type CommandRunner,
  requireCommand,
} from "../command-runner.ts";
import {
  compareReleaseTags,
  parseReleaseTag,
  type ReleaseTag,
} from "./release-tag.ts";

export interface PlanReleaseRequest {
  readonly expectedCommit: string;
  readonly repository: string;
  readonly repositoryRoot: string;
}

export interface PlanReleaseResult {
  readonly releaseCommit: string;
  readonly releaseRequired: boolean;
  readonly tag: string;
}

type ExistingReleaseState = "absent" | "draft" | "immutable";

function parsePluginVersion(document: string): string {
  const matches = [...document.matchAll(/^version:\s*(.+?)\s*$/gm)];
  if (matches.length !== 1) {
    throw new Error(
      "plugin/plugin.yml must contain exactly one top-level version.",
    );
  }
  const rawVersion = matches[0]?.[1];
  if (rawVersion === undefined || rawVersion.includes("#")) {
    throw new Error("plugin/plugin.yml version must not contain a comment.");
  }
  const quotedVersion = rawVersion.match(/^(?:"([^"]+)"|'([^']+)')$/);
  const version = quotedVersion?.[1] ?? quotedVersion?.[2] ?? rawVersion;
  parseReleaseTag(`v${version}`);
  return version;
}

function isNotFound(result: CommandResult): boolean {
  return (
    result.status !== 0 && result.stderr.toLowerCase().includes("http 404")
  );
}

function readExistingReleaseState(
  repository: string,
  tag: string,
  commands: CommandRunner,
): ExistingReleaseState {
  const result = commands.run("gh", [
    "api",
    `repos/${repository}/releases/tags/${encodeURIComponent(tag)}`,
    "--jq",
    "[.draft, .immutable] | @tsv",
  ]);
  if (isNotFound(result)) return "absent";
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(
      detail || `Could not determine whether release ${tag} exists.`,
    );
  }
  const state = result.stdout.trim();
  if (state === "true\tfalse") return "draft";
  if (state === "false\ttrue") return "immutable";
  if (state === "false\tfalse") {
    throw new Error(
      `Release ${tag} already exists without immutability; refusing to continue.`,
    );
  }
  throw new Error("GitHub returned an invalid release response.");
}

function parseRemoteTags(output: string): readonly ReleaseTag[] {
  if (output.trim().length === 0) return Object.freeze([]);
  return Object.freeze(
    output
      .trim()
      .split("\n")
      .map((line) => {
        const match = line.match(/^[0-9a-f]+\trefs\/tags\/(v.+)$/u);
        if (match?.[1] === undefined) {
          throw new Error("Git returned an invalid release tag response.");
        }
        return parseReleaseTag(match[1]);
      }),
  );
}

function latestReleaseTag(tags: readonly ReleaseTag[]): ReleaseTag | null {
  return (
    tags.reduce<ReleaseTag | null>(
      (latest, tag) =>
        latest === null || compareReleaseTags(tag, latest) > 0 ? tag : latest,
      null,
    ) ?? null
  );
}

function resolveRemoteTagCommit(tag: string, commands: CommandRunner): string {
  const output = requireCommand(commands, "git", [
    "ls-remote",
    "--tags",
    "origin",
    `refs/tags/${tag}`,
    `refs/tags/${tag}^{}`,
  ]);
  const refs = new Map(
    output.split("\n").map((line) => {
      const [sha, ref, extra] = line.split("\t");
      if (sha === undefined || ref === undefined || extra !== undefined) {
        throw new Error("Git returned an invalid release tag target.");
      }
      return [ref, sha] as const;
    }),
  );
  const commit =
    refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`);
  if (commit === undefined) {
    throw new Error(`Remote release tag ${tag} disappeared during planning.`);
  }
  return commit;
}

/** Plan a release only for a new manifest version on validated main history. */
export async function planRelease(
  request: PlanReleaseRequest,
  commands: CommandRunner,
): Promise<PlanReleaseResult> {
  const manifest = await readFile(
    path.join(request.repositoryRoot, "plugin/plugin.yml"),
    "utf8",
  );
  const candidate = parseReleaseTag(`v${parsePluginVersion(manifest)}`);
  const options = { cwd: request.repositoryRoot };
  const checkedOutCommit = requireCommand(
    commands,
    "git",
    ["rev-parse", "HEAD"],
    options,
  );
  if (checkedOutCommit !== request.expectedCommit) {
    throw new Error("Release checkout must equal the successful CI commit.");
  }

  requireCommand(
    commands,
    "git",
    ["fetch", "--no-tags", "origin", "main:refs/remotes/origin/main"],
    options,
  );
  const ancestry = commands.run(
    "git",
    ["merge-base", "--is-ancestor", checkedOutCommit, "origin/main"],
    options,
  );
  if (ancestry.status !== 0) {
    throw new Error("Release commit must be reachable from origin/main.");
  }

  const remoteTags = parseRemoteTags(
    requireCommand(
      commands,
      "git",
      ["ls-remote", "--tags", "--refs", "origin", "refs/tags/v*"],
      options,
    ),
  );
  const existingTag = remoteTags.find(({ value }) => value === candidate.value);
  const releaseState = readExistingReleaseState(
    request.repository,
    candidate.value,
    commands,
  );
  if (releaseState === "immutable") {
    return Object.freeze({
      releaseCommit: checkedOutCommit,
      releaseRequired: false,
      tag: candidate.value,
    });
  }

  if (existingTag !== undefined) {
    const remoteCommit = resolveRemoteTagCommit(candidate.value, commands);
    if (remoteCommit !== checkedOutCommit) {
      throw new Error(
        `Remote release tag ${candidate.value} points to another commit.`,
      );
    }
  } else {
    if (releaseState === "draft") {
      throw new Error(`Draft release ${candidate.value} has no remote tag.`);
    }
    const latest = latestReleaseTag(remoteTags);
    if (latest !== null && compareReleaseTags(candidate, latest) <= 0) {
      throw new Error(
        `Plugin version ${candidate.version} must be newer than latest release tag ${latest.value}.`,
      );
    }
  }

  return Object.freeze({
    releaseCommit: checkedOutCommit,
    releaseRequired: true,
    tag: candidate.value,
  });
}
