import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  inspectMermaidSource,
  loadActiveManifest,
  normalizeMermaidSource,
} from "../../../../../../skills/productivity/ptlam-visualization/scripts/mermaid/validate.mjs";
const repositoryRoot = fileURLToPath(
  new URL("../../../../../../", import.meta.url),
);

test("all 31 canonical fixtures pass versioned static routing checks", async () => {
  // Given the active pinned manifest and one fixture for every diagram family.
  const manifest = await loadActiveManifest();
  const fixtures = join(
    repositoryRoot,
    "tests/skills/productivity/ptlam-visualization/integration-tests/mermaid/fixtures",
  );
  // When every fixture crosses the public normalization and inspection seams.
  const names = (await readdir(fixtures)).filter((name) =>
    name.endsWith(".mmd"),
  );
  assert.equal(names.length, 31);
  const detected = new Set();
  for (const name of names) {
    const source = normalizeMermaidSource(await readFile(join(fixtures, name)));
    const inspection = await inspectMermaidSource(source, manifest);
    detected.add(inspection.family);
    assert.ok(inspection.accessibility.title);
    assert.ok(inspection.accessibility.description);
  }
  // Then every catalog family is detected with complete accessibility text.
  assert.equal(detected.size, 31);
});

test("output reference preserves primary, co-primary, file-only, and outer ownership", async () => {
  // Given the published Mermaid output-routing contract.
  const referencePath = join(
    repositoryRoot,
    "skills/productivity/ptlam-visualization/references/mermaid/output-routing.md",
  );

  // When its ownership and delivery rules are read as one public reference.
  const reference = await readFile(referencePath, "utf8");

  // Then every primary, co-primary, file-only, and outer-owner rule is explicit.
  assert.match(reference, /Return one primary output[\s\S]*co-primary/);
  assert.match(
    reference,
    /file only[\s\S]*attachment alt field or file metadata/i,
  );
  assert.match(reference, /unrequested sidecar/);
  assert.match(reference, /outer[\s\S]*capability owns the final artifact/);
  assert.match(reference, /do not claim combined-HTML guarantees/);
});
