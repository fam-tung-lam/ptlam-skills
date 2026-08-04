import assert from "node:assert/strict";
import test from "node:test";
import {
  ACTIVE_MERMAID_VERSION,
  canonicalRecordJson,
  normalizeMermaidSource,
  sourceSha256,
  validateEmbeddedMermaidRecord,
} from "../../../../../../../skills/productivity/ptlam-visualization/scripts/html/lib/embedded-mermaid-record.mjs";

test("embedded Mermaid record validates one canonical source contract", () => {
  // Given a normalized record built from independent literal inputs.
  const source = normalizeMermaidSource("flowchart LR\r\n  A --> B\r\n");
  const record = {
    schemaVersion: 1,
    diagramId: "request-flow",
    sourceEncoding: "utf-8",
    source,
    sourceSha256: sourceSha256(source),
    mermaidVersion: ACTIVE_MERMAID_VERSION,
    capsuleId: "a".repeat(64),
  };

  // When the public record validator and canonical serializer process it.
  const validated = validateEmbeddedMermaidRecord(record, {
    expectedCapsuleId: "a".repeat(64),
  });
  const serialized = canonicalRecordJson(validated);

  // Then the record is preserved exactly in canonical key order.
  assert.equal(validated, record);
  assert.deepEqual(JSON.parse(serialized), record);
  assert.deepEqual(Object.keys(JSON.parse(serialized)), Object.keys(record));
});
