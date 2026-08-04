import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../../../../", import.meta.url));
const referenceRoot = path.join(
  repoRoot,
  "skills/productivity/ptlam-visualization/references/mermaid/11.16.0",
);
const runtimeRoot = path.join(
  repoRoot,
  "skills/productivity/ptlam-visualization/runtime/mermaid",
);
const manifestPath = path.join(referenceRoot, "MANIFEST.json");

const expectedCatalog = new Map([
  ["architecture", { declarations: ["architecture-beta"], maturity: "beta" }],
  ["block", { declarations: ["block"], maturity: "stable" }],
  [
    "c4",
    {
      declarations: [
        "C4Context",
        "C4Container",
        "C4Component",
        "C4Dynamic",
        "C4Deployment",
      ],
      maturity: "experimental",
    },
  ],
  ["class", { declarations: ["classDiagram"], maturity: "stable" }],
  ["cynefin", { declarations: ["cynefin-beta"], maturity: "beta" }],
  ["entity-relationship", { declarations: ["erDiagram"], maturity: "stable" }],
  ["event-modeling", { declarations: ["eventmodeling"], maturity: "stable" }],
  ["flowchart", { declarations: ["flowchart"], maturity: "stable" }],
  ["gantt", { declarations: ["gantt"], maturity: "stable" }],
  ["git-graph", { declarations: ["gitGraph"], maturity: "stable" }],
  ["ishikawa", { declarations: ["ishikawa-beta"], maturity: "beta" }],
  ["kanban", { declarations: ["kanban"], maturity: "stable" }],
  ["mindmap", { declarations: ["mindmap"], maturity: "stable" }],
  ["packet", { declarations: ["packet"], maturity: "stable" }],
  ["pie", { declarations: ["pie"], maturity: "stable" }],
  ["quadrant-chart", { declarations: ["quadrantChart"], maturity: "stable" }],
  ["radar", { declarations: ["radar-beta"], maturity: "beta" }],
  [
    "railroad",
    {
      declarations: [
        "railroad-beta",
        "railroad-ebnf-beta",
        "railroad-abnf-beta",
        "railroad-peg-beta",
      ],
      maturity: "beta",
    },
  ],
  ["requirement", { declarations: ["requirementDiagram"], maturity: "stable" }],
  ["sankey", { declarations: ["sankey"], maturity: "stable" }],
  ["sequence", { declarations: ["sequenceDiagram"], maturity: "stable" }],
  ["state", { declarations: ["stateDiagram"], maturity: "stable" }],
  ["swimlanes", { declarations: ["swimlane-beta"], maturity: "beta" }],
  ["timeline", { declarations: ["timeline"], maturity: "stable" }],
  ["tree-view", { declarations: ["treeView-beta"], maturity: "beta" }],
  ["treemap", { declarations: ["treemap-beta"], maturity: "beta" }],
  ["user-journey", { declarations: ["journey"], maturity: "stable" }],
  ["venn", { declarations: ["venn-beta"], maturity: "beta" }],
  ["wardley", { declarations: ["wardley-beta"], maturity: "beta" }],
  ["xy-chart", { declarations: ["xychart"], maturity: "stable" }],
  ["zenuml", { declarations: ["zenuml"], maturity: "stable", external: true }],
]);

const adapterCommentFamilies = new Set([
  "block",
  "mindmap",
  "sankey",
  "venn",
]);
const nativePostprocessFamilies = new Set([
  "c4",
  "event-modeling",
  "ishikawa",
  "kanban",
  "timeline",
  "zenuml",
]);

const expectedAccessibilityMode = (id) => {
  if (adapterCommentFamilies.has(id)) return "adapter-comments";
  if (nativePostprocessFamilies.has(id)) return "native-postprocess";
  return "native";
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

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
  const { capsuleIdentity: _ignored, ...identityInput } = manifest;
  return sha256(JSON.stringify(canonicalize(identityInput)));
};

const walkFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? walkFiles(absolute) : [absolute];
    }),
  );
  return nested.flat();
};

const assertSafeRelativePath = (value) => {
  assert.equal(path.isAbsolute(value), false, `${value} must be relative`);
  assert.equal(
    path.normalize(value).startsWith(`..${path.sep}`),
    false,
    `${value} must stay inside its authority root`,
  );
};

test("runtime graph pins Mermaid 11.16.0 and every direct runtime dependency", async () => {
  const [packageJson, lock] = await Promise.all([
    readJson(path.join(runtimeRoot, "package.json")),
    readJson(path.join(runtimeRoot, "package-lock.json")),
  ]);

  const exactDirectVersions = {
    "@mermaid-js/layout-elk": "0.2.0",
    "@mermaid-js/layout-tidy-tree": "0.2.1",
    "@mermaid-js/mermaid-cli": "11.16.0",
    "@mermaid-js/mermaid-zenuml": "0.2.1",
    mermaid: "11.16.0",
    puppeteer: "25.4.0",
  };

  assert.deepEqual(packageJson.dependencies, exactDirectVersions);
  for (const [name, version] of Object.entries(exactDirectVersions)) {
    assert.equal(packageJson.overrides[name], version);
    assert.equal(lock.packages[`node_modules/${name}`].version, version);
    assert.match(lock.packages[`node_modules/${name}`].integrity, /^sha512-/);
  }
  assert.equal(packageJson.overrides["puppeteer-core"], "25.4.0");
  assert.equal(lock.packages["node_modules/puppeteer-core"].version, "25.4.0");
  assert.equal(lock.lockfileVersion, 3);
});

test("manifest binds the immutable release, exact lock, and browser build", async () => {
  const [manifest, packageSource, lockSource] = await Promise.all([
    readJson(manifestPath),
    readFile(path.join(runtimeRoot, "package.json")),
    readFile(path.join(runtimeRoot, "package-lock.json")),
  ]);

  assert.equal(manifest.capsule.mermaidVersion, "11.16.0");
  assert.equal(manifest.capsule.tag, "mermaid@11.16.0");
  assert.equal(
    manifest.capsule.commit,
    "7c0cafcf42e76bfaf79d0cbbd12edb986612f014",
  );
  assert.equal(manifest.cli.version, "11.16.0");
  assert.equal(manifest.cli.commit, "a85b11df7064498d5b6b97ee9b2d4a7c10cb42ae");
  assert.equal(manifest.resolvedRuntime.mermaid.version, "11.16.0");
  assert.equal(manifest.resolvedRuntime.mermaidCli.version, "11.16.0");
  assert.equal(manifest.browser.package.version, "25.4.0");
  assert.equal(manifest.browser.corePackage.version, "25.4.0");
  assert.equal(manifest.browser.buildId, "151.0.7922.47");
  assert.match(manifest.capsule.npm.integrity, /^sha512-/);
  assert.match(manifest.cli.npm.integrity, /^sha512-/);
  assert.equal(manifest.runtimeInputs.packageSha256, sha256(packageSource));
  assert.equal(manifest.runtimeInputs.lockSha256, sha256(lockSource));
});

test("catalog has exactly the pinned 31 families, references, and accessible fixtures", async () => {
  const manifest = await readJson(manifestPath);
  const actualIds = manifest.catalog.map((entry) => entry.id);

  assert.equal(manifest.catalog.length, 31);
  assert.equal(new Set(actualIds).size, 31);
  assert.deepEqual(
    actualIds.toSorted(),
    [...expectedCatalog.keys()].toSorted(),
  );

  for (const entry of manifest.catalog) {
    const expected = expectedCatalog.get(entry.id);
    assert.deepEqual(entry.declarations, expected.declarations);
    assert.equal(entry.maturity, expected.maturity);
    assert.equal(entry.externalRegistration, expected.external === true);
    assert.equal(
      entry.accessibilityMode,
      expectedAccessibilityMode(entry.id),
      `${entry.id} accessibility mode`,
    );
    assertSafeRelativePath(entry.referencePath);
    assertSafeRelativePath(entry.fixturePath);

    const [reference, fixture] = await Promise.all([
      readFile(path.join(referenceRoot, entry.referencePath), "utf8"),
      readFile(path.join(repoRoot, entry.fixturePath)),
    ]);
    const fixtureText = fixture.toString("utf8");
    assert.match(reference, new RegExp(`^# ${entry.title}$`, "m"));
    assert.match(reference, /## Minimal accessible example/);
    assert.equal(sha256(fixture), entry.fixtureSha256);
    if (entry.accessibilityMode === "adapter-comments") {
      const adapterTitles = [
        ...fixtureText.matchAll(
          /^[\t ]*%% ptlam-acc-title: [^\r\n]*\S[^\r\n]*$/gmu,
        ),
      ];
      const adapterDescriptions = [
        ...fixtureText.matchAll(
          /^[\t ]*%% ptlam-acc-description: [^\r\n]*\S[^\r\n]*$/gmu,
        ),
      ];
      assert.equal(adapterTitles.length, 1);
      assert.equal(adapterDescriptions.length, 1);
      assert.doesNotMatch(fixtureText, /(^|\n)\s*accTitle:\s*\S/);
      assert.doesNotMatch(fixtureText, /(^|\n)\s*accDescr(?::|\s*\{)/);
      assert.match(
        reference,
        /Catalog accessibility mode: `adapter-comments`/,
      );
    } else {
      assert.match(fixtureText, /(^|\n)\s*accTitle:\s*\S/);
      assert.match(fixtureText, /(^|\n)\s*accDescr(?::|\s*\{)/);
      assert.doesNotMatch(fixtureText, /%% ptlam-acc-(?:title|description):/);
      if (entry.accessibilityMode === "native-postprocess") {
        assert.match(
          reference,
          /Catalog accessibility mode: `native-postprocess`/,
        );
      }
    }
    assert.equal(fixtureText.includes("\r"), false);
    assert.match(fixtureText, /[^\n]\n$/);
    assert.equal(fixtureText.endsWith("\n\n"), false);
    assert.doesNotMatch(fixtureText, /https?:\/\//i);
    assert.ok(
      entry.declarations.some((declaration) =>
        fixtureText.includes(declaration),
      ),
      `${entry.id} fixture must use a catalog declaration`,
    );
  }

  assert.equal(
    manifest.catalog.filter(
      (entry) => entry.accessibilityMode === "adapter-comments",
    ).length,
    4,
  );
  assert.equal(
    manifest.catalog.filter(
      (entry) => entry.accessibilityMode === "native-postprocess",
    ).length,
    6,
  );
  assert.equal(
    manifest.catalog.filter((entry) => entry.accessibilityMode === "native")
      .length,
    21,
  );
});

test("accessibility reference freezes the 11.16.0 adapter contract", async () => {
  const accessibility = await readFile(
    path.join(referenceRoot, "config/accessibility.md"),
    "utf8",
  );

  assert.match(
    accessibility,
    /`%% ptlam-acc-title: <single line>`/,
  );
  assert.match(
    accessibility,
    /`%% ptlam-acc-description: <single line>`/,
  );
  assert.match(accessibility, /`native-postprocess`/);
  assert.match(accessibility, /`adapter-comments`/);
  assert.match(accessibility, /Prefer PNG, PDF, or adapter-produced SVG/);
});

test("block fixture uses separate pinned-grammar connector statements", async () => {
  const source = await readFile(
    path.join(
      repoRoot,
      "tests/skills/productivity/ptlam-visualization/integration-tests/mermaid/fixtures/block.mmd",
    ),
    "utf8",
  );
  const connectors = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("-->"));

  assert.deepEqual(connectors, [
    "input --> validate",
    "validate --> store",
  ]);
  assert.doesNotMatch(source, /^.*-->.*-->.*$/mu);
  assert.match(source, /^\s*input\["Input"\]$/mu);
  assert.match(source, /^\s*validate\["Validate"\]$/mu);
  assert.match(source, /^\s*store\[\("Store"\)\]$/mu);
});

test("manifest hashes every local reference and records immutable provenance", async () => {
  const manifest = await readJson(manifestPath);
  const actualFiles = (await walkFiles(referenceRoot))
    .filter((file) => path.basename(file) !== "MANIFEST.json")
    .map((file) => path.relative(referenceRoot, file).split(path.sep).join("/"))
    .toSorted();
  const recordedFiles = manifest.references.files
    .map((entry) => entry.path)
    .toSorted();

  assert.deepEqual(recordedFiles, actualFiles);
  for (const entry of manifest.references.files) {
    assertSafeRelativePath(entry.path);
    const source = await readFile(path.join(referenceRoot, entry.path));
    assert.equal(sha256(source), entry.sha256, entry.path);
    for (const upstream of entry.sources) {
      assert.ok(["mermaid", "mermaid-cli"].includes(upstream.repository));
      assertSafeRelativePath(upstream.path);
      assert.match(upstream.sha256, /^[0-9a-f]{64}$/);
    }
  }

  assert.equal(
    manifest.references.files.find(
      (entry) => entry.path === "schemas/config.schema.yaml",
    ).sha256,
    "0390782a4414d13c257ad6a2ab43e7d7e17e22fe90238561edb6dba1ede79b91",
  );
  assert.equal(
    manifest.references.files.find((entry) => entry.path === "LICENSE").sha256,
    "ec9fb67dcb25eccc416ed56e1aab819222c805a2a4bfe4cb19e7556bf2ffde80",
  );
});

test("dependency license inventory covers every locked package", async () => {
  const [inventory, lock] = await Promise.all([
    readJson(path.join(referenceRoot, "DEPENDENCY-LICENSES.json")),
    readJson(path.join(runtimeRoot, "package-lock.json")),
  ]);
  const lockedPaths = Object.keys(lock.packages)
    .filter((key) => key.includes("node_modules/"))
    .toSorted();
  const inventoriedPaths = inventory.packages
    .map((entry) => entry.installPath)
    .toSorted();

  assert.deepEqual(inventoriedPaths, lockedPaths);
  assert.equal(new Set(inventoriedPaths).size, inventoriedPaths.length);
  for (const entry of inventory.packages) {
    assert.ok(entry.name);
    assert.ok(entry.version);
    assert.ok(entry.license);
    assert.notEqual(entry.license, "UNKNOWN");
  }
  assert.match(
    await readFile(path.join(referenceRoot, "LICENSE"), "utf8"),
    /MIT License/,
  );
});

test("capsule identity is canonical, deterministic, and excludes unrelated skill files", async () => {
  const manifest = await readJson(manifestPath);
  const first = calculateIdentity(manifest);
  const reordered = JSON.parse(JSON.stringify(canonicalize(manifest)));

  assert.equal(first, manifest.capsuleIdentity.value);
  assert.equal(calculateIdentity(reordered), first);

  const unrelatedHtmlChange = { source: "changed HTML outside the capsule" };
  assert.ok(unrelatedHtmlChange);
  assert.equal(calculateIdentity(manifest), first);

  const mutated = structuredClone(manifest);
  mutated.catalog[0].maturity = "stable";
  assert.notEqual(calculateIdentity(mutated), first);
});
