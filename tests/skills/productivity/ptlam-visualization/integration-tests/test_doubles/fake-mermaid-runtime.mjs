import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(fixtureDirectory, "../../../../../..");
const manifestPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/references/mermaid/11.16.0/MANIFEST.json",
);

export const validSource = `---
config:
  deterministicIds: true
  deterministicIDSeed: ptlam-test-seed
---
flowchart LR
  accTitle: Test request flow
  accDescr: Intake moves to completion through validation.
  intake[Intake] --> complete[Complete]
`;

export async function createFakeRuntime(overrides = {}) {
  const directory = await mkdtemp(
    join(tmpdir(), "ptlam-mermaid-fake-runtime-"),
  );
  const runtimeRoot = join(directory, "runtime");
  const temporaryRoot = join(directory, "temporary");
  const coreDirectory = join(runtimeRoot, "node_modules/mermaid");
  const cliPackageDirectory = join(
    runtimeRoot,
    "node_modules/@mermaid-js/mermaid-cli",
  );
  const cliEntryPath = join(runtimeRoot, "fake-cli.mjs");
  const browserExecutablePath = join(runtimeRoot, "fake-browser");
  const setupPath = join(directory, "setup.mjs");
  await Promise.all([
    mkdir(coreDirectory, { recursive: true }),
    mkdir(cliPackageDirectory, { recursive: true }),
    mkdir(temporaryRoot, { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      join(coreDirectory, "package.json"),
      `${JSON.stringify({ name: "mermaid", version: overrides.actualCoreVersion ?? "11.16.0" })}\n`,
    ),
    writeFile(
      join(cliPackageDirectory, "package.json"),
      `${JSON.stringify({ name: "@mermaid-js/mermaid-cli", version: overrides.actualCliVersion ?? "11.16.0" })}\n`,
    ),
    cp(join(fixtureDirectory, "fake-mermaid-cli.mjs"), cliEntryPath),
    writeFile(browserExecutablePath, "synthetic browser\n"),
  ]);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const result = {
    schemaVersion: 1,
    status: "ready",
    capsuleIdentity: manifest.capsuleIdentity.value,
    mermaidVersion: "11.16.0",
    cliVersion: "11.16.0",
    runtimeRoot,
    cliEntryPath,
    browserExecutablePath,
    browserVersion: manifest.browser.buildId,
    ...overrides.result,
  };
  await writeFile(
    setupPath,
    `if (process.argv[2] !== "--ensure") process.exit(2);\nsetTimeout(() => process.stdout.write(${JSON.stringify(`${JSON.stringify(result)}\n`)}), ${overrides.setupDelayMs ?? 0});\n`,
  );
  return {
    directory,
    runtimeRoot,
    temporaryRoot,
    setupPath,
    environment: {
      ...process.env,
      PTLAM_MERMAID_SETUP_PATH: setupPath,
      TMPDIR: temporaryRoot,
      TMP: temporaryRoot,
      TEMP: temporaryRoot,
    },
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

export async function writeSource(
  directory,
  source = validSource,
  name = "source.mmd",
) {
  const path = join(directory, name);
  await writeFile(path, source);
  return path;
}

export { repositoryRoot };
