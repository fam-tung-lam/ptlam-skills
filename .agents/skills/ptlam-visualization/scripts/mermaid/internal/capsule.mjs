import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const skillRoot = fileURLToPath(new URL("../../../", import.meta.url));
export const manifestPath = path.join(
  skillRoot,
  "references/mermaid/11.16.0/MANIFEST.json",
);

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

const resolveInside = (root, relativePath, label) => {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)) {
    throw new Error(`${label} must be a relative path`);
  }
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} escapes its authority root`);
  }
  return resolved;
};

export const calculateCapsuleIdentity = (manifest) => {
  const { capsuleIdentity: _ignored, ...input } = manifest;
  return sha256(JSON.stringify(canonicalize(input)));
};

export const resolveCapsule = async () => {
  const manifestSource = await readFile(manifestPath);
  const manifest = JSON.parse(manifestSource.toString("utf8"));
  const identity = calculateCapsuleIdentity(manifest);

  if (manifest.schemaVersion !== 1) {
    throw new Error(`unsupported manifest schema ${manifest.schemaVersion}`);
  }
  if (identity !== manifest.capsuleIdentity?.value) {
    throw new Error("active Mermaid manifest capsule identity is invalid");
  }
  if (
    manifest.capsule?.mermaidVersion !== "11.16.0" ||
    manifest.cli?.version !== "11.16.0"
  ) {
    throw new Error("active capsule does not pin Mermaid core and CLI 11.16.0");
  }

  const packagePath = resolveInside(
    path.dirname(skillRoot),
    path.relative(
      path.dirname(skillRoot),
      path.join(skillRoot, "runtime/mermaid/package.json"),
    ),
    "runtime package path",
  );
  const lockPath = resolveInside(
    path.dirname(skillRoot),
    path.relative(
      path.dirname(skillRoot),
      path.join(skillRoot, "runtime/mermaid/package-lock.json"),
    ),
    "runtime lock path",
  );
  const [packageSource, lockSource] = await Promise.all([
    readFile(packagePath),
    readFile(lockPath),
  ]);

  if (sha256(packageSource) !== manifest.runtimeInputs.packageSha256) {
    throw new Error("runtime package hash does not match the active manifest");
  }
  if (sha256(lockSource) !== manifest.runtimeInputs.lockSha256) {
    throw new Error("runtime lock hash does not match the active manifest");
  }

  const lock = JSON.parse(lockSource.toString("utf8"));
  for (const [name, version] of [
    ["mermaid", "11.16.0"],
    ["@mermaid-js/mermaid-cli", "11.16.0"],
    ["puppeteer", manifest.browser.package.version],
    ["puppeteer-core", manifest.browser.corePackage.version],
  ]) {
    if (lock.packages?.[`node_modules/${name}`]?.version !== version) {
      throw new Error(`runtime lock does not resolve ${name}@${version}`);
    }
  }

  const referenceRoot = path.join(skillRoot, "references/mermaid/11.16.0");
  for (const file of manifest.references.files) {
    const absolute = resolveInside(referenceRoot, file.path, "reference path");
    if (sha256(await readFile(absolute)) !== file.sha256) {
      throw new Error(`reference hash mismatch: ${file.path}`);
    }
  }
  for (const family of manifest.catalog) {
    const fixture = resolveInside(
      path.dirname(path.dirname(path.dirname(skillRoot))),
      family.fixturePath,
      "fixture path",
    );
    if (sha256(await readFile(fixture)) !== family.fixtureSha256) {
      throw new Error(`fixture hash mismatch: ${family.id}`);
    }
  }

  return {
    identity,
    lock,
    lockPath,
    lockSource,
    manifest,
    manifestSha256: sha256(manifestSource),
    packagePath,
    packageSource,
    sha256,
  };
};

export const resolvePathInside = resolveInside;
