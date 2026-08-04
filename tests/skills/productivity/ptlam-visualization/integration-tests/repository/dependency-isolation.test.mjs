import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../../..");
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

async function modulePathsUnder(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await modulePathsUnder(path)));
    } else if (entry.isFile() && entry.name.endsWith(".mjs")) {
      paths.push(path);
    }
  }
  return paths.toSorted();
}

test("development and Mermaid lock graphs have reviewed license evidence", async () => {
  // Given the repository and pinned Mermaid dependency evidence.
  const evidencePaths = [
    join(repositoryRoot, "package.json"),
    join(repositoryRoot, "package-lock.json"),
    join(runtimeRoot, "package-lock.json"),
    join(referenceRoot, "DEPENDENCY-LICENSES.json"),
  ];

  // When both lock graphs and the reviewed inventory are compared.
  const [rootPackage, rootLock, runtimeLock, inventory] = await Promise.all(
    evidencePaths.map((path) => readJson(path)),
  );

  // Then every installed dependency is exact, licensed, and inventoried.
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
  // Given the complete HTML command and local-module tree.
  const modulePaths = await modulePathsUnder(join(skillRoot, "scripts/html"));

  // When every module dependency and executable network capability is inspected.
  const sources = await Promise.all(
    modulePaths.map((path) => readFile(path, "utf8")),
  );

  // Then the HTML capability depends only on Node.js and its local modules.
  for (const [index, source] of sources.entries()) {
    assert.deepEqual(
      externalImports(source),
      [],
      `${modulePaths[index]} must use only Node.js and local modules`,
    );
    assert.doesNotMatch(
      source,
      /(?:scripts|runtime)[/\\]mermaid|setup\.mjs|render\.mjs|@mermaid|mermaid-cli|\bfetch\s*\(|https?:\/\//iu,
    );
  }
});

test("lazy Mermaid setup stays exact, isolated, and separate from HTML", async () => {
  // Given the active runtime package, setup command, and capability instructions.
  const evidence = {
    runtimePackage: join(runtimeRoot, "package.json"),
    setup: join(skillRoot, "scripts/mermaid/setup.mjs"),
    skill: join(skillRoot, "SKILL.md"),
  };

  // When their exact versions, install isolation, and route ownership are read.
  const [runtimePackage, setup, skill] = await Promise.all([
    readJson(evidence.runtimePackage),
    readFile(evidence.setup, "utf8"),
    readFile(evidence.skill, "utf8"),
  ]);

  // Then Mermaid stays locked and setup remains outside HTML-only execution.
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
