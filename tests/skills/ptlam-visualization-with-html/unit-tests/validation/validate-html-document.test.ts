import assert from "node:assert/strict";
import { describe, test } from "vitest";

import { validateHtmlDocument } from "../../../../../plugin/skills/ptlam-visualization-with-html/scripts/validation/validate-html-document.ts";

describe("validateHtmlDocument", () => {
  test("accepts a complete portable interactive visualization", () => {
    // GIVEN: A document provides the shell, accessible SVG, complete stepper, C4 maps, and valid script.
    const source = validHtmlDocument();

    // WHEN: The document contract is validated.
    const result = validateHtmlDocument(source);

    // THEN: The immutable result contains no diagnostics.
    assert.deepEqual(result, { errors: [], warnings: [] });
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.errors), true);
    assert.equal(Object.isFrozen(result.warnings), true);
  });

  test.each([
    {
      name: "HTML5 doctype",
      mutate: (source: string) => source.replace("<!doctype html>", ""),
      error: "missing HTML5 doctype",
    },
    {
      name: "language",
      mutate: (source: string) => source.replace(' lang="en"', ""),
      error: "html element needs a lang attribute",
    },
    {
      name: "viewport",
      mutate: (source: string) =>
        source.replace(
          '<meta name="viewport" content="width=device-width">',
          "",
        ),
      error: "missing viewport meta tag",
    },
    {
      name: "document title",
      mutate: (source: string) =>
        source.replace("<title>Guide</title>", "<title> </title>"),
      error: "missing non-empty title",
    },
    {
      name: "single main",
      mutate: (source: string) =>
        source.replace('<main id="main">', '<div id="main">'),
      error: "expected exactly one main element, found 0",
    },
    {
      name: "single non-empty heading",
      mutate: (source: string) =>
        source.replace("<h1>Guide</h1>", "<h1> </h1>"),
      error: "expected exactly one non-empty h1",
    },
    {
      name: "skip link",
      mutate: (source: string) => source.replace("skip-link", "jump-link"),
      error: "missing visible-on-focus skip link",
    },
    {
      name: "horizontal overflow guard",
      mutate: (source: string) =>
        source.replace("overflow-x: hidden", "overflow: hidden"),
      error: "missing document-level horizontal overflow guard",
    },
    {
      name: "reduced motion",
      mutate: (source: string) =>
        source.replace("prefers-reduced-motion: reduce", "min-width: 1px"),
      error: "missing prefers-reduced-motion handling",
    },
    {
      name: "focus style",
      mutate: (source: string) => source.replace(":focus-visible", ":focus"),
      error: "missing explicit keyboard focus style",
    },
  ])("reports a missing $name contract", ({ mutate, error }) => {
    // GIVEN: One required document-shell behavior is absent.
    const source = mutate(validHtmlDocument());

    // WHEN: The document is validated.
    const result = validateHtmlDocument(source);

    // THEN: The precise shell diagnostic is included.
    assert.equal(result.errors.includes(error), true);
  });

  test("reports duplicate identifiers and missing fragment targets in stable order", () => {
    // GIVEN: Internal references contain duplicate and unresolved identifiers.
    const source = validHtmlDocument()
      .replace(
        "<h1>Guide</h1>",
        '<h1 id="zeta">Guide</h1><p id="zeta">Duplicate</p>',
      )
      .replace(
        "</main>",
        '<a href="#zeta">Known</a><a href="#beta">B</a><a href="#alpha">A</a></main>',
      );

    // WHEN: References are validated.
    const result = validateHtmlDocument(source);

    // THEN: Diagnostics are deduplicated and sorted by code point.
    assert.equal(result.errors.includes("duplicate ids: zeta"), true);
    assert.equal(
      result.errors.includes("missing internal link targets: alpha, beta"),
      true,
    );
  });

  test("reports every external runtime asset while allowing embedded and fragment assets", () => {
    // GIVEN: Runtime references appear in HTML attributes, srcset, inline CSS, and style blocks.
    const assets = [
      '<link href="theme.css">',
      '<script src="app.js"></script>',
      '<img src="image.png" srcset="small.png 1x, large.png 2x" style="background:url(texture.png)">',
      '<video poster="poster.png"></video>',
      '<object data="diagram.svg"></object>',
      '<svg role="img" aria-label="Inline"><use href="sprite.svg#icon"></use><image href="data:image/png;base64,AA"></image></svg>',
      '<img src="data:image/png;base64,AA">',
      '<style>@import "print.css"; .a{background:url(#gradient)} .b{background:url(data:image/png;base64,AA)}</style>',
    ].join("");
    const source = validHtmlDocument().replace("</head>", `${assets}</head>`);

    // WHEN: Portability is validated.
    const result = validateHtmlDocument(source);

    // THEN: One stable diagnostic names each non-embedded asset.
    assert.equal(
      result.errors.includes(
        "runtime assets must be embedded: app.js, css-import:print.css, css-url:texture.png, diagram.svg, image.png, poster.png, sprite.svg#icon, srcset:large.png, srcset:small.png, theme.css",
      ),
      true,
    );
  });

  test("requires every SVG to expose an accessible name", () => {
    // GIVEN: One SVG lacks role=img and another points to an empty label.
    const source = validHtmlDocument().replace(
      "</main>",
      '<svg aria-label="Missing role"></svg><p id="empty-label"></p><svg role="img" aria-labelledby="empty-label"></svg></main>',
    );

    // WHEN: SVG accessibility is validated.
    const result = validateHtmlDocument(source);

    // THEN: The diagnostic reports the accessible and total counts.
    assert.equal(
      result.errors.includes(
        "all SVGs need role=img plus a non-empty aria-label or resolvable aria-labelledby (1/3)",
      ),
      true,
    );
  });

  test.each(["next", "back", "play", "reset"])(
    "requires the %s action in every stepper",
    (action) => {
      // GIVEN: A stepper omits one required control action.
      const source = validHtmlDocument().replace(
        `data-action="${action}"`,
        `data-removed-action="${action}"`,
      );

      // WHEN: The stepper contract is validated.
      const result = validateHtmlDocument(source);

      // THEN: The missing action is named with its stepper.
      assert.equal(
        result.errors.includes(`stepper "flow" missing ${action} button`),
        true,
      );
    },
  );

  test("does not let an outer stepper borrow a nested stepper's controls", () => {
    // GIVEN: An incomplete outer stepper wraps an independently complete stepper.
    const source = validHtmlDocument()
      .replace(
        '<section data-stepper="flow">',
        '<section data-stepper="outer"><section data-stepper="flow">',
      )
      .replace(
        "</section>\n    <section data-c4>",
        "</section></section>\n    <section data-c4>",
      );

    // WHEN: Each stepper is validated within its own control boundary.
    const result = validateHtmlDocument(source);

    // THEN: The outer stepper reports its own missing controls and state.
    assert.deepEqual(
      result.errors.filter((error) => error.startsWith('stepper "outer"')),
      [
        'stepper "outer" missing next button',
        'stepper "outer" missing back button',
        'stepper "outer" missing play button',
        'stepper "outer" missing reset button',
        'stepper "outer" missing synchronized caption',
        'stepper "outer" missing step counter',
        'stepper "outer" missing no-JavaScript step summary',
        'stepper "outer" play/pause button needs aria-pressed',
      ],
    );
    assert.equal(
      result.errors.some((error) => error.startsWith('stepper "flow"')),
      false,
    );
  });

  test("reports missing synchronized stepper state and play semantics", () => {
    // GIVEN: A stepper loses its caption, counter, summary, and pressed state.
    const source = validHtmlDocument()
      .replace("data-step-caption", "data-removed-caption")
      .replace("data-step-count", "data-removed-count")
      .replace(' aria-pressed="false"', "")
      .replace(/<noscript>[\s\S]*?<\/noscript>/, "");

    // WHEN: The stepper is validated.
    const result = validateHtmlDocument(source);

    // THEN: Every independent missing behavior is reported.
    assert.deepEqual(
      result.errors.filter((error) => error.startsWith('stepper "flow"')),
      [
        'stepper "flow" missing synchronized caption',
        'stepper "flow" missing step counter',
        'stepper "flow" missing no-JavaScript step summary',
        'stepper "flow" play/pause button needs aria-pressed',
      ],
    );
  });

  test.each([
    {
      summary: "Too short",
      count: "1 / 3",
      error: 'stepper "flow" has an empty no-JavaScript step summary',
    },
    {
      summary: "First complete step → second complete step",
      count: "first of three",
      error: 'stepper "flow" step counter must show current / total',
    },
    {
      summary: "First complete step → second complete step",
      count: "1 / 3",
      error: 'stepper "flow" no-JavaScript summary covers 2/3 steps',
    },
  ])(
    "reports an invalid no-script summary: $error",
    ({ summary, count, error }) => {
      // GIVEN: The static summary and visible count disagree with the interactive flow.
      const source = validHtmlDocument()
        .replace("1 / 2", count)
        .replace(
          "<ol><li>First complete step</li><li>Second complete step</li></ol>",
          summary,
        );

      // WHEN: Static fallback coverage is validated.
      const result = validateHtmlDocument(source);

      // THEN: The relevant fallback diagnostic is reported.
      assert.equal(result.errors.includes(error), true);
    },
  );

  test("requires multiple C4 maps and an explicit zoom-out control", () => {
    // GIVEN: C4 zoom contains one level and no back control.
    const source = validHtmlDocument()
      .replace('<div data-c4-level="containers"></div>', "")
      .replace("data-c4-back", "data-removed-c4-back");

    // WHEN: Semantic zoom is validated.
    const result = validateHtmlDocument(source);

    // THEN: Both navigation requirements are reported.
    assert.equal(
      result.errors.includes(
        "C4 semantic zoom needs at least two distinct maps",
      ),
      true,
    );
    assert.equal(
      result.errors.includes(
        "C4 semantic zoom needs an explicit Zoom out control",
      ),
      true,
    );
  });

  test("reports invalid embedded JavaScript with a stable block number", () => {
    // GIVEN: The second inline script contains invalid JavaScript.
    const source = validHtmlDocument().replace(
      "</body>",
      "<script>const valid = true;</script><script>const broken = ;</script></body>",
    );

    // WHEN: Embedded JavaScript is syntax checked.
    const result = validateHtmlDocument(source);

    // THEN: The invalid block is identified without a temporary filename.
    assert.equal(
      result.errors.some((error) =>
        error.startsWith("JavaScript block 3 does not parse:"),
      ),
      true,
    );
  });

  test("does not interpret comments or raw script text as document elements", () => {
    // GIVEN: Comments and JavaScript strings contain HTML-looking markup.
    const source = validHtmlDocument()
      .replace("<head>", "<head><!-- <main><h1>Comment</h1></main> -->")
      .replace(
        "const ready = true;",
        'const ready = "<main><h1>Script text</h1></main>";',
      );

    // WHEN: The source is parsed and validated.
    const result = validateHtmlDocument(source);

    // THEN: Raw text does not create duplicate document landmarks.
    assert.deepEqual(result.errors, []);
  });
});

function validHtmlDocument(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta name="viewport" content="width=device-width">
  <title>Guide</title>
  <style>
    html, body { overflow-x: hidden; }
    :focus-visible { outline: 2px solid; }
    @media (prefers-reduced-motion: reduce) { * { animation: none; } }
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip</a>
  <h1>Guide</h1>
  <main id="main">
    <p id="svg-title">Accessible flow</p>
    <svg role="img" aria-labelledby="svg-title"></svg>
    <section data-stepper="flow">
      <button data-action="next">Next</button>
      <button data-action="back">Back</button>
      <button data-action="play" aria-pressed="false">Play</button>
      <button data-action="reset">Reset</button>
      <output data-step-count>1 / 2</output>
      <p data-step-caption>First step</p>
      <noscript><ol><li>First complete step</li><li>Second complete step</li></ol></noscript>
    </section>
    <section data-c4>
      <button data-c4-back>Zoom out</button>
      <div data-c4-level="context"></div>
      <div data-c4-level="containers"></div>
    </section>
  </main>
  <script>const ready = true;</script>
</body>
</html>`;
}
