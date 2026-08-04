#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { runProcess } from "./internal/process.mjs";

const INCOMPLETE_EXIT = 3;
const EXACT_STABLE_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};

const calculateIdentity = (manifest) => {
  const { capsuleIdentity: _ignored, ...input } = manifest;
  return sha256(JSON.stringify(canonicalize(input)));
};

const parseArgs = (args) => {
  const result = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(
        "usage: update-mermaid.mjs --version <exact> --output <path> [--source-dir <prepared staging root>]",
      );
    }
    if (!["--version", "--output", "--source-dir"].includes(key)) {
      throw new Error(`unknown option ${key}`);
    }
    if (result[key]) throw new Error(`duplicate option ${key}`);
    result[key] = value;
  }
  if (!result["--version"] || !result["--output"]) {
    throw new Error("--version and --output are required");
  }
  if (!EXACT_STABLE_SEMVER.test(result["--version"])) {
    throw new Error("--version must be an exact stable semantic version");
  }
  return {
    output: path.resolve(result["--output"]),
    sourceDir: result["--source-dir"]
      ? path.resolve(result["--source-dir"])
      : null,
    version: result["--version"],
  };
};

const resolveInside = (root, relativePath, label) => {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)) {
    throw new Error(`${label} must be relative`);
  }
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} escapes its staging root`);
  }
  return resolved;
};

const validatePreparedCandidate = async (sourceRoot, version) => {
  const manifestRelative = `skills/productivity/ptlam-visualization/references/mermaid/${version}/MANIFEST.json`;
  const manifestPath = resolveInside(
    sourceRoot,
    manifestRelative,
    "manifest path",
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 1)
    throw new Error("unsupported manifest schema");
  if (manifest.capsule?.mermaidVersion !== version) {
    throw new Error(
      "manifest Mermaid version does not match requested version",
    );
  }
  if (manifest.cli?.version !== version) {
    throw new Error("CLI version does not match requested Mermaid version");
  }
  if (manifest.capsule.tag !== `mermaid@${version}`) {
    throw new Error(
      "manifest does not name the matching immutable Mermaid tag",
    );
  }
  if (!/^[0-9a-f]{40}$/.test(manifest.capsule.commit)) {
    throw new Error("manifest release commit must be a full immutable SHA");
  }
  if (calculateIdentity(manifest) !== manifest.capsuleIdentity?.value) {
    throw new Error("candidate capsule identity is invalid");
  }
  if (manifest.catalog?.length !== 31) {
    throw new Error("candidate catalog must contain exactly 31 families");
  }
  if (new Set(manifest.catalog.map((entry) => entry.id)).size !== 31) {
    throw new Error("candidate catalog contains duplicate families");
  }

  const referenceRoot = resolveInside(
    sourceRoot,
    manifest.references.root,
    "reference root",
  );
  for (const entry of manifest.references.files) {
    const file = resolveInside(referenceRoot, entry.path, "reference path");
    if (sha256(await readFile(file)) !== entry.sha256) {
      throw new Error(`reference hash mismatch: ${entry.path}`);
    }
  }
  await Promise.all([
    access(
      resolveInside(
        referenceRoot,
        manifest.references.licensePath,
        "license path",
      ),
    ),
    access(
      resolveInside(
        referenceRoot,
        manifest.references.schemaPath,
        "schema path",
      ),
    ),
    access(
      resolveInside(
        referenceRoot,
        manifest.licenseReview.dependencyInventoryPath,
        "license inventory path",
      ),
    ),
  ]);

  for (const family of manifest.catalog) {
    const fixture = resolveInside(
      sourceRoot,
      family.fixturePath,
      "fixture path",
    );
    const source = await readFile(fixture);
    if (sha256(source) !== family.fixtureSha256) {
      throw new Error(`fixture hash mismatch: ${family.id}`);
    }
    const text = source.toString("utf8");
    const mode = family.accessibilityMode;
    if (!new Set(["native", "native-postprocess", "adapter-comments"]).has(mode)) {
      throw new Error(`unknown accessibility mode: ${family.id}`);
    }
    const hasNativeText =
      /(^|\n)[\t ]*accTitle:\s*\S/.test(text) &&
      /(^|\n)[\t ]*accDescr(?::|\s*\{)/.test(text);
    const adapterTitles = [
      ...text.matchAll(
        /^[\t ]*%% ptlam-acc-title: [^\r\n]*\S[^\r\n]*$/gmu,
      ),
    ];
    const adapterDescriptions = [
      ...text.matchAll(
        /^[\t ]*%% ptlam-acc-description: [^\r\n]*\S[^\r\n]*$/gmu,
      ),
    ];
    const hasAdapterText =
      adapterTitles.length === 1 && adapterDescriptions.length === 1;
    if (
      (mode === "adapter-comments" && (!hasAdapterText || hasNativeText)) ||
      (mode !== "adapter-comments" && !hasNativeText)
    ) {
      throw new Error(`fixture lacks accessibility text: ${family.id}`);
    }
  }

  const packagePath = resolveInside(
    sourceRoot,
    manifest.runtimeInputs.packagePath,
    "runtime package path",
  );
  const lockPath = resolveInside(
    sourceRoot,
    manifest.runtimeInputs.lockPath,
    "runtime lock path",
  );
  const [packageSource, lockSource] = await Promise.all([
    readFile(packagePath),
    readFile(lockPath),
  ]);
  if (sha256(packageSource) !== manifest.runtimeInputs.packageSha256) {
    throw new Error("runtime package hash mismatch");
  }
  if (sha256(lockSource) !== manifest.runtimeInputs.lockSha256) {
    throw new Error("runtime lock hash mismatch");
  }
  const lock = JSON.parse(lockSource.toString("utf8"));
  if (lock.packages?.["node_modules/mermaid"]?.version !== version) {
    throw new Error("runtime lock resolves a mismatched Mermaid core");
  }
  if (
    lock.packages?.["node_modules/@mermaid-js/mermaid-cli"]?.version !== version
  ) {
    throw new Error("runtime lock resolves a mismatched Mermaid CLI");
  }

  return {
    manifest,
    manifestPath,
    manifestRelative,
    copyPaths: [
      manifest.references.root,
      manifest.runtimeInputs.packagePath,
      manifest.runtimeInputs.lockPath,
      ...new Set(manifest.catalog.map((entry) => entry.fixturePath)),
    ],
  };
};

const publishCandidate = async ({ output, sourceDir, version }) => {
  await stat(output)
    .then(() => {
      throw new Error("output already exists; refusing unrelated overwrite");
    })
    .catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  const validated = await validatePreparedCandidate(sourceDir, version);
  const parent = path.dirname(output);
  await mkdir(parent, { recursive: true });
  const stage = await mkdtemp(path.join(parent, ".ptlam-mermaid-candidate-"));
  try {
    for (const relativePath of validated.copyPaths) {
      const source = resolveInside(sourceDir, relativePath, "candidate input");
      const destination = resolveInside(
        stage,
        relativePath,
        "candidate output",
      );
      await mkdir(path.dirname(destination), { recursive: true });
      await cp(source, destination, { recursive: true, errorOnExist: true });
    }
    const report = {
      schemaVersion: 1,
      status: "candidate-ready",
      version,
      capsuleIdentity: validated.manifest.capsuleIdentity.value,
      sourceDir,
      preparedAt: new Date().toISOString(),
      gates: {
        exactStableVersion: "passed",
        immutableTagAndCommit: "passed",
        exactRuntimeLock: "passed",
        referencesAndHashes: "passed",
        catalogAndFixtures: "passed",
        accessibility: "passed",
        licensePresence: "passed",
        renderAndVisualReview:
          process.env.PTLAM_MERMAID_UPDATE_TEST_MODE === "1" &&
          process.env.PTLAM_MERMAID_UPDATE_RENDER_GATE === "passed"
            ? "passed"
            : "unverified",
        securityAndReleaseNoteReview:
          process.env.PTLAM_MERMAID_UPDATE_TEST_MODE === "1" &&
          process.env.PTLAM_MERMAID_UPDATE_SECURITY_GATE === "passed"
            ? "passed"
            : "unverified",
      },
    };
    if (Object.values(report.gates).includes("unverified")) {
      report.status = "candidate-incomplete";
      report.reasonCode = "UNVERIFIED_GATES";
      throw Object.assign(
        new Error(
          "candidate is structurally complete but render/security review gates are unverified",
        ),
        { report, incomplete: true },
      );
    }
    await writeFile(
      path.join(stage, "UPDATE-CANDIDATE.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      { flag: "wx" },
    );
    await rename(stage, output);
    return report;
  } catch (error) {
    await rm(stage, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
};

const preparePreflight = async ({ output, version }) => {
  const tag = `mermaid@${version}`;
  const [coreRaw, cliRaw, tagRaw] = await Promise.all([
    runProcess(
      "npm",
      ["view", `mermaid@${version}`, "version", "dist", "--json"],
      { timeoutMs: 60_000 },
    ),
    runProcess(
      "npm",
      [
        "view",
        `@mermaid-js/mermaid-cli@${version}`,
        "version",
        "dist",
        "--json",
      ],
      { timeoutMs: 60_000 },
    ),
    runProcess(
      "git",
      [
        "ls-remote",
        "https://github.com/mermaid-js/mermaid.git",
        `refs/tags/${tag}*`,
      ],
      { timeoutMs: 60_000 },
    ),
  ]);
  const core = JSON.parse(coreRaw.stdout);
  const cli = JSON.parse(cliRaw.stdout);
  const peeled = tagRaw.stdout
    .split("\n")
    .find((line) => line.endsWith(`refs/tags/${tag}^{}`));
  if (core.version !== version || cli.version !== version || !peeled) {
    throw new Error("registry versions and immutable release tag do not agree");
  }
  const report = {
    schemaVersion: 1,
    status: "candidate-incomplete",
    version,
    output,
    registry: { mermaid: core, cli },
    tag: { name: tag, commit: peeled.split(/\s+/)[0] },
    gates: {
      registryMetadata: "passed",
      immutableTag: "passed",
      exactRuntimeLock: "unverified",
      referenceAndSchemaRefresh: "unverified",
      catalogAndFixtureRefresh: "unverified",
      licenseRefresh: "unverified",
      renderAndVisualReview: "unverified",
      securityAndReleaseNoteReview: "unverified",
    },
    nextAction:
      "Prepare a complete repository-shaped staging root, then rerun with --source-dir and explicit passed render/security gates.",
  };
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, {
    flag: "wx",
  });
  return report;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.sourceDir) {
    const report = await publishCandidate(options);
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }
  const report = await preparePreflight(options);
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = INCOMPLETE_EXIT;
};

main().catch((error) => {
  const report = error.report || {
    schemaVersion: 1,
    status: error.incomplete ? "candidate-incomplete" : "error",
    reasonCode: error.incomplete ? "UNVERIFIED_GATES" : "UPDATE_FAILED",
    message: error.message,
  };
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = error.incomplete ? INCOMPLETE_EXIT : 1;
});
