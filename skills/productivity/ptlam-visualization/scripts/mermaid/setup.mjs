#!/usr/bin/env node

import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { resolveCapsule, resolvePathInside } from "./internal/capsule.mjs";
import { ProcessError, runProcess } from "./internal/process.mjs";

const CHECK_EXIT = 2;
const DEFAULT_TIMEOUT_MS = 10 * 60_000;
const LOCK_STALE_MS = 15 * 60_000;
const POLL_MS = 150;

class SetupError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SetupError";
    this.code = code;
    this.details = details;
  }
}

const testMode = process.env.PTLAM_MERMAID_TEST_MODE === "1";
const timeoutMs = testMode
  ? Number(process.env.PTLAM_MERMAID_TEST_TIMEOUT_MS || 10_000)
  : DEFAULT_TIMEOUT_MS;

const emit = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const progress = (message) =>
  process.stderr.write(`[mermaid setup] ${message}\n`);
const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const sha256File = (file) =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const input = createReadStream(file);
    input.on("error", reject);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("end", () => resolve(hash.digest("hex")));
  });

const defaultPlatformCache = () => {
  if (testMode && process.env.PTLAM_MERMAID_CACHE_ROOT) {
    return path.resolve(process.env.PTLAM_MERMAID_CACHE_ROOT);
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Caches");
  }
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    if (!local)
      throw new SetupError("CACHE_ROOT_UNAVAILABLE", "LOCALAPPDATA is not set");
    return local;
  }
  return process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
};

const cachePaths = (capsule) => {
  const parent = path.join(
    defaultPlatformCache(),
    "ptlam-skills",
    "ptlam-visualization",
    "mermaid",
  );
  return {
    parent,
    target: path.join(parent, capsule.identity),
    lock: path.join(parent, `.${capsule.identity}.lock`),
  };
};

const packageVersion = async (runtimeRoot, packageName) => {
  const packageFile = path.join(
    runtimeRoot,
    "node_modules",
    ...packageName.split("/"),
    "package.json",
  );
  return JSON.parse(await readFile(packageFile, "utf8")).version;
};

const publicReady = (record, target) => ({
  schemaVersion: 1,
  status: "ready",
  capsuleIdentity: record.capsuleIdentity,
  mermaidVersion: record.mermaidVersion,
  cliVersion: record.cliVersion,
  runtimeRoot: path.join(target, record.runtimeRelativePath),
  cliEntryPath: path.join(target, record.cliEntryRelativePath),
  browserExecutablePath: path.join(
    target,
    record.browserExecutableRelativePath,
  ),
  browserVersion: record.browserVersion,
});

const verifyCache = async (capsule, target) => {
  try {
    const record = JSON.parse(
      await readFile(path.join(target, "ready.json"), "utf8"),
    );
    const expected = {
      capsuleIdentity: capsule.identity,
      mermaidVersion: capsule.manifest.capsule.mermaidVersion,
      cliVersion: capsule.manifest.cli.version,
      browserVersion: capsule.manifest.browser.buildId,
      manifestSha256: capsule.manifestSha256,
      packageSha256: capsule.manifest.runtimeInputs.packageSha256,
      lockSha256: capsule.manifest.runtimeInputs.lockSha256,
      platform: `${process.platform}-${process.arch}`,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (record[key] !== value) {
        throw new SetupError(
          "CACHE_EVIDENCE_MISMATCH",
          `${key} does not match the active capsule`,
        );
      }
    }

    const runtimeRoot = resolvePathInside(
      target,
      record.runtimeRelativePath,
      "cached runtime path",
    );
    const cliEntryPath = resolvePathInside(
      target,
      record.cliEntryRelativePath,
      "cached CLI path",
    );
    const browserExecutablePath = resolvePathInside(
      target,
      record.browserExecutableRelativePath,
      "cached browser path",
    );
    const browserRelativeToRuntime = path.relative(
      runtimeRoot,
      browserExecutablePath,
    );
    if (
      browserRelativeToRuntime === ".." ||
      browserRelativeToRuntime.startsWith(`..${path.sep}`) ||
      path.isAbsolute(browserRelativeToRuntime)
    ) {
      throw new SetupError(
        "CACHE_BROWSER_PATH",
        "cached browser executable must remain inside runtimeRoot",
      );
    }
    const smokePath = resolvePathInside(
      target,
      record.smokeOutputRelativePath,
      "cached smoke path",
    );
    const [cachedPackage, cachedLock, smoke, cliSha256, browserSha256] =
      await Promise.all([
        readFile(path.join(runtimeRoot, "package.json")),
        readFile(path.join(runtimeRoot, "package-lock.json")),
        readFile(smokePath),
        sha256File(cliEntryPath),
        sha256File(browserExecutablePath),
      ]);
    if (capsule.sha256(cachedPackage) !== record.packageSha256) {
      throw new SetupError(
        "CACHE_PACKAGE_CORRUPT",
        "cached package.json hash is invalid",
      );
    }
    if (capsule.sha256(cachedLock) !== record.lockSha256) {
      throw new SetupError(
        "CACHE_LOCK_CORRUPT",
        "cached package-lock.json hash is invalid",
      );
    }
    if (capsule.sha256(smoke) !== record.smokeOutputSha256) {
      throw new SetupError(
        "CACHE_SMOKE_CORRUPT",
        "cached smoke-render evidence is invalid",
      );
    }
    if (cliSha256 !== record.cliEntrySha256) {
      throw new SetupError(
        "CACHE_CLI_CORRUPT",
        "cached CLI entry hash is invalid",
      );
    }
    if (browserSha256 !== record.browserExecutableSha256) {
      throw new SetupError(
        "CACHE_BROWSER_CORRUPT",
        "cached browser executable hash is invalid",
      );
    }
    if ((await packageVersion(runtimeRoot, "mermaid")) !== "11.16.0") {
      throw new SetupError(
        "CACHE_CORE_VERSION",
        "cached Mermaid core is not 11.16.0",
      );
    }
    if (
      (await packageVersion(runtimeRoot, "@mermaid-js/mermaid-cli")) !==
      "11.16.0"
    ) {
      throw new SetupError(
        "CACHE_CLI_VERSION",
        "cached Mermaid CLI is not 11.16.0",
      );
    }
    const browserResult = await runProcess(
      browserExecutablePath,
      ["--version"],
      {
        timeoutMs: Math.min(timeoutMs, 15_000),
      },
    );
    if (!browserResult.stdout.includes(record.browserVersion)) {
      throw new SetupError(
        "CACHE_BROWSER_VERSION",
        "cached browser build is incorrect",
      );
    }
    return { ready: true, record, public: publicReady(record, target) };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        ready: false,
        reasonCode: "CACHE_MISSING",
        message: "active capsule cache is absent or incomplete",
      };
    }
    return {
      ready: false,
      reasonCode: error.code || "CACHE_INVALID",
      message: error.message,
    };
  }
};

const acquireLock = async (capsule, paths) => {
  const started = Date.now();
  await mkdir(paths.parent, { recursive: true });
  while (Date.now() - started < timeoutMs) {
    try {
      await mkdir(paths.lock);
      await writeFile(
        path.join(paths.lock, "owner.json"),
        `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`,
        { flag: "wx" },
      );
      return { acquired: true };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = await verifyCache(capsule, paths.target);
      if (existing.ready) return { acquired: false, existing };
      const lockStat = await stat(paths.lock).catch(() => null);
      if (lockStat && Date.now() - lockStat.mtimeMs > LOCK_STALE_MS) {
        await rename(paths.lock, `${paths.lock}.stale-${randomUUID()}`).catch(
          () => {},
        );
        continue;
      }
      await wait(POLL_MS);
    }
  }
  throw new SetupError(
    "SETUP_LOCK_TIMEOUT",
    "timed out waiting for another setup process",
  );
};

const realInstall = async (capsule, stage) => {
  const runtimeRoot = path.join(stage, "runtime");
  const browserRoot = path.join(runtimeRoot, "browsers");
  await mkdir(runtimeRoot, { recursive: true });
  await Promise.all([
    copyFile(capsule.packagePath, path.join(runtimeRoot, "package.json")),
    copyFile(capsule.lockPath, path.join(runtimeRoot, "package-lock.json")),
  ]);

  if (testMode && process.env.PTLAM_MERMAID_TEST_INSTALLER) {
    progress("running controlled test installer");
    await runProcess(
      process.execPath,
      [path.resolve(process.env.PTLAM_MERMAID_TEST_INSTALLER), stage],
      {
        cwd: runtimeRoot,
        env: {
          ...process.env,
          PTLAM_MERMAID_BROWSER_VERSION: capsule.manifest.browser.buildId,
        },
        timeoutMs,
        onStderr: (chunk) => process.stderr.write(chunk),
      },
    );
  } else {
    progress("installing exact package lock");
    const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
    await runProcess(
      npmCommand,
      ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
      {
        cwd: runtimeRoot,
        env: {
          ...process.env,
          PUPPETEER_SKIP_DOWNLOAD: "true",
          npm_config_cache: path.join(stage, "npm-cache"),
        },
        timeoutMs,
        onStderr: (chunk) => process.stderr.write(chunk),
      },
    );
    progress(`installing browser build ${capsule.manifest.browser.buildId}`);
    const browserCli = path.join(
      runtimeRoot,
      "node_modules/@puppeteer/browsers/lib/main-cli.js",
    );
    const installed = await runProcess(
      process.execPath,
      [
        browserCli,
        "install",
        `${capsule.manifest.browser.product}@${capsule.manifest.browser.buildId}`,
        "--path",
        browserRoot,
        "--base-url",
        capsule.manifest.browser.downloadBaseUrl,
        "--format",
        "{{path}}",
      ],
      {
        cwd: runtimeRoot,
        timeoutMs,
        onStderr: (chunk) => process.stderr.write(chunk),
      },
    );
    await writeFile(
      path.join(stage, "browser-path.txt"),
      `${installed.stdout.trim().split("\n").at(-1)}\n`,
    );
  }

  return { browserRoot, runtimeRoot };
};

const verifyStageAndRender = async (capsule, stage, runtimeRoot) => {
  const cliEntryPath = path.join(
    runtimeRoot,
    "node_modules/@mermaid-js/mermaid-cli/src/cli.js",
  );
  let browserExecutablePath;
  if (testMode && process.env.PTLAM_MERMAID_TEST_INSTALLER) {
    browserExecutablePath = path.join(
      runtimeRoot,
      "browsers",
      "browser-executable",
    );
  } else {
    browserExecutablePath = (
      await readFile(path.join(stage, "browser-path.txt"), "utf8")
    ).trim();
  }
  await Promise.all([access(cliEntryPath), access(browserExecutablePath)]);
  if ((await packageVersion(runtimeRoot, "mermaid")) !== "11.16.0") {
    throw new SetupError(
      "INSTALLED_CORE_VERSION",
      "installed Mermaid core is not 11.16.0",
    );
  }
  if (
    (await packageVersion(runtimeRoot, "@mermaid-js/mermaid-cli")) !== "11.16.0"
  ) {
    throw new SetupError(
      "INSTALLED_CLI_VERSION",
      "installed Mermaid CLI is not 11.16.0",
    );
  }
  const browserResult = await runProcess(browserExecutablePath, ["--version"], {
    timeoutMs: Math.min(timeoutMs, 15_000),
  });
  if (!browserResult.stdout.includes(capsule.manifest.browser.buildId)) {
    throw new SetupError(
      "INSTALLED_BROWSER_VERSION",
      "installed browser build is incorrect",
    );
  }

  const smokeDir = path.join(stage, "evidence");
  const smokeInput = path.join(smokeDir, "smoke.mmd");
  const smokeOutput = path.join(smokeDir, "smoke.svg");
  await mkdir(smokeDir, { recursive: true });
  await writeFile(
    smokeInput,
    "flowchart LR\n  accTitle: Capsule smoke test\n  accDescr: Input reaches verified output.\n  input[Input] --> output[Verified output]\n",
  );

  if (testMode && process.env.PTLAM_MERMAID_TEST_INSTALLER) {
    await writeFile(
      smokeOutput,
      '<svg xmlns="http://www.w3.org/2000/svg"><title>Capsule smoke test</title><desc>Input reaches verified output.</desc></svg>\n',
    );
  } else {
    const puppeteerConfig = path.join(smokeDir, "puppeteer.json");
    const mermaidConfig = path.join(smokeDir, "mermaid.json");
    await writeFile(
      puppeteerConfig,
      `${JSON.stringify({ executablePath: browserExecutablePath, headless: true })}\n`,
    );
    await writeFile(
      mermaidConfig,
      `${JSON.stringify({ securityLevel: "strict", deterministicIds: true, deterministicIDSeed: "ptlam-capsule-smoke" })}\n`,
    );
    progress("verifying strict offline smoke render");
    await runProcess(
      process.execPath,
      [
        cliEntryPath,
        "-i",
        smokeInput,
        "-o",
        smokeOutput,
        "-p",
        puppeteerConfig,
        "-c",
        mermaidConfig,
      ],
      {
        cwd: runtimeRoot,
        timeoutMs,
        onStderr: (chunk) => process.stderr.write(chunk),
      },
    );
  }
  const smoke = await readFile(smokeOutput);
  const smokeText = smoke.toString("utf8");
  if (
    !smokeText.includes("Capsule smoke test") ||
    !smokeText.includes("Input reaches verified output.")
  ) {
    throw new SetupError(
      "SMOKE_RENDER_INVALID",
      "smoke render did not preserve accessibility metadata",
    );
  }
  return {
    browserExecutablePath,
    browserExecutableSha256: await sha256File(browserExecutablePath),
    cliEntryPath,
    cliEntrySha256: await sha256File(cliEntryPath),
    smokeOutput,
    smoke,
  };
};

const install = async (capsule, paths) => {
  const stage = await mkdtemp(
    path.join(paths.parent, `.${capsule.identity}.tmp-`),
  );
  try {
    progress(`preparing capsule ${capsule.identity}`);
    const { runtimeRoot } = await realInstall(capsule, stage);
    const verified = await verifyStageAndRender(capsule, stage, runtimeRoot);
    const record = {
      schemaVersion: 1,
      status: "ready",
      capsuleIdentity: capsule.identity,
      mermaidVersion: capsule.manifest.capsule.mermaidVersion,
      cliVersion: capsule.manifest.cli.version,
      browserVersion: capsule.manifest.browser.buildId,
      manifestSha256: capsule.manifestSha256,
      packageSha256: capsule.manifest.runtimeInputs.packageSha256,
      lockSha256: capsule.manifest.runtimeInputs.lockSha256,
      platform: `${process.platform}-${process.arch}`,
      runtimeRelativePath: path.relative(stage, runtimeRoot),
      cliEntryRelativePath: path.relative(stage, verified.cliEntryPath),
      browserExecutableRelativePath: path.relative(
        stage,
        verified.browserExecutablePath,
      ),
      browserExecutableSha256: verified.browserExecutableSha256,
      cliEntrySha256: verified.cliEntrySha256,
      smokeOutputRelativePath: path.relative(stage, verified.smokeOutput),
      smokeOutputSha256: capsule.sha256(verified.smoke),
      verifiedAt: new Date().toISOString(),
    };
    await writeFile(
      path.join(stage, "ready.json"),
      `${JSON.stringify(record, null, 2)}\n`,
      { flag: "wx" },
    );
    const existing = await verifyCache(capsule, paths.target);
    if (existing.ready) return existing;
    try {
      await rename(paths.target, `${paths.target}.invalid-${randomUUID()}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (testMode && process.env.PTLAM_MERMAID_TEST_FAIL_ATOMIC === "1") {
      throw new SetupError(
        "ATOMIC_PUBLICATION_FAILED",
        "injected atomic publication failure",
      );
    }
    await rename(stage, paths.target);
    progress("capsule installed and verified");
    return verifyCache(capsule, paths.target);
  } catch (error) {
    await rm(stage, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
};

const main = async () => {
  const mode = process.argv[2];
  if (!["--check", "--ensure"].includes(mode) || process.argv.length !== 3) {
    throw new SetupError("USAGE", "usage: setup.mjs <--check|--ensure>");
  }
  const capsule = await resolveCapsule();
  const paths = cachePaths(capsule);
  const existing = await verifyCache(capsule, paths.target);
  if (existing.ready) {
    emit(existing.public);
    return;
  }
  if (mode === "--check") {
    emit({
      schemaVersion: 1,
      status: "not-ready",
      capsuleIdentity: capsule.identity,
      reasonCode: existing.reasonCode,
      message: existing.message,
    });
    process.exitCode = CHECK_EXIT;
    return;
  }

  progress(existing.message);
  const lock = await acquireLock(capsule, paths);
  if (!lock.acquired) {
    emit(lock.existing.public);
    return;
  }
  try {
    const becameReady = await verifyCache(capsule, paths.target);
    if (becameReady.ready) {
      emit(becameReady.public);
      return;
    }
    const ready = await install(capsule, paths);
    if (!ready.ready) {
      throw new SetupError("POST_INSTALL_VERIFICATION", ready.message);
    }
    emit(ready.public);
  } finally {
    await rm(paths.lock, { recursive: true, force: true }).catch(() => {});
  }
};

main().catch((error) => {
  const details = error instanceof ProcessError ? error.details : error.details;
  emit({
    schemaVersion: 1,
    status: "error",
    reasonCode: error.code || "SETUP_FAILED",
    message: error.message,
    ...(testMode && details ? { details } : {}),
  });
  process.exitCode = 1;
});
