import assert from "node:assert/strict";
import { symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "vitest";

import { renderHtmlScaffold } from "../../../../../plugin/skills/ptlam-visualization-with-html/scripts/scaffolding/render-html-scaffold.ts";
import { runValidateHtmlCommand } from "../../../../../plugin/skills/ptlam-visualization-with-html/scripts/validation/validate-html.ts";
import {
  outputCapture,
  runTypeScriptProcess,
  temporaryDirectory,
} from "../test-fixtures/cli-command-fixture.ts";

const validateScript = path.resolve(
  "plugin/skills/ptlam-visualization-with-html/scripts/validation/validate-html.ts",
);

describe("validate HTML command", () => {
  it("validates a document through the portable Node entry point", async () => {
    // GIVEN: A valid portable document exists outside the skill installation.
    const root = await temporaryDirectory();
    const htmlPath = path.join(root, "guide.html");
    await writeFile(htmlPath, renderHtmlScaffold(), "utf8");

    // WHEN: Native Node type stripping runs the validation entry point.
    const result = await runTypeScriptProcess(validateScript, [htmlPath], root);

    // THEN: The command reports the validated absolute artifact.
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), `VALID: ${htmlPath}`);
    assert.equal(result.stderr, "");
  });

  it("runs the validation entry point through a symbolic link", async () => {
    // GIVEN: A skill installer exposes the portable command through a symlink.
    const root = await temporaryDirectory();
    const linkedScript = path.join(root, "validate-html.ts");
    const htmlPath = path.join(root, "guide.html");
    await symlink(validateScript, linkedScript);
    await writeFile(htmlPath, renderHtmlScaffold(), "utf8");

    // WHEN: Node executes the linked entry point.
    const result = await runTypeScriptProcess(linkedScript, [htmlPath], root);

    // THEN: The linked command performs validation and reports the artifact.
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.trim(), `VALID: ${htmlPath}`);
    assert.equal(result.stderr, "");
  });

  it("reports help, invalid documents, and missing files", async () => {
    // GIVEN: One invalid document and one absent path are addressed by the CLI.
    const root = await temporaryDirectory();
    const invalidPath = path.join(root, "invalid.html");
    const missingPath = path.join(root, "missing.html");
    await writeFile(invalidPath, "<p>invalid</p>", "utf8");
    const help = outputCapture();
    const invalid = outputCapture();
    const missing = outputCapture();

    // WHEN: Help and both failure modes are executed.
    const helpCode = await runValidateHtmlCommand(["-h"], help.options);
    const invalidCode = await runValidateHtmlCommand(
      [invalidPath],
      invalid.options,
    );
    const missingCode = await runValidateHtmlCommand(
      [missingPath],
      missing.options,
    );

    // THEN: Help succeeds while contract and filesystem failures use stderr.
    assert.equal(helpCode, 0);
    assert.equal(help.stdout[0]?.startsWith("Usage:"), true);
    assert.equal(invalidCode, 1);
    assert.equal(invalid.stderr.includes("ERROR: missing HTML5 doctype"), true);
    assert.equal(missingCode, 1);
    assert.equal(missing.stderr[0], `ERROR: file not found: ${missingPath}`);
  });
});
