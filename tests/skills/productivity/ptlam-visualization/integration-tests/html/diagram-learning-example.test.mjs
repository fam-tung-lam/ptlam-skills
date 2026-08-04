import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const exampleUrl = new URL(
  "../../../../../../skills/productivity/ptlam-visualization/assets/html/design-system/examples/diagram-learning.html",
  import.meta.url,
);
const example = await readFile(exampleUrl, "utf8");

test("golden example composes semantic zoom and synchronized flow", () => {
  assert.match(
    example,
    /ptlam-visualization-design-system-version" content="2"/,
  );
  assert.equal(
    (example.match(/data-ptv-semantic-zoom-level=/g) ?? []).length,
    3,
  );
  assert.equal((example.match(/data-ptv-semantic-zoom-in=/g) ?? []).length, 2);
  assert.match(example, /data-ptv-semantic-zoom-out/);
  assert.match(example, /class="ptv-semantic-zoom-trail"/);
  assert.ok((example.match(/class="ptv-diagram-edge"/g) ?? []).length >= 9);
  assert.equal(
    (example.match(/class="ptv-diagram-edge-label-slot"/g) ?? []).length,
    9,
  );
  assert.equal(
    (example.match(/data-ptv-label-clearance-root/g) ?? []).length,
    4,
  );

  assert.equal((example.match(/data-ptv-flow-step(?:\s|>)/g) ?? []).length, 4);
  assert.equal((example.match(/data-ptv-flow-node=/g) ?? []).length, 4);
  assert.equal((example.match(/data-ptv-flow-edge=/g) ?? []).length, 3);
  assert.match(example, /data-ptv-flow-next/);
  assert.match(example, /data-ptv-flow-back/);
  assert.match(example, /data-ptv-flow-reset/);
  assert.match(example, /data-ptv-flow-play/);
  assert.match(example, /type="range"/);
  assert.match(example, /data-ptv-flow-field="status"/);
  assert.match(example, /data-ptv-flow-explanation/);
  assert.doesNotMatch(example, /ptv-tab|data-ptv-tabs/);
});

test("golden example uses only bundled local design-system resources", async () => {
  assert.doesNotMatch(
    example,
    /<(?:link|script|img|iframe)\b[^>]*(?:href|src)=["'](?:https?:)?\/\//i,
  );

  const references = [
    ...example.matchAll(/<(?:link|script)\b[^>]*(?:href|src)="([^"]+)"/g),
  ].map((match) => match[1]);
  assert.ok(references.length >= 10);
  await Promise.all(
    references.map((reference) => access(new URL(reference, exampleUrl))),
  );
});

test("golden example keeps one readable vertical narrative", () => {
  const zoom = example.indexOf('id="ptv-zoom-heading"');
  const flow = example.indexOf('id="ptv-flow-heading"');
  assert.ok(zoom > 0);
  assert.ok(flow > zoom);
  assert.match(example, /aria-label="System abstraction path"/);
  assert.ok((example.match(/role="group"/g) ?? []).length >= 3);
  assert.match(example, /role="img"/);
  assert.match(example, /<title id="ptv-flow-title">/);
  assert.match(example, /<desc id="ptv-flow-description">/);
});
