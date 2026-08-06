import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { type CommandRunner, requireCommand } from "../command-runner.ts";
import { parseReleaseTag, type ReleaseTag } from "../validation/release-tag.ts";
import {
  createReleaseAssetPlan,
  type ReleaseAssetPlan,
} from "./release-assets.ts";

export interface PublishGitHubReleaseRequest {
  readonly assetsDirectory: string;
  readonly expectedCommit: string;
  readonly repository: string;
  readonly tag: string;
}

export interface PublishGitHubReleaseResult {
  readonly assetPaths: readonly string[];
  readonly tag: string;
}

interface GitObject {
  readonly sha: string;
  readonly type: string;
}

interface ReleaseAsset {
  readonly digest: string | null;
  readonly name: string;
}

interface ReleaseState {
  readonly assets: readonly ReleaseAsset[];
  readonly draft: boolean;
  readonly immutable: boolean;
}

function parseReleaseState(output: string): ReleaseState {
  const document = JSON.parse(output) as unknown;
  if (
    typeof document !== "object" ||
    document === null ||
    !("draft" in document) ||
    typeof document.draft !== "boolean" ||
    !("immutable" in document) ||
    typeof document.immutable !== "boolean" ||
    !("assets" in document) ||
    !Array.isArray(document.assets)
  ) {
    throw new Error("GitHub returned an invalid release response.");
  }
  const assets = document.assets.map((asset) => {
    if (
      typeof asset !== "object" ||
      asset === null ||
      !("name" in asset) ||
      typeof asset.name !== "string" ||
      !("digest" in asset) ||
      (typeof asset.digest !== "string" && asset.digest !== null)
    ) {
      throw new Error("GitHub returned an invalid release asset response.");
    }
    return Object.freeze({ name: asset.name, digest: asset.digest });
  });
  return Object.freeze({
    assets: Object.freeze(assets),
    draft: document.draft,
    immutable: document.immutable,
  });
}

function localAssetDigest(assetPath: string): string {
  return `sha256:${createHash("sha256")
    .update(readFileSync(assetPath))
    .digest("hex")}`;
}

function resumeDraftRelease(
  request: PublishGitHubReleaseRequest,
  state: ReleaseState,
  assets: ReleaseAssetPlan,
  commands: CommandRunner,
): void {
  const expectedNames = new Set(
    assets.paths.map((assetPath) => assetPath.split(/[\\/]/).at(-1)),
  );
  const assetsByName = new Map<string, ReleaseAsset>();
  for (const asset of state.assets) {
    if (!expectedNames.has(asset.name) || assetsByName.has(asset.name)) {
      throw new Error(
        `Draft release ${request.tag} contains an unexpected or duplicate asset: ${asset.name}.`,
      );
    }
    assetsByName.set(asset.name, asset);
  }

  for (const assetPath of assets.paths) {
    const assetName = assetPath.split(/[\\/]/).at(-1);
    if (assetName === undefined) {
      throw new Error(`Could not resolve release asset name for ${assetPath}.`);
    }
    const remoteAsset = assetsByName.get(assetName);
    if (remoteAsset === undefined) {
      requireCommand(commands, "gh", [
        "release",
        "upload",
        request.tag,
        assetPath,
        "--repo",
        request.repository,
      ]);
      continue;
    }
    if (remoteAsset.digest !== localAssetDigest(assetPath)) {
      throw new Error(
        `Draft release asset ${assetName} does not match the promoted artifact.`,
      );
    }
  }
  requireCommand(commands, "gh", [
    "release",
    "edit",
    request.tag,
    "--draft=false",
    "--repo",
    request.repository,
  ]);
}

function parseGitObject(output: string): GitObject {
  const [type, sha, extra] = output.split("\t");
  if (type === undefined || sha === undefined || extra !== undefined) {
    throw new Error("GitHub returned an invalid Git object response.");
  }
  return Object.freeze({ type, sha });
}

function readGitObject(endpoint: string, commands: CommandRunner): GitObject {
  return parseGitObject(
    requireCommand(commands, "gh", [
      "api",
      endpoint,
      "--jq",
      ".object | [.type, .sha] | @tsv",
    ]),
  );
}

function resolveRemoteReleaseCommit(
  repository: string,
  tag: ReleaseTag,
  commands: CommandRunner,
): string {
  let object = readGitObject(
    `repos/${repository}/git/ref/tags/${encodeURIComponent(tag.value)}`,
    commands,
  );
  const visitedTags = new Set<string>();
  while (object.type === "tag") {
    if (visitedTags.has(object.sha)) {
      throw new Error("Remote release tag contains a tag-object cycle.");
    }
    visitedTags.add(object.sha);
    object = readGitObject(
      `repos/${repository}/git/tags/${object.sha}`,
      commands,
    );
  }
  if (object.type !== "commit") {
    throw new Error(
      `Remote release tag points to ${object.type}, not a commit.`,
    );
  }
  return object.sha;
}

function createGitHubReleaseArguments(
  repository: string,
  tag: ReleaseTag,
  assetPaths: readonly string[],
): readonly string[] {
  const args = [
    "release",
    "create",
    tag.value,
    "--verify-tag",
    "--generate-notes",
    "--fail-on-no-commits",
  ];
  if (tag.prerelease) args.push("--prerelease", "--latest=false");
  return Object.freeze([...args, "--repo", repository, ...assetPaths]);
}

function createOrResumeRelease(
  request: PublishGitHubReleaseRequest,
  tag: ReleaseTag,
  assets: ReleaseAssetPlan,
  commands: CommandRunner,
): void {
  const releaseLookup = commands.run("gh", [
    "api",
    `repos/${request.repository}/releases/tags/${encodeURIComponent(request.tag)}`,
  ]);
  if (
    releaseLookup.status !== 0 &&
    !releaseLookup.stderr.toLowerCase().includes("http 404")
  ) {
    throw new Error(
      releaseLookup.stderr.trim() ||
        `Could not determine whether release ${request.tag} exists.`,
    );
  }

  if (releaseLookup.status === 0) {
    const state = parseReleaseState(releaseLookup.stdout);
    if (state.draft) {
      resumeDraftRelease(request, state, assets, commands);
      return;
    }
    if (state.immutable) return;
    throw new Error(
      `Release ${request.tag} already exists without immutability; refusing to modify it.`,
    );
  }

  requireCommand(
    commands,
    "gh",
    createGitHubReleaseArguments(request.repository, tag, assets.paths),
  );
}

function verifyRelease(
  request: PublishGitHubReleaseRequest,
  assets: ReleaseAssetPlan,
  commands: CommandRunner,
): void {
  const immutable = requireCommand(commands, "gh", [
    "release",
    "view",
    request.tag,
    "--json",
    "isImmutable",
    "--jq",
    ".isImmutable",
    "--repo",
    request.repository,
  ]);
  if (immutable !== "true") {
    throw new Error("Release immutability must be enabled before publishing.");
  }
  requireCommand(commands, "gh", [
    "release",
    "verify",
    request.tag,
    "--repo",
    request.repository,
  ]);
  for (const assetPath of assets.paths) {
    requireCommand(commands, "gh", [
      "release",
      "verify-asset",
      request.tag,
      assetPath,
      "--repo",
      request.repository,
    ]);
  }
}

/** Create or recover one release, then prove its tag and every promoted asset. */
export function publishGitHubRelease(
  request: PublishGitHubReleaseRequest,
  commands: CommandRunner,
): PublishGitHubReleaseResult {
  const tag = parseReleaseTag(request.tag);
  const assets = createReleaseAssetPlan(request.assetsDirectory, request.tag);
  const remoteCommit = resolveRemoteReleaseCommit(
    request.repository,
    tag,
    commands,
  );
  if (remoteCommit !== request.expectedCommit) {
    throw new Error(
      "Remote release tag no longer points to the verified commit.",
    );
  }

  createOrResumeRelease(request, tag, assets, commands);
  verifyRelease(request, assets, commands);
  return Object.freeze({
    assetPaths: assets.paths,
    tag: tag.value,
  });
}
