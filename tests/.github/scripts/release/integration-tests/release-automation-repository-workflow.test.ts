import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, onTestFinished, test } from "vitest";

import { ReleaseAutomation } from "../../../../../.github/scripts/release/release-automation.ts";

async function createTemporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  onTestFinished(() => rm(directory, { force: true, recursive: true }));
  return directory;
}

function archiveEntries(archivePath: string): readonly string[] {
  return execFileSync("tar", ["-tzf", archivePath], { encoding: "utf8" })
    .trim()
    .split("\n");
}

describe("release automation repository workflow", () => {
  test("starts through Node's strip-only TypeScript runtime", () => {
    // GIVEN: The exact native Node invocation used by GitHub Actions.
    const cliPath = path.resolve(
      import.meta.dirname,
      "../../../../../.github/scripts/release/release-automation-cli.ts",
    );

    // WHEN: Node loads the complete CLI module graph in strip-only mode.
    const result = spawnSync(
      process.execPath,
      ["--experimental-strip-types", cliPath, "unknown"],
      { encoding: "utf8" },
    );

    // THEN: The CLI reaches its public usage contract instead of a syntax error.
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Usage: release-automation-cli.ts");
    expect(result.stderr).not.toContain("ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX");
  });

  test("packages the complete coverage directory", async () => {
    // GIVEN: A generated HTML and JSON coverage report.
    const repositoryRoot = await createTemporaryDirectory("coverage-source-");
    const outputDirectory = await createTemporaryDirectory("coverage-output-");
    await mkdir(path.join(repositoryRoot, "coverage"));
    await writeFile(
      path.join(repositoryRoot, "coverage/index.html"),
      "<h1>Coverage</h1>",
    );
    await writeFile(
      path.join(repositoryRoot, "coverage/coverage-summary.json"),
      "{}",
    );

    // WHEN: The coverage release artifact is packaged.
    const automation = new ReleaseAutomation();
    const result = await automation.packageCoverage({
      repositoryRoot,
      outputDirectory,
      tag: "v1.2.3",
    });

    // THEN: Its stable filename contains both report surfaces.
    const archivePath = result.path;
    expect(path.basename(archivePath)).toBe("test-coverage-v1.2.3.tar.gz");
    expect(archiveEntries(archivePath)).toEqual(
      expect.arrayContaining([
        "coverage/index.html",
        "coverage/coverage-summary.json",
      ]),
    );
  });

  test("packages only committed installable plugin outputs", async () => {
    // GIVEN: A Git repository with plugin manifests, skills, docs, and tooling.
    const repositoryRoot = await createTemporaryDirectory("plugin-source-");
    const outputDirectory = await createTemporaryDirectory("plugin-output-");
    await mkdir(path.join(repositoryRoot, ".claude-plugin"));
    await mkdir(path.join(repositoryRoot, "skills/example"), {
      recursive: true,
    });
    await mkdir(path.join(repositoryRoot, "tools"));
    await writeFile(
      path.join(repositoryRoot, ".claude-plugin/plugin.json"),
      "{}",
    );
    await writeFile(
      path.join(repositoryRoot, "skills/example/SKILL.md"),
      "# Skill\n",
    );
    await writeFile(path.join(repositoryRoot, "README.md"), "# Plugin\n");
    await writeFile(path.join(repositoryRoot, "LICENSE"), "MIT\n");
    await writeFile(
      path.join(repositoryRoot, "tools/internal.ts"),
      "export {};\n",
    );
    execFileSync("git", ["init"], { cwd: repositoryRoot });
    execFileSync("git", ["add", "."], { cwd: repositoryRoot });
    execFileSync(
      "git",
      [
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.test",
        "commit",
        "-m",
        "fixture",
      ],
      {
        cwd: repositoryRoot,
        stdio: "ignore",
      },
    );

    // WHEN: The installable plugin release artifact is built.
    const automation = new ReleaseAutomation();
    const result = await automation.packagePlugin({
      repositoryRoot,
      outputDirectory,
      tag: "v1.2.3",
    });
    const archivePath = result.path;
    const entries = archiveEntries(archivePath);

    // THEN: Published surfaces are present and repository tooling is absent.
    expect(entries).toEqual(
      expect.arrayContaining([
        "ptlam-skills-v1.2.3/.claude-plugin/plugin.json",
        "ptlam-skills-v1.2.3/skills/example/SKILL.md",
        "ptlam-skills-v1.2.3/README.md",
        "ptlam-skills-v1.2.3/LICENSE",
      ]),
    );
    expect(entries.some((entry) => entry.includes("tools/internal.ts"))).toBe(
      false,
    );
  });

  test("writes sorted SHA-256 checksums for release archives", async () => {
    // GIVEN: Coverage and plugin archives with known literal bytes.
    const assetsDirectory = await createTemporaryDirectory("release-assets-");
    await writeFile(
      path.join(assetsDirectory, "test-coverage-v1.2.3.tar.gz"),
      "coverage",
    );
    await writeFile(
      path.join(assetsDirectory, "ptlam-skills-v1.2.3.tar.gz"),
      "plugin",
    );

    // WHEN: The checksum manifest is generated.
    const automation = new ReleaseAutomation();
    const result = await automation.generateChecksums(assetsDirectory);

    // THEN: It contains independently known digests in filename order.
    expect(await readFile(result.path, "utf8")).toBe(
      "5e689e2b01672bf33996e75d5e372ff60c536ce1599a1458e867cd8f4bef5160  ptlam-skills-v1.2.3.tar.gz\n" +
        "c3a3091b9d32267d0b3175ee14f70a1e0b3d7292d0a0fa45020ced5fb764d620  test-coverage-v1.2.3.tar.gz\n",
    );
  });
});
