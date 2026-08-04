import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { decideAccessibility } from "../../../../../skills/productivity/ptlam-visualization/scripts/mermaid/render.mjs";
import {
  inspectMermaidSource,
  loadActiveManifest,
  normalizeMermaidSource,
} from "../../../../../skills/productivity/ptlam-visualization/scripts/mermaid/validate.mjs";
import { repositoryRoot } from "./output-fixtures/test-runtime.mjs";

test("file-only accessibility has four explicit destination outcomes", () => {
  assert.deepEqual(decideAccessibility("png", "file-only", "attachment"), {
    status: "ok",
    channel: "attachment",
  });
  assert.deepEqual(decideAccessibility("pdf", "file-only", "metadata"), {
    status: "ok",
    channel: "metadata",
  });
  assert.deepEqual(decideAccessibility("png", "standard", "handoff"), {
    status: "ok",
    channel: "handoff",
  });
  assert.equal(
    decideAccessibility("pdf", "file-only", "none").status,
    "decision-needed",
  );
  assert.equal(
    decideAccessibility("svg", "file-only", "none").status,
    "not-needed",
  );
});

test("all 31 canonical fixtures pass versioned static routing checks", async () => {
  const manifest = await loadActiveManifest();
  const fixtures = join(
    repositoryRoot,
    "tests/skills/productivity/ptlam-visualization/mermaid/fixtures",
  );
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
  assert.equal(detected.size, 31);
});

test("output reference preserves primary, co-primary, file-only, and outer ownership", async () => {
  const reference = await readFile(
    join(
      repositoryRoot,
      "skills/productivity/ptlam-visualization/references/mermaid/output-routing.md",
    ),
    "utf8",
  );
  assert.match(reference, /Return one primary output[\s\S]*co-primary/);
  assert.match(
    reference,
    /file only[\s\S]*attachment alt field or file metadata/i,
  );
  assert.match(reference, /unrequested sidecar/);
  assert.match(reference, /outer[\s\S]*capability owns the final artifact/);
  assert.match(reference, /do not claim combined-HTML guarantees/);
});
