import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { renderHtmlScaffold } from "../../../../../plugin/skills/ptlam-visualization-with-html/scripts/scaffolding/render-html-scaffold.ts";
import { validateHtmlDocument } from "../../../../../plugin/skills/ptlam-visualization-with-html/scripts/validation/validate-html-document.ts";

describe("renderHtmlScaffold", () => {
  it("renders a valid portable document with an escaped title", () => {
    // GIVEN: A title contains every character that can enter HTML markup.
    const title = `<Architecture & "flow's">`;

    // WHEN: The reusable scaffold renderer creates the document source.
    const source = renderHtmlScaffold({ title });

    // THEN: The title is safely rendered in both locations and the document validates.
    assert.equal(
      source.match(/&lt;Architecture &amp; &quot;flow&#x27;s&quot;&gt;/g)
        ?.length,
      2,
    );
    assert.equal(source.includes("overflow-x:hidden"), false);
    assert.deepEqual(validateHtmlDocument(source).errors, []);
  });

  it.each([undefined, "", "   "])(
    "uses the default title when the requested title is %s",
    (title) => {
      // GIVEN: The caller does not supply a meaningful title.
      const request = title === undefined ? {} : { title };

      // WHEN: The scaffold is rendered.
      const source = renderHtmlScaffold(request);

      // THEN: A useful default title appears in the document title and heading.
      assert.equal(source.match(/How the system works/g)?.length, 2);
    },
  );
});
