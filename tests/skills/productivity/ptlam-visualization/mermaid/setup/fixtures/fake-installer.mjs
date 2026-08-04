#!/usr/bin/env node

import { appendFile, chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const stage = path.resolve(process.argv[2]);
const runtime = path.join(stage, "runtime");
const coreVersion = process.env.PTLAM_MERMAID_FAKE_CORE_VERSION || "11.16.0";
const cliVersion = process.env.PTLAM_MERMAID_FAKE_CLI_VERSION || "11.16.0";
const browserVersion =
  process.env.PTLAM_MERMAID_FAKE_BROWSER_VERSION ||
  process.env.PTLAM_MERMAID_BROWSER_VERSION;

if (process.env.PTLAM_MERMAID_FAKE_FAIL === "1") {
  throw new Error("injected installer failure");
}
if (process.env.PTLAM_MERMAID_TEST_INSTALL_COUNT_FILE) {
  await appendFile(
    process.env.PTLAM_MERMAID_TEST_INSTALL_COUNT_FILE,
    "install\n",
  );
}
const delay = Number(process.env.PTLAM_MERMAID_FAKE_DELAY_MS || 0);
if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

const coreRoot = path.join(runtime, "node_modules/mermaid");
const cliRoot = path.join(runtime, "node_modules/@mermaid-js/mermaid-cli");
const browserRoot = path.join(runtime, "browsers");
await Promise.all([
  mkdir(coreRoot, { recursive: true }),
  mkdir(path.join(cliRoot, "src"), { recursive: true }),
  mkdir(browserRoot, { recursive: true }),
]);
await Promise.all([
  writeFile(
    path.join(coreRoot, "package.json"),
    `${JSON.stringify({ name: "mermaid", version: coreVersion })}\n`,
  ),
  writeFile(
    path.join(cliRoot, "package.json"),
    `${JSON.stringify({ name: "@mermaid-js/mermaid-cli", version: cliVersion })}\n`,
  ),
  writeFile(path.join(cliRoot, "src/cli.js"), "// controlled test CLI\n"),
]);

const browser = path.join(browserRoot, "browser-executable");
await writeFile(
  browser,
  `#!/bin/sh\nprintf '%s\\n' 'Chrome Headless Shell ${browserVersion}'\n`,
);
await chmod(browser, 0o755);
