import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "vitest";

import { createHtmlScaffold } from "../../../../../plugin/skills/ptlam-visualization-with-html/scripts/scaffolding/create-html-scaffold.ts";
import { validateHtmlDocument } from "../../../../../plugin/skills/ptlam-visualization-with-html/scripts/validation/validate-html-document.ts";
import { temporaryDirectory } from "../test-fixtures/cli-command-fixture.ts";

describe("createHtmlScaffold", () => {
  it("creates missing directories and writes a valid escaped document", async () => {
    // GIVEN: A nested output path does not exist yet.
    const root = await temporaryDirectory();
    const outputPath = path.join(root, "nested", "guide.html");

    // WHEN: The scaffold is created with a markup-sensitive title.
    const result = await createHtmlScaffold({
      outputPath,
      title: "Architecture <flow>",
    });

    // THEN: The absolute output is valid and contains escaped title text.
    assert.equal(result.outputPath, outputPath);
    assert.equal(Object.isFrozen(result), true);
    const source = await readFile(outputPath, "utf8");
    assert.equal(source.includes("Architecture &lt;flow&gt;"), true);
    assert.deepEqual(validateHtmlDocument(source).errors, []);
  });

  it("refuses to replace an existing document by default", async () => {
    // GIVEN: The requested output already contains user content.
    const root = await temporaryDirectory();
    const outputPath = path.join(root, "guide.html");
    await writeFile(outputPath, "keep me", "utf8");

    // WHEN: Scaffold creation is requested without overwrite authority.
    const creation = createHtmlScaffold({ outputPath });

    // THEN: The request fails and the original content remains intact.
    await assert.rejects(
      creation,
      new Error(`refusing to overwrite existing file: ${outputPath}`),
    );
    assert.equal(await readFile(outputPath, "utf8"), "keep me");
  });

  it("replaces an existing document only when overwrite is explicit", async () => {
    // GIVEN: An existing document may be intentionally replaced.
    const root = await temporaryDirectory();
    const outputPath = path.join(root, "guide.html");
    await writeFile(outputPath, "old", "utf8");

    // WHEN: The caller opts into replacement.
    await createHtmlScaffold({ outputPath, overwrite: true });

    // THEN: The old content is replaced by a valid scaffold.
    const source = await readFile(outputPath, "utf8");
    assert.notEqual(source, "old");
    assert.deepEqual(validateHtmlDocument(source).errors, []);
  });

  it("rejects a non-HTML output before writing it", async () => {
    // GIVEN: The requested output has a different extension.
    const root = await temporaryDirectory();

    // WHEN: Scaffold creation is requested for that path.
    const creation = createHtmlScaffold({
      outputPath: path.join(root, "guide.txt"),
    });

    // THEN: The contract rejects the output type.
    await assert.rejects(creation, new Error("output must end in .html"));
  });
});
