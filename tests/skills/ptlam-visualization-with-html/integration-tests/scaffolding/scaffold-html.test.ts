import assert from "node:assert/strict";
import { readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "vitest";

import { runScaffoldHtmlCommand } from "../../../../../plugin/skills/ptlam-visualization-with-html/scripts/scaffolding/scaffold-html.ts";
import {
  outputCapture,
  runTypeScriptProcess,
  temporaryDirectory,
} from "../test-fixtures/cli-command-fixture.ts";

const scaffoldScript = path.resolve(
  "plugin/skills/ptlam-visualization-with-html/scripts/scaffolding/scaffold-html.ts",
);

describe("scaffold HTML command", () => {
  it("scaffolds a document through the portable Node entry point", async () => {
    // GIVEN: The command runs from a directory unrelated to the skill installation.
    const root = await temporaryDirectory();
    const outputPath = path.join(root, "guide.html");

    // WHEN: Native Node type stripping runs the scaffolding entry point.
    const result = await runTypeScriptProcess(
      scaffoldScript,
      [outputPath, "--title", "Portable guide"],
      root,
    );

    // THEN: The command succeeds and writes the requested title.
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), outputPath);
    assert.equal(result.stderr, "");
    assert.equal(
      (await readFile(outputPath, "utf8")).includes(
        "<title>Portable guide</title>",
      ),
      true,
    );
  });

  it("runs the scaffold entry point through a symbolic link", async () => {
    // GIVEN: A skill installer exposes the portable command through a symlink.
    const root = await temporaryDirectory();
    const linkedScript = path.join(root, "scaffold-html.ts");
    const outputPath = path.join(root, "guide.html");
    await symlink(scaffoldScript, linkedScript);

    // WHEN: Node executes the linked entry point.
    const result = await runTypeScriptProcess(
      linkedScript,
      [outputPath, "--title", "Linked guide"],
      root,
    );

    // THEN: The command executes instead of silently exiting without output.
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), outputPath);
    assert.equal(result.stderr, "");
    assert.equal(
      (await readFile(outputPath, "utf8")).includes(
        "<title>Linked guide</title>",
      ),
      true,
    );
  });

  it("reports help, usage errors, replacement protection, and forced replacement", async () => {
    // GIVEN: CLI output is captured and one destination already exists.
    const root = await temporaryDirectory();
    const outputPath = path.join(root, "guide.html");
    await writeFile(outputPath, "old", "utf8");
    const help = outputCapture();
    const usage = outputCapture();
    const protectedOutput = outputCapture();
    const replacement = outputCapture();

    // WHEN: Each scaffold command mode is executed in-process.
    const helpCode = await runScaffoldHtmlCommand(["--help"], help.options);
    const usageCode = await runScaffoldHtmlCommand([], usage.options);
    const protectedCode = await runScaffoldHtmlCommand(
      [outputPath],
      protectedOutput.options,
    );
    const replacementCode = await runScaffoldHtmlCommand(
      [outputPath, "--force"],
      replacement.options,
    );

    // THEN: Exit codes and streams make every outcome explicit.
    assert.equal(helpCode, 0);
    assert.equal(help.stdout[0]?.startsWith("Usage:"), true);
    assert.equal(usageCode, 1);
    assert.equal(usage.stderr[0]?.startsWith("ERROR: Usage:"), true);
    assert.equal(protectedCode, 1);
    assert.equal(
      protectedOutput.stderr[0],
      `ERROR: refusing to overwrite existing file: ${outputPath}`,
    );
    assert.equal(replacementCode, 0);
    assert.equal(replacement.stdout[0], outputPath);
    assert.notEqual(await readFile(outputPath, "utf8"), "old");
  });
});
