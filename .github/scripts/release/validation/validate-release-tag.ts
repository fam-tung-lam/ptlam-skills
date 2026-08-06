import { readFile } from "node:fs/promises";
import path from "node:path";

import { type CommandRunner, requireCommand } from "../command-runner.ts";
import { parseReleaseTag } from "./release-tag.ts";

export interface ValidateReleaseTagRequest {
  readonly repositoryRoot: string;
  readonly tag: string;
}

export interface ValidateReleaseTagResult {
  readonly releaseCommit: string;
}

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

/** Validate tag identity, checkout identity, and membership in main history. */
export async function validateReleaseTag(
  request: ValidateReleaseTagRequest,
  commands: CommandRunner,
): Promise<ValidateReleaseTagResult> {
  const manifest = await readFile(
    path.join(request.repositoryRoot, "plugin/plugin.yml"),
    "utf8",
  );
  const version = parsePluginVersion(manifest);
  parseReleaseTag(request.tag, version);

  const options = { cwd: request.repositoryRoot };
  const taggedCommit = requireCommand(
    commands,
    "git",
    ["rev-parse", `${request.tag}^{commit}`],
    options,
  );
  const checkedOutCommit = requireCommand(
    commands,
    "git",
    ["rev-parse", "HEAD"],
    options,
  );
  if (taggedCommit !== checkedOutCommit) {
    throw new Error("Release tag moved after this workflow was triggered.");
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
  return Object.freeze({ releaseCommit: checkedOutCommit });
}
