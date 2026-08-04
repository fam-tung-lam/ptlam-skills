import assert from "node:assert/strict";
import test from "node:test";
import {
  ends,
  isComplex,
  location,
  scanHtml,
  starts,
} from "../../../../../../../skills/productivity/ptlam-visualization/scripts/html/validation/html-source.mjs";

test("HTML source scanner exposes normalized tokens and source ambiguity", () => {
  // Given markup with a complete document and one duplicate attribute.
  const source = `<!doctype html>
<html lang="en"><body><p class="first" class="second">Hello</p></body></html>`;

  // When the public source scanner and token selectors inspect it.
  const scan = scanHtml(source);

  // Then structural tokens remain usable while ambiguity is reported exactly.
  assert.deepEqual(scan.errors, []);
  assert.equal(starts(scan.tokens, "html").length, 1);
  assert.equal(starts(scan.tokens, "p").length, 1);
  assert.equal(ends(scan.tokens, "p").length, 1);
  assert.match(scan.ambiguities.join("\n"), /Duplicate "class" attributes/);
  assert.equal(location(source, source.indexOf("<p")), "line 2, column 23");
  assert.equal(isComplex("{{ dynamic }}"), true);
  assert.equal(isComplex("plain"), false);
});
