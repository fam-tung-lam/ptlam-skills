import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../../..");
const artifactDirectory = join(testDirectory, "fixtures/artifacts");
const validatorPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/validate.mjs",
);

const fixtures = [
  {
    name: "technical-architecture.html",
    lang: "en",
    title: "Synthetic event pipeline architecture",
    treatment: "dependency-flow",
    conclusion: "every accepted event follows one ordered path to the archive",
    structure: /<ol class="fixture-flow">/,
    sourceLabel: /<strong>Source:<\/strong>/,
    caveatLabel: /<strong>Caveat:<\/strong>/,
  },
  {
    name: "decision-comparison.html",
    lang: "en",
    title: "Synthetic queue strategy decision",
    treatment: "weighted-comparison",
    conclusion: "Choose option B, Buffered lane.",
    structure: /<table class="ptv-table">[\s\S]*Weighted total/,
    sourceLabel: /<strong>Source:<\/strong>/,
    caveatLabel: /<strong>Caveat:<\/strong>/,
  },
  {
    name: "dense-records.html",
    lang: "en",
    title: "Synthetic sensor batch records",
    treatment: "explorable-records",
    conclusion: "3 of 8 synthetic batches are in alert state",
    structure: /<table class="ptv-table" data-ptv-sortable>/,
    sourceLabel: /<strong>Source:<\/strong>/,
    caveatLabel: /<strong>Caveat:<\/strong>/,
  },
  {
    name: "non-english-explainer.html",
    lang: "ru",
    title: "Как работает вымышленный буфер приливов",
    treatment: "concept-sequence",
    conclusion: "буфер не создаёт пропускную способность",
    structure: /<ol class="fixture-steps">/,
    sourceLabel: /<strong>Источник:<\/strong>/,
    caveatLabel: /<strong>Ограничение:<\/strong>/,
  },
];

const runValidator = (artifactPath) =>
  new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [validatorPath, artifactPath], {
      cwd: repositoryRoot,
      env: { PATH: process.env.PATH },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", rejectRun);
    child.once("close", (code, signal) => {
      resolveRun({ code, signal, stdout, stderr });
    });
  });

const withoutOptionalCode = (html) =>
  html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

const readableText = (html) =>
  withoutOptionalCode(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const sources = new Map(
  await Promise.all(
    fixtures.map(async (fixture) => [
      fixture.name,
      await readFile(join(artifactDirectory, fixture.name), "utf8"),
    ]),
  ),
);

for (const fixture of fixtures) {
  test(`${fixture.name}: portable artifact contract and validator`, async () => {
    const html = sources.get(fixture.name);
    const visibleHtml = withoutOptionalCode(html);
    const visibleText = readableText(html);

    assert.match(html, /^<!doctype html>/i);
    assert.match(html, new RegExp(`<html lang="${fixture.lang}">`));
    assert.match(html, new RegExp(`<title>${fixture.title}</title>`));
    assert.match(
      html,
      /<meta name="viewport" content="width=device-width, initial-scale=1" \/>/,
    );
    assert.match(
      html,
      /<meta name="generator" content="ptlam-visualization" \/>/,
    );
    assert.match(
      html,
      /<meta name="ptlam-visualization-version" content="1" \/>/,
    );
    assert.match(
      html,
      /<meta name="ptlam-visualization-capability" content="html" \/>/,
    );
    assert.match(
      html,
      /<meta name="ptlam-visualization-design-system-version" content="1" \/>/,
    );
    assert.doesNotMatch(
      html,
      new RegExp(["ptlam", "visualization", "with", "html"].join("-")),
    );
    assert.match(html, /ptlam-visualization design tokens, version 1/);
    assert.match(html, /Semantic document defaults for ptlam-visualization/);
    assert.match(html, /Responsive layout primitives for ptlam-visualization/);
    assert.match(
      html,
      new RegExp(`data-fixture-treatment="${fixture.treatment}"`),
    );
    assert.ok(
      visibleText
        .toLocaleLowerCase(fixture.lang)
        .includes(fixture.conclusion.toLocaleLowerCase(fixture.lang)),
      `${fixture.name} must keep its conclusion in no-JS-readable text`,
    );
    assert.match(visibleHtml, fixture.structure);
    assert.match(visibleHtml, fixture.sourceLabel);
    assert.match(visibleHtml, fixture.caveatLabel);
    assert.doesNotMatch(html, /PTV_SLOT:|\{\{PTV_/);

    const result = await runValidator(join(artifactDirectory, fixture.name));
    assert.equal(result.code, 0, result.stderr || result.stdout);
    assert.equal(result.signal, null);
    assert.equal(result.stderr, "");
    assert.doesNotMatch(result.stdout, /^(?:ERROR|WARNING)\b/m);
    for (const code of [
      "browser-ids-fragments",
      "browser-landmarks-headings",
      "browser-control-names",
      "browser-layout",
      "browser-interaction",
    ]) {
      assert.match(result.stdout, new RegExp(`UNVERIFIED \\[${code}\\]`));
    }
    assert.match(
      result.stdout,
      /SUMMARY errors=0 warnings=0 unverified=5 local-assets=0/,
    );
  });
}

test("fixtures use four distinct compositions for their natural structures", () => {
  assert.deepEqual(
    new Set(fixtures.map(({ treatment }) => treatment)),
    new Set([
      "dependency-flow",
      "weighted-comparison",
      "explorable-records",
      "concept-sequence",
    ]),
  );

  const technical = sources.get("technical-architecture.html");
  const comparison = sources.get("decision-comparison.html");
  const records = sources.get("dense-records.html");
  const russian = sources.get("non-english-explainer.html");
  assert.match(technical, /class="fixture-flow"/);
  assert.match(comparison, /class="fixture-options"/);
  assert.match(records, /data-ptv-filter-item/g);
  assert.match(russian, /class="fixture-equation"/);
  assert.doesNotMatch(russian, /\b(?:Conclusion|Source|Caveat)\b/);
});

test("the set covers the required progressive exploration contracts", () => {
  const allHtml = [...sources.values()].join("\n");
  const comparison = sources.get("decision-comparison.html");
  const records = sources.get("dense-records.html");

  assert.match(comparison, /<details\b[^>]*data-ptv-disclosure/);
  assert.match(records, /<input\b[^>]*data-ptv-search/);
  assert.match(records, /<button\b[^>]*data-ptv-sort="number"/);
  assert.match(records, /<button\b[^>]*data-ptv-highlight="alert"/);
  assert.match(records, /<button\b[^>]*data-ptv-copy/);
  assert.match(
    records,
    /Progressive exploration behaviors for ptlam-visualization/,
  );
  assert.match(records, /export function initPtvBehaviors/);
  assert.match(records, /class="ptv-table-region"/);
  assert.match(allHtml, /Current reconstruction/);
  assert.match(allHtml, /Proposed concept/);

  const unenhancedRecords = withoutOptionalCode(records);
  assert.equal(
    (unenhancedRecords.match(/data-ptv-filter-item/g) ?? []).length,
    8,
  );
  assert.doesNotMatch(
    unenhancedRecords,
    /<tr\b[^>]*data-ptv-filter-item[^>]*\bhidden\b/i,
  );
});

test("fixtures are standalone and contain no network or persistence capability", () => {
  for (const [name, html] of sources) {
    assert.doesNotMatch(
      html,
      /<(?:script|link|img|iframe|source|video|audio)\b[^>]*(?:src|href)=\s*["'](?:https?:)?\/\//i,
      name,
    );
    assert.doesNotMatch(html, /@import\b|url\(\s*["']?(?:https?:)?\/\//i, name);
    assert.doesNotMatch(
      html,
      /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/,
      name,
    );
    assert.doesNotMatch(
      html,
      /\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie/,
      name,
    );
    assert.doesNotMatch(html, /\beval\s*\(|new\s+Function\b/, name);
    assert.doesNotMatch(
      html,
      /\b(?:innerHTML|outerHTML|insertAdjacentHTML)\b/,
      name,
    );
    assert.doesNotMatch(html, /\son[a-z]+\s*=/i, name);
  }
});

test("fixtures preserve exact synthetic evidence instead of live data", () => {
  const technical = sources.get("technical-architecture.html");
  const comparison = sources.get("decision-comparison.html");
  const records = sources.get("dense-records.html");
  const russian = sources.get("non-english-explainer.html");

  assert.match(
    technical,
    /240 events\/s[\s\S]*3,600 envelopes[\s\S]*30 s lease/,
  );
  assert.match(comparison, /3\.80[\s\S]*4\.00[\s\S]*3\.00/);
  assert.match(records, /8,200[\s\S]*S-104[\s\S]*210 ms[\s\S]*3\.1%/);
  assert.match(russian, /12 л\/с[\s\S]*8 л\/с[\s\S]*4 л\/с[\s\S]*10 с/);

  for (const html of sources.values()) {
    assert.match(html, /synthetic|синтетическ/i);
    assert.doesNotMatch(
      html,
      /(?:\/Users\/|conversation[_ -]?id|customer[_ -]?id)/i,
    );
  }
});
