import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../../..");
const unifiedIdentity = "ptlam-visualization";
const legacyIdentities = [
  ["ptlam", "visualization", "with", "html"].join("-"),
  ["ptlam", "visualization", "with", "mermaid"].join("-"),
];
const historicalPrd = join(
  repositoryRoot,
  "docs/prds",
  ["ptlam", "visualization", "with", "html", "v1", "prd.md"].join("-"),
);
const historicalPrdSha256 =
  "dfb1e700be03b1e379c853176e221e936954f07ebd6790bb6d7bbde9b1037974";

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory() ? walkFiles(path) : [path];
      }),
    )
  ).flat();
}

async function activeIdentityFiles() {
  const roots = [".agents", ".claude-plugin", ".github", "skills", "tests"];
  const nested = await Promise.all(
    roots.map((root) => walkFiles(join(repositoryRoot, root))),
  );
  return [
    join(repositoryRoot, "README.md"),
    join(repositoryRoot, "package.json"),
    ...nested.flat(),
  ].filter((path) => !/\.(?:pdf|png)$/iu.test(path));
}

function frontmatterName(source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/u)?.[1];
  return frontmatter?.match(/^name:\s*([^\n]+)$/mu)?.[1].trim();
}

test("active repository surfaces contain no legacy public identity", async () => {
  const hits = [];
  for (const path of await activeIdentityFiles()) {
    const source = await readFile(path, "utf8");
    for (const identity of legacyIdentities) {
      if (source.includes(identity)) {
        hits.push(`${relative(repositoryRoot, path)}: ${identity}`);
      }
    }
  }
  assert.deepEqual(hits, []);
});

test("the historical HTML PRD remains byte-for-byte unchanged", async () => {
  const source = await readFile(historicalPrd);
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    historicalPrdSha256,
  );
  assert.match(source.toString("utf8"), /^# PRD:/u);
});

test("one unified skill is discoverable through every public registration", async () => {
  const skillFiles = (await walkFiles(join(repositoryRoot, "skills"))).filter(
    (path) => path.endsWith("/SKILL.md"),
  );
  const namedSkills = await Promise.all(
    skillFiles.map(async (path) => ({
      path: relative(repositoryRoot, path),
      name: frontmatterName(await readFile(path, "utf8")),
    })),
  );
  assert.deepEqual(
    namedSkills.filter(({ name }) => name === unifiedIdentity),
    [
      {
        path: "skills/productivity/ptlam-visualization/SKILL.md",
        name: unifiedIdentity,
      },
    ],
  );
  for (const legacyIdentity of legacyIdentities) {
    assert.equal(
      namedSkills.some(({ name }) => name === legacyIdentity),
      false,
    );
  }

  const [pluginSource, rootCatalog, productivityCatalog, metadata] =
    await Promise.all([
      readFile(join(repositoryRoot, ".claude-plugin/plugin.json"), "utf8"),
      readFile(join(repositoryRoot, "README.md"), "utf8"),
      readFile(join(repositoryRoot, "skills/README.md"), "utf8"),
      readFile(
        join(
          repositoryRoot,
          "skills/productivity/ptlam-visualization/agents/openai.yaml",
        ),
        "utf8",
      ),
    ]);
  const plugin = JSON.parse(pluginSource);
  const registration = "./skills/productivity/ptlam-visualization";
  assert.equal(
    plugin.skills.filter((entry) => entry === registration).length,
    1,
  );
  assert.equal(
    plugin.skills.filter((entry) => entry.includes(unifiedIdentity)).length,
    1,
  );
  assert.equal(
    (rootCatalog.match(/^\| `ptlam-visualization`[ \t]+\|/gmu) ?? []).length,
    1,
  );
  assert.equal(
    (productivityCatalog.match(/`ptlam-visualization`/gu) ?? []).length,
    1,
  );
  assert.equal((metadata.match(/display_name:/gu) ?? []).length, 1);
  assert.match(metadata, /display_name: "PTLam Visualization"/u);
  assert.equal((metadata.match(/\$ptlam-visualization/gu) ?? []).length, 1);
  assert.match(
    metadata,
    /short_description: "Create polished HTML and Mermaid visuals"/u,
  );
});

test("tracked integration gallery stays bounded to review deliverables", async () => {
  const resultRoot = join(
    repositoryRoot,
    "tests/skills/productivity/ptlam-visualization/integration-tests/results/gallery",
  );
  const files = (await walkFiles(resultRoot))
    .map((path) => relative(resultRoot, path).split("\\").join("/"))
    .toSorted();
  assert.deepEqual(files, [
    "combined-case/ptlam-visualization-combined-runtime.html",
    "html-case/release-readiness-review.html",
    "index.html",
    "mermaid-cases/architecture-assets/service-architecture.svg",
    "mermaid-cases/checkout-sequence.png",
    "mermaid-cases/job-lifecycle.pdf",
    "mermaid-cases/release-flow-native.md",
    "mermaid-cases/release-flow.svg",
    "mermaid-cases/service-architecture.md",
  ]);

  const gallery = await readFile(join(resultRoot, "index.html"), "utf8");
  assert.doesNotMatch(gallery, /(?:\/Users\/|\.ptlam\/)/u);
  assert.doesNotMatch(
    gallery,
    /\b(?:href|src|data)=["']file:\/\//iu,
  );
  for (const path of files.filter((path) => path !== "index.html")) {
    assert.match(gallery, new RegExp(path.replaceAll(".", String.raw`\.`), "u"));
  }

  const totalBytes = (
    await Promise.all(files.map((path) => readFile(join(resultRoot, path))))
  ).reduce((total, source) => total + source.byteLength, 0);
  assert.ok(totalBytes < 500_000, `integration result is ${totalBytes} bytes`);
});
