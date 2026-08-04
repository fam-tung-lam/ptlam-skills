import assert from "node:assert/strict";
import test from "node:test";
import { HtmlValidationReport } from "../../../../../../../skills/productivity/ptlam-visualization/scripts/html/validation/report.mjs";

test("validation report prints ordered findings and one exact summary", () => {
  // Given findings and resource totals collected through the public report API.
  const report = new HtmlValidationReport();
  report.error("document-title", "A title is required.");
  report.warning("remote-resource", "A remote resource needs review.");
  report.unverified("browser-layout", "Browser layout remains unverified.");
  report.localAssetCount = 2;
  report.totalBytes = 512;
  const lines = [];

  // When the report is printed through an injected output boundary.
  report.print((line) => lines.push(line));

  // Then every finding and aggregate count is observable in stable order.
  assert.deepEqual(lines, [
    "ERROR [document-title] A title is required.",
    "WARNING [remote-resource] A remote resource needs review.",
    "UNVERIFIED [browser-layout] Browser layout remains unverified.",
    "SUMMARY errors=1 warnings=1 unverified=1 local-assets=2 total-bytes=512",
  ]);
});
