import assert from "node:assert/strict";
import { mkdtemp, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../../../", import.meta.url));
const updatePath = path.join(
  repoRoot,
  "skills/productivity/ptlam-visualization/scripts/mermaid/update-mermaid.mjs",
);

const run = (args, env = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [updatePath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      const lines = stdout.trim().split("\n").filter(Boolean);
      resolve({ code, stderr, lines, json: JSON.parse(lines.at(-1)) });
    });
  });

test("rejects ranges, prereleases, and missing required arguments", async () => {
  for (const version of ["latest", "^11.16.0", "11.17.0-beta.1"]) {
    const result = await run(["--version", version, "--output", "/tmp/unused"]);
    assert.equal(result.code, 1);
    assert.equal(result.lines.length, 1);
    assert.equal(result.json.status, "error");
    assert.match(result.json.message, /exact stable semantic version/);
  }
  const missing = await run(["--version", "11.16.0"]);
  assert.equal(missing.code, 1);
  assert.match(missing.json.message, /required/);
});

test("a complete prepared capsule is copied atomically only after all gates pass", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "ptlam-update-ready-"));
  const output = path.join(parent, "candidate");
  const result = await run(
    ["--version", "11.16.0", "--source-dir", repoRoot, "--output", output],
    {
      PTLAM_MERMAID_UPDATE_TEST_MODE: "1",
      PTLAM_MERMAID_UPDATE_RENDER_GATE: "passed",
      PTLAM_MERMAID_UPDATE_SECURITY_GATE: "passed",
    },
  );

  assert.equal(result.code, 0);
  assert.equal(result.lines.length, 1);
  assert.equal(result.json.status, "candidate-ready");
  assert.equal(
    result.json.capsuleIdentity,
    "bfd13f4e06c49f05ba139cb83aafb0a1a4e4eb6a14d465a24195f57482d74cb8",
  );
  await Promise.all([
    stat(path.join(output, "UPDATE-CANDIDATE.json")),
    stat(
      path.join(
        output,
        "skills/productivity/ptlam-visualization/references/mermaid/11.16.0/MANIFEST.json",
      ),
    ),
    stat(
      path.join(
        output,
        "skills/productivity/ptlam-visualization/runtime/mermaid/package-lock.json",
      ),
    ),
    stat(
      path.join(
        output,
        "tests/skills/productivity/ptlam-visualization/integration-tests/mermaid/fixtures/flowchart.mmd",
      ),
    ),
  ]);

  const overwrite = await run([
    "--version",
    "11.16.0",
    "--source-dir",
    repoRoot,
    "--output",
    output,
  ]);
  assert.equal(overwrite.code, 1);
  assert.match(overwrite.json.message, /already exists/);
});

test("unverified review gates fail closed and publish nothing", async () => {
  const parent = await mkdtemp(
    path.join(os.tmpdir(), "ptlam-update-unverified-"),
  );
  const output = path.join(parent, "candidate");
  const result = await run([
    "--version",
    "11.16.0",
    "--source-dir",
    repoRoot,
    "--output",
    output,
  ]);

  assert.equal(result.code, 3);
  assert.equal(result.json.status, "candidate-incomplete");
  assert.equal(result.json.gates.renderAndVisualReview, "unverified");
  await assert.rejects(stat(output), { code: "ENOENT" });
});

test("tampered references and mixed runtime versions are rejected", async () => {
  const source = await mkdtemp(path.join(os.tmpdir(), "ptlam-update-source-"));
  const referenceSource = path.join(
    repoRoot,
    "skills/productivity/ptlam-visualization/references/mermaid/11.16.0",
  );
  const runtimeSource = path.join(
    repoRoot,
    "skills/productivity/ptlam-visualization/runtime/mermaid",
  );
  const fixtureSource = path.join(
    repoRoot,
    "tests/skills/productivity/ptlam-visualization/integration-tests/mermaid/fixtures",
  );
  const { cp, mkdir } = await import("node:fs/promises");
  await Promise.all([
    mkdir(
      path.join(
        source,
        "skills/productivity/ptlam-visualization/references/mermaid",
      ),
      { recursive: true },
    ),
    mkdir(
      path.join(source, "skills/productivity/ptlam-visualization/runtime"),
      { recursive: true },
    ),
    mkdir(
      path.join(
        source,
        "tests/skills/productivity/ptlam-visualization/mermaid",
      ),
      { recursive: true },
    ),
  ]);
  await Promise.all([
    cp(
      referenceSource,
      path.join(
        source,
        "skills/productivity/ptlam-visualization/references/mermaid/11.16.0",
      ),
      { recursive: true },
    ),
    cp(
      runtimeSource,
      path.join(
        source,
        "skills/productivity/ptlam-visualization/runtime/mermaid",
      ),
      { recursive: true },
    ),
    cp(
      fixtureSource,
      path.join(
        source,
        "tests/skills/productivity/ptlam-visualization/integration-tests/mermaid/fixtures",
      ),
      { recursive: true },
    ),
  ]);
  await writeFile(
    path.join(
      source,
      "skills/productivity/ptlam-visualization/references/mermaid/11.16.0/index.md",
    ),
    "tampered\n",
  );
  const result = await run([
    "--version",
    "11.16.0",
    "--source-dir",
    source,
    "--output",
    path.join(source, "out"),
  ]);
  assert.equal(result.code, 1);
  assert.match(result.json.message, /reference hash mismatch/);
});
