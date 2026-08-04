import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const designSystem = new URL(
  "../../../../../../skills/productivity/ptlam-visualization/assets/html/design-system/",
  import.meta.url,
);

const readAsset = (relativePath) =>
  readFile(new URL(relativePath, designSystem), "utf8");

const [tokens, base, layout, accessibility, print, icons, template] =
  await Promise.all([
    readAsset("tokens/tokens.css"),
    readAsset("foundations/base.css"),
    readAsset("foundations/layout.css"),
    readAsset("foundations/accessibility.css"),
    readAsset("foundations/print.css"),
    readAsset("icons/icons.svg"),
    readAsset("templates/document.html"),
  ]);

const publicTokens = {
  color: [
    "canvas",
    "surface",
    "surface-muted",
    "surface-raised",
    "text",
    "text-muted",
    "border",
    "border-strong",
    "accent",
    "accent-emphasis",
    "on-accent",
    "positive",
    "warning",
    "danger",
    "focus",
    "selection",
    "code",
  ].map((name) => `--ptv-color-${name}`),
  typography: [
    "--ptv-font-sans",
    "--ptv-font-mono",
    "--ptv-text-xs",
    "--ptv-text-sm",
    "--ptv-text-md",
    "--ptv-text-lg",
    "--ptv-text-xl",
    "--ptv-text-2xl",
    "--ptv-text-3xl",
    "--ptv-leading-tight",
    "--ptv-leading-normal",
    "--ptv-leading-relaxed",
    "--ptv-weight-regular",
    "--ptv-weight-medium",
    "--ptv-weight-bold",
    "--ptv-measure",
  ],
  spacing: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"].map(
    (name) => `--ptv-space-${name}`,
  ),
  radius: ["sm", "md", "lg", "pill"].map((name) => `--ptv-radius-${name}`),
  elevation: ["sm", "md", "lg"].map((name) => `--ptv-shadow-${name}`),
  motion: [
    "--ptv-duration-instant",
    "--ptv-duration-quick",
    "--ptv-duration-standard",
    "--ptv-duration-slow",
    "--ptv-ease-standard",
    "--ptv-ease-emphasized",
  ],
  breakpoints: [
    "--ptv-breakpoint-compact",
    "--ptv-breakpoint-medium",
    "--ptv-breakpoint-wide",
  ],
};

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

test("the public token interface covers all required foundation groups", () => {
  for (const [group, names] of Object.entries(publicTokens)) {
    for (const name of names) {
      assert.match(
        tokens,
        new RegExp(`${name.replaceAll("-", "\\-")}\\s*:`),
        `${group}: ${name}`,
      );
    }
  }
});

test("system, light, and dark theme contracts expose the semantic palette", () => {
  assert.match(tokens, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.match(tokens, /:root:not\(\[data-ptv-theme\]\)/);

  const lightTheme = blockAfter(tokens, ':root[data-ptv-theme="light"]');
  const darkTheme = blockAfter(tokens, ':root[data-ptv-theme="dark"]');

  for (const name of publicTokens.color) {
    assert.match(lightTheme, new RegExp(`${name.replaceAll("-", "\\-")}\\s*:`));
    assert.match(darkTheme, new RegExp(`${name.replaceAll("-", "\\-")}\\s*:`));
  }
});

test("semantic defaults and layouts guard narrow and nested content", () => {
  for (const className of [
    "ptv-document",
    "ptv-stack",
    "ptv-grid",
    "ptv-split",
  ]) {
    assert.match(layout, new RegExp(`\\.${className}\\s*\\{`));
  }

  assert.match(base, /max-inline-size:\s*100%/);
  assert.match(base, /overflow-wrap:\s*(?:break-word|anywhere)/);
  assert.match(base, /pre\s*\{[^}]*overflow:\s*auto/s);
  assert.match(layout, /min-inline-size:\s*0/);
  assert.match(layout, /minmax\(min\(100%/);
  assert.match(layout, /minmax\(0,/);
  assert.match(layout, /@media\s*\(max-width:\s*30rem\)/);
});

test("keyboard, reduced-motion, forced-color, and print needs are explicit", () => {
  assert.match(accessibility, /:focus-visible/);
  assert.match(accessibility, /outline:\s*[^;]*var\(--ptv-color-focus\)/);
  assert.match(accessibility, /@media\s*\(forced-colors:\s*active\)/);
  assert.match(accessibility, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(accessibility, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(accessibility, /transition-duration:\s*0\.01ms\s*!important/);
  assert.match(print, /@media\s+print/);
  assert.match(print, /break-inside:\s*avoid-page/);
  assert.match(print, /details:not\(\[open\]\)/);
});

test("the starter is semantic, complete, and safe to assemble", () => {
  assert.match(template, /^<!doctype html>/i);
  assert.match(template, /<html\s+lang="\{\{PTV_LANG\}\}">/);
  assert.match(template, /<title>\{\{PTV_TITLE\}\}<\/title>/);
  assert.match(
    template,
    /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"\s*\/>/,
  );
  assert.match(
    template,
    /<meta\s+name="generator"\s+content="ptlam-visualization"\s*\/>/,
  );
  assert.match(
    template,
    /<meta\s+name="ptlam-visualization-version"\s+content="1"\s*\/>/,
  );
  assert.match(
    template,
    /<meta\s+name="ptlam-visualization-capability"\s+content="html"\s*\/>/,
  );
  assert.match(
    template,
    /<meta\s+name="ptlam-visualization-design-system-version"\s+content="1"\s*\/>/,
  );

  for (const slot of ["STYLES", "CONTENT", "SCRIPTS"]) {
    assert.equal(
      template.match(new RegExp(`PTV_SLOT:${slot}`, "g"))?.length,
      1,
      `Expected one ${slot} assembly slot`,
    );
  }

  assert.match(template, /<header\b/);
  assert.match(template, /<main\b[^>]*id="ptv-main"/);
  assert.match(template, /<h1>\{\{PTV_TITLE\}\}<\/h1>/);
  assert.match(template, /<section\b/);
  assert.match(template, /<footer\b/);
  assert.match(template, /without JavaScript/i);
  assert.doesNotMatch(template, /<script\b/i);
});

test("bundled sources are original and request no remote dependency", () => {
  for (const [name, source] of Object.entries({
    tokens,
    base,
    layout,
    accessibility,
    print,
    template,
  })) {
    assert.doesNotMatch(
      source,
      /@import\b|url\(\s*["']?(?:https?:)?\/\//i,
      name,
    );
  }

  assert.match(icons, /Original ptlam-visualization icon sprite/);
  assert.match(icons, /No third-party paths, fonts, or artwork/);
  assert.doesNotMatch(icons, /<(?:image|script)\b/i);
  assert.doesNotMatch(
    template,
    /<(?:link|script|img|iframe)\b[^>]*(?:href|src)=["'](?:https?:)?\/\//i,
  );
});
