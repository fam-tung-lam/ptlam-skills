import assert from "node:assert/strict";
import test from "node:test";
import { decideAccessibility } from "../../../../../../../skills/productivity/ptlam-visualization/scripts/mermaid/rendering/output-policy.mjs";

test("file-only accessibility has four explicit destination outcomes", () => {
  // Given every supported file-only accessibility destination.
  const cases = [
    ["png", "file-only", "attachment"],
    ["pdf", "file-only", "metadata"],
    ["png", "standard", "handoff"],
    ["pdf", "file-only", "none"],
    ["svg", "file-only", "none"],
  ];

  // When the public output policy derives each delivery decision.
  const decisions = cases.map((arguments_) => decideAccessibility(...arguments_));

  // Then supported channels pass and missing channels require a decision.
  assert.deepEqual(decisions, [
    { status: "ok", channel: "attachment" },
    { status: "ok", channel: "metadata" },
    { status: "ok", channel: "handoff" },
    {
      status: "decision-needed",
      code: "file-only-accessibility",
      message:
        "File-only PNG/PDF delivery needs attachment alt text or supported metadata; a sidecar will not be created.",
    },
    { status: "not-needed", channel: "embedded" },
  ]);
});
