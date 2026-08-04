import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../..");
const skillRoot = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization",
);
const runtimeRoot = join(skillRoot, "runtime/mermaid");
const referenceRoot = join(skillRoot, "references/mermaid/11.16.0");

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

function externalImports(source) {
  const staticImports = [...source.matchAll(/\bfrom\s+["']([^"']+)["']/gu)].map(
    (match) => match[1],
  );
  const dynamicImports = [
    ...source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu),
  ].map((match) => match[1]);
  return [...staticImports, ...dynamicImports].filter(
    (specifier) => !specifier.startsWith("node:") && !specifier.startsWith("."),
  );
}

test("development and Mermaid lock graphs have reviewed license evidence", async () => {
  const [rootPackage, rootLock, runtimeLock, inventory] = await Promise.all([
    readJson(join(repositoryRoot, "package.json")),
    readJson(join(repositoryRoot, "package-lock.json")),
    readJson(join(runtimeRoot, "package-lock.json")),
    readJson(join(referenceRoot, "DEPENDENCY-LICENSES.json")),
  ]);

  assert.equal(rootPackage.dependencies, undefined);
  for (const [name, version] of Object.entries(rootPackage.devDependencies)) {
    const locked = rootLock.packages[`node_modules/${name}`];
    assert.equal(locked.version, version);
    assert.ok(locked.license, `${name} must declare a development license`);
    assert.match(locked.integrity, /^sha512-/u);
  }
  for (const [path, entry] of Object.entries(rootLock.packages)) {
    if (path === "") continue;
    assert.ok(entry.license, `${path} must declare a license`);
  }

  const lockedPaths = Object.keys(runtimeLock.packages)
    .filter((path) => path.includes("node_modules/"))
    .toSorted();
  const inventoriedPaths = inventory.packages
    .map(({ installPath }) => installPath)
    .toSorted();
  assert.deepEqual(inventoriedPaths, lockedPaths);
  assert.equal(new Set(inventoriedPaths).size, inventoriedPaths.length);
  assert.match(inventory.reviewedAt, /^\d{4}-\d{2}-\d{2}$/u);
  assert.match(inventory.policy, /notices[\s\S]*package license/iu);
  assert.ok(
    inventory.packages.every(({ license }) => license && license !== "UNKNOWN"),
  );

  const missingLockLicenses = Object.entries(runtimeLock.packages)
    .filter(([path, entry]) => path.includes("node_modules/") && !entry.license)
    .map(([path, entry]) => {
      const name = path.slice(path.lastIndexOf("node_modules/") + 13);
      return `${name}@${entry.version}`;
    })
    .toSorted();
  const manualReviews = inventory.manualReviews
    .map(({ package: packageName }) => packageName)
    .filter((packageName) => missingLockLicenses.includes(packageName))
    .toSorted();
  assert.deepEqual(manualReviews, missingLockLicenses);
  for (const review of inventory.manualReviews) {
    assert.ok(review.license && review.license !== "UNKNOWN");
    assert.match(review.evidence, /https:\/\//u);
  }
});

test("HTML runtime commands have no external package or Mermaid runtime import", async () => {
  const commandPaths = [
    "scripts/html/scaffold.mjs",
    "scripts/html/validate.mjs",
    "scripts/html/extract-mermaid.mjs",
    "scripts/html/lib/embedded-mermaid-record.mjs",
  ].map((path) => join(skillRoot, path));
  const sources = await Promise.all(
    commandPaths.map((path) => readFile(path, "utf8")),
  );
  for (const [index, source] of sources.entries()) {
    assert.deepEqual(
      externalImports(source),
      [],
      `${commandPaths[index]} must use only Node.js and local modules`,
    );
    assert.doesNotMatch(
      source,
      /(?:scripts|runtime)[/\\]mermaid|setup\.mjs|@mermaid|mermaid-cli/iu,
    );
  }
  assert.doesNotMatch(sources[0], /\bfetch\s*\(|https?:\/\//iu);
  assert.doesNotMatch(sources[1], /\bfetch\s*\(|https?:\/\//iu);
});

test("lazy Mermaid setup stays exact, isolated, and separate from HTML", async () => {
  const [runtimePackage, setup, skill] = await Promise.all([
    readJson(join(runtimeRoot, "package.json")),
    readFile(join(skillRoot, "scripts/mermaid/setup.mjs"), "utf8"),
    readFile(join(skillRoot, "SKILL.md"), "utf8"),
  ]);
  assert.equal(runtimePackage.dependencies.mermaid, "11.16.0");
  assert.equal(
    runtimePackage.dependencies["@mermaid-js/mermaid-cli"],
    "11.16.0",
  );
  assert.match(
    setup,
    /\["ci", "--ignore-scripts", "--no-audit", "--no-fund"\]/u,
  );
  assert.match(setup, /npm_config_cache: path\.join\(stage, "npm-cache"\)/u);
  assert.match(setup, /PUPPETEER_SKIP_DOWNLOAD: "true"/u);
  assert.match(
    skill,
    /Never read[\s\S]*Mermaid version references[\s\S]*inspect its cache[\s\S]*run its setup[\s\S]*HTML-only request/iu,
  );
});
