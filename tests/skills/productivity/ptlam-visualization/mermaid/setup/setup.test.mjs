import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../../../../", import.meta.url));
const setupPath = path.join(
  repoRoot,
  "skills/productivity/ptlam-visualization/scripts/mermaid/setup.mjs",
);
const fakeInstaller = path.join(
  repoRoot,
  "tests/skills/productivity/ptlam-visualization/mermaid/setup/fixtures/fake-installer.mjs",
);
const capsuleIdentity =
  "7e9e2e4f7e1de7c1fa4adb5610e20bd940830d22a530638489f52a63f711d581";

const runSetup = (mode, cacheRoot, extraEnv = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [setupPath, mode], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PTLAM_MERMAID_TEST_MODE: "1",
        PTLAM_MERMAID_CACHE_ROOT: cacheRoot,
        PTLAM_MERMAID_TEST_INSTALLER: fakeInstaller,
        PTLAM_MERMAID_TEST_TIMEOUT_MS: "5000",
        ...extraEnv,
      },
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
      resolve({
        code,
        stderr,
        stdout,
        lines,
        json: lines.length === 1 ? JSON.parse(lines[0]) : null,
      });
    });
  });

const targetFor = (cacheRoot) =>
  path.join(
    cacheRoot,
    "ptlam-skills/ptlam-visualization/mermaid",
    capsuleIdentity,
  );

const assertReadyShape = async (result) => {
  assert.equal(result.code, 0);
  assert.equal(result.lines.length, 1);
  assert.deepEqual(Object.keys(result.json), [
    "schemaVersion",
    "status",
    "capsuleIdentity",
    "mermaidVersion",
    "cliVersion",
    "runtimeRoot",
    "cliEntryPath",
    "browserExecutablePath",
    "browserVersion",
  ]);
  assert.equal(result.json.schemaVersion, 1);
  assert.equal(result.json.status, "ready");
  assert.equal(result.json.capsuleIdentity, capsuleIdentity);
  assert.equal(result.json.mermaidVersion, "11.16.0");
  assert.equal(result.json.cliVersion, "11.16.0");
  assert.equal(result.json.browserVersion, "151.0.7922.47");
  for (const key of ["runtimeRoot", "cliEntryPath", "browserExecutablePath"]) {
    assert.equal(path.isAbsolute(result.json[key]), true);
    await stat(result.json[key]);
  }
};

test("--check is read-only and reports an absent capsule precisely", async () => {
  const parent = await mkdtemp(path.join(os.tmpdir(), "ptlam-setup-check-"));
  const cacheRoot = path.join(parent, "not-created");
  const result = await runSetup("--check", cacheRoot);

  assert.equal(result.code, 2);
  assert.equal(result.stderr, "");
  assert.equal(result.lines.length, 1);
  assert.equal(result.json.status, "not-ready");
  assert.equal(result.json.reasonCode, "CACHE_MISSING");
  await assert.rejects(stat(cacheRoot), { code: "ENOENT" });
});

test("--ensure installs once, publishes atomically, and reuses offline", async () => {
  const cacheRoot = await mkdtemp(path.join(os.tmpdir(), "ptlam-setup-reuse-"));
  const countFile = path.join(cacheRoot, "install-count.txt");
  const env = { PTLAM_MERMAID_TEST_INSTALL_COUNT_FILE: countFile };

  const first = await runSetup("--ensure", cacheRoot, env);
  await assertReadyShape(first);
  assert.match(first.stderr, /running controlled test installer/);
  assert.equal(await readFile(countFile, "utf8"), "install\n");

  const second = await runSetup("--ensure", cacheRoot, {
    ...env,
    PTLAM_MERMAID_FAKE_FAIL: "1",
  });
  await assertReadyShape(second);
  assert.equal(second.stderr, "");
  assert.equal(await readFile(countFile, "utf8"), "install\n");

  const parentEntries = await readdir(path.dirname(targetFor(cacheRoot)));
  assert.deepEqual(parentEntries, [capsuleIdentity]);
});

test("concurrent ensure calls perform one installation", async () => {
  const cacheRoot = await mkdtemp(
    path.join(os.tmpdir(), "ptlam-setup-concurrent-"),
  );
  const countFile = path.join(cacheRoot, "install-count.txt");
  const env = {
    PTLAM_MERMAID_TEST_INSTALL_COUNT_FILE: countFile,
    PTLAM_MERMAID_FAKE_DELAY_MS: "350",
  };
  const results = await Promise.all([
    runSetup("--ensure", cacheRoot, env),
    runSetup("--ensure", cacheRoot, env),
    runSetup("--ensure", cacheRoot, env),
  ]);

  for (const result of results) await assertReadyShape(result);
  assert.equal(await readFile(countFile, "utf8"), "install\n");
});

test("corrupted installed versions are rejected and repaired without in-place mutation", async () => {
  const cacheRoot = await mkdtemp(
    path.join(os.tmpdir(), "ptlam-setup-repair-"),
  );
  const countFile = path.join(cacheRoot, "install-count.txt");
  const env = { PTLAM_MERMAID_TEST_INSTALL_COUNT_FILE: countFile };
  await assertReadyShape(await runSetup("--ensure", cacheRoot, env));

  const target = targetFor(cacheRoot);
  await writeFile(
    path.join(target, "runtime/node_modules/mermaid/package.json"),
    '{"name":"mermaid","version":"99.0.0"}\n',
  );
  const check = await runSetup("--check", cacheRoot, env);
  assert.equal(check.code, 2);
  assert.equal(check.json.reasonCode, "CACHE_CORE_VERSION");

  const repaired = await runSetup("--ensure", cacheRoot, env);
  await assertReadyShape(repaired);
  assert.equal(await readFile(countFile, "utf8"), "install\ninstall\n");
  assert.ok(
    (await readdir(path.dirname(target))).some((entry) =>
      entry.startsWith(`${capsuleIdentity}.invalid-`),
    ),
  );
});

test("version and atomic-publication failures leave no ready target", async () => {
  const badVersionRoot = await mkdtemp(
    path.join(os.tmpdir(), "ptlam-setup-bad-version-"),
  );
  const badVersion = await runSetup("--ensure", badVersionRoot, {
    PTLAM_MERMAID_FAKE_BROWSER_VERSION: "0.0.0.0",
  });
  assert.equal(badVersion.code, 1);
  assert.equal(badVersion.json.status, "error");
  assert.equal(badVersion.json.reasonCode, "INSTALLED_BROWSER_VERSION");
  await assert.rejects(stat(targetFor(badVersionRoot)), { code: "ENOENT" });

  const atomicRoot = await mkdtemp(
    path.join(os.tmpdir(), "ptlam-setup-atomic-"),
  );
  const atomic = await runSetup("--ensure", atomicRoot, {
    PTLAM_MERMAID_TEST_FAIL_ATOMIC: "1",
  });
  assert.equal(atomic.code, 1);
  assert.equal(atomic.json.reasonCode, "ATOMIC_PUBLICATION_FAILED");
  await assert.rejects(stat(targetFor(atomicRoot)), { code: "ENOENT" });
});

test("installer failure and timeout clean temporary state and release the lock", async () => {
  for (const injected of [
    { PTLAM_MERMAID_FAKE_FAIL: "1" },
    {
      PTLAM_MERMAID_FAKE_DELAY_MS: "1000",
      PTLAM_MERMAID_TEST_TIMEOUT_MS: "100",
    },
  ]) {
    const cacheRoot = await mkdtemp(
      path.join(os.tmpdir(), "ptlam-setup-cleanup-"),
    );
    const result = await runSetup("--ensure", cacheRoot, injected);
    assert.equal(result.code, 1);
    assert.equal(result.json.status, "error");
    await assert.rejects(stat(targetFor(cacheRoot)), { code: "ENOENT" });
    const parent = path.dirname(targetFor(cacheRoot));
    const entries = await readdir(parent);
    assert.equal(
      entries.some(
        (entry) => entry.includes(".lock") || entry.includes(".tmp-"),
      ),
      false,
    );
  }
});
