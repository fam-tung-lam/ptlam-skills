import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const designSystem = new URL(
  "../../../../../skills/productivity/ptlam-visualization/assets/html/design-system/",
  import.meta.url,
);

const readAsset = (relativePath) =>
  readFile(new URL(relativePath, designSystem), "utf8");

const [tokens, content, data, navigation] = await Promise.all([
  readAsset("tokens/tokens.css"),
  readAsset("components/content.css"),
  readAsset("components/data.css"),
  readAsset("components/navigation.css"),
]);

const componentSources = { content, data, navigation };
const allComponents = Object.values(componentSources).join("\n");
const publicTokens = new Set(
  [...tokens.matchAll(/(--ptv-[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
);

const blockAfter = (source, selector) => {
  const selectorStart = source.indexOf(selector);
  assert.notEqual(selectorStart, -1, `Missing selector: ${selector}`);
  const openingBrace = source.indexOf("{", selectorStart);
  let depth = 0;

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }

  assert.fail(`Unclosed block for selector: ${selector}`);
};

const assertClasses = (source, classNames) => {
  for (const className of classNames) {
    assert.match(source, new RegExp(`\\.${className}(?![a-z0-9-])`), className);
  }
};

test("the public class inventory covers every required component family", () => {
  assertClasses(content, [
    "ptv-section",
    "ptv-card",
    "ptv-callout",
    "ptv-badge",
    "ptv-stat-list",
    "ptv-stat",
    "ptv-quote",
    "ptv-code-block",
  ]);
  assertClasses(data, [
    "ptv-key-values",
    "ptv-key-value",
    "ptv-table-region",
    "ptv-table",
    "ptv-table-number",
  ]);
  assertClasses(navigation, [
    "ptv-toc",
    "ptv-tabs",
    "ptv-tab-list",
    "ptv-tab",
    "ptv-tab-panel",
    "ptv-disclosure",
    "ptv-control-group",
    "ptv-control",
  ]);

  const classes = [...allComponents.matchAll(/\.([a-z][a-z0-9-]*)/g)].map(
    (match) => match[1],
  );
  assert.ok(classes.length > 0);
  assert.deepEqual(
    classes.filter((className) => !className.startsWith("ptv-")),
    [],
  );
});

test("components reference only the public token interface", () => {
  for (const [name, source] of Object.entries(componentSources)) {
    const references = [...source.matchAll(/var\((--[a-z0-9-]+)/g)].map(
      (match) => match[1],
    );

    assert.ok(references.length > 0, name);
    for (const reference of references) {
      assert.ok(publicTokens.has(reference), `${name}: unknown ${reference}`);
    }

    assert.doesNotMatch(source, /(^|[^a-z0-9-])--(?!ptv-)[a-z0-9-]+/i, name);
    assert.doesNotMatch(
      source,
      /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch)\(/i,
      name,
    );

    const spacingDeclarations = [
      ...source.matchAll(
        /^\s*((?:margin|padding|gap|row-gap|column-gap|inset)(?:-[a-z]+)?)\s*:\s*([^;]+);/gm,
      ),
    ];
    for (const [, property, value] of spacingDeclarations) {
      assert.match(
        value,
        /var\(--ptv-space-[a-z0-9-]+\)|^(?:0|auto)$/,
        `${name}: ${property} must use a public spacing token`,
      );
    }
  }
});

test("nested component layouts and long values have static overflow guards", () => {
  for (const selector of [
    ".ptv-section",
    ".ptv-card",
    ".ptv-callout",
    ".ptv-stat",
    ".ptv-code-block",
  ]) {
    assert.match(blockAfter(content, selector), /min-inline-size:\s*0/);
  }

  assert.match(content, /\.ptv-card\s*>\s*\*/);
  assert.match(content, /minmax\(min\(100%/);
  assert.match(blockAfter(data, ".ptv-key-value"), /min-inline-size:\s*0/);
  assert.match(data, /\.ptv-key-value\s*>\s*\*[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(blockAfter(data, ".ptv-table-region"), /overflow-x:\s*auto/);
  assert.match(
    data,
    /\.ptv-table th,[^}]*\.ptv-table td[^}]*overflow-wrap:\s*anywhere/s,
  );
  assert.match(data, /word-break:\s*break-word/);
  assert.match(navigation, /flex-wrap:\s*wrap/);
  assert.match(navigation, /\.ptv-tab-panel\s*>\s*\*/);
});

test("responsive data patterns preserve cells and numeric meaning", () => {
  assert.match(data, /@media\s*\(max-width:\s*30rem\)/);
  assert.match(data, /\.ptv-table-number[^}]*text-align:\s*end/s);
  assert.match(data, /font-variant-numeric:\s*tabular-nums/);
  assert.doesNotMatch(
    blockAfter(data, "@media (max-width: 30rem)"),
    /(?:th|td|tr)[^{]*\{[^}]*display:\s*none/s,
  );
  assert.doesNotMatch(data, /(?:th|td)\s*\{[^}]*overflow:\s*hidden/s);
});

test("native controls expose visible focus, selection, and expanded states", () => {
  assert.match(navigation, /\.ptv-tab:focus-visible/);
  assert.match(navigation, /\.ptv-control:focus-visible/);
  assert.match(data, /\.ptv-table-region:focus-visible/);
  assert.match(navigation, /\.ptv-tab\[aria-selected="true"\]/);
  assert.match(navigation, /\.ptv-toc-link\[aria-current="location"\]/);
  assert.match(navigation, /\.ptv-control\[aria-pressed="true"\]/);
  assert.match(navigation, /\.ptv-disclosure\[open\]/);
  assert.match(navigation, /\.ptv-disclosure-summary\[aria-expanded="true"\]/);
  assert.doesNotMatch(allComponents, /\[data-ptv-[^\]]+\]/);
});

test("components preserve printable content and have no remote source", () => {
  for (const [name, source] of Object.entries(componentSources)) {
    assert.match(source, /Original work\./, name);
    assert.match(source, /@media\s+print/, name);
    assert.doesNotMatch(
      source,
      /@import\b|url\(\s*["']?(?:https?:)?\/\//i,
      name,
    );
  }

  assert.match(
    data,
    /@media\s+print[^]*\.ptv-table-region[^]*overflow:\s*visible/,
  );
  assert.match(
    navigation,
    /@media\s+print[^]*\.ptv-tab-panel\[hidden\][^]*display:\s*block\s*!important/,
  );
});
