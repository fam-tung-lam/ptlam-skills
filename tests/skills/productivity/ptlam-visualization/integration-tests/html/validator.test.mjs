import assert from "node:assert/strict";
import { lstat, mkdir, truncate, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  runNodeCommand,
  withTemporaryDirectory,
} from "../utils/node-command.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../../..");
const validatorPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/validate.mjs",
);
const validFixture = join(testDirectory, "fixtures/validator/valid.html");
const MB = 1024 * 1024;

function runValidator(arguments_, options = {}) {
  return runNodeCommand(validatorPath, arguments_, {
    cwd: options.cwd ?? repositoryRoot,
    env: options.env,
  });
}

function documentWith(body, extraHead = "") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="generator" content="ptlam-visualization">
    <meta name="ptlam-visualization-version" content="1">
    <meta name="ptlam-visualization-capability" content="html">
    <meta name="ptlam-visualization-design-system-version" content="1">
    <title>Temporary validator test</title>
    ${extraHead}
  </head>
  <body>${body}</body>
</html>
`;
}

const withValidatorDirectory = (run) =>
  withTemporaryDirectory("ptlam-visualization-validator-", run);

test("valid fixture exits zero and never claims browser-only checks passed", async () => {
  // Given a complete portable HTML artifact.
  const input = validFixture;

  // When it is validated through the public command.
  const result = await runValidator([input]);

  // Then deterministic checks pass and browser-only checks stay unverified.
  assert.equal(result.code, 0, result.stdout + result.stderr);
  assert.equal(result.signal, null);
  assert.equal(result.stderr, "");
  assert.doesNotMatch(result.stdout, /^ERROR /m);
  assert.match(result.stdout, /^UNVERIFIED \[browser-ids-fragments\]/m);
  assert.match(result.stdout, /^UNVERIFIED \[browser-landmarks-headings\]/m);
  assert.match(result.stdout, /^UNVERIFIED \[browser-control-names\]/m);
  assert.match(result.stdout, /^UNVERIFIED \[browser-layout\]/m);
  assert.doesNotMatch(result.stdout, /PASS(?:ED)? \[browser-/i);
  assert.match(
    result.stdout,
    /^SUMMARY errors=0 warnings=0 unverified=5 local-assets=0 total-bytes=\d+$/m,
  );
});

test("missing input and malformed required structure are actionable errors", async () => {
  // Given a missing input and a malformed HTML document.
  await withValidatorDirectory(async (directory) => {
    // When each input is validated through the public command.
    const missing = await runValidator([join(directory, "missing.html")]);
    // Then the missing input has an actionable error.
    assert.notEqual(missing.code, 0);
    assert.match(missing.stdout, /^ERROR \[input-path\].*missing\.html/m);
    assert.match(missing.stdout, /^SUMMARY errors=1 warnings=0 unverified=0/m);

    const malformedPath = join(directory, "malformed.html");
    await writeFile(
      malformedPath,
      '<html lang="en"><head><title>Broken</title><body><p>Body</p></body></html>',
      "utf8",
    );
    const malformed = await runValidator([malformedPath]);
    // Then every independent document contract failure is reported.
    assert.notEqual(malformed.code, 0);
    assert.match(malformed.stdout, /^ERROR \[document-doctype\]/m);
    assert.match(malformed.stdout, /^ERROR \[document-structure\].*<\/head>/m);
    assert.match(malformed.stdout, /^ERROR \[metadata-viewport\]/m);
    assert.match(malformed.stdout, /^ERROR \[metadata-generator\]/m);
    assert.match(
      malformed.stdout,
      /^ERROR \[metadata-ptlam-visualization-version\]/m,
    );
    assert.match(
      malformed.stdout,
      /^ERROR \[metadata-ptlam-visualization-capability\]/m,
    );
    assert.match(
      malformed.stdout,
      /^ERROR \[metadata-ptlam-visualization-design-system-version\]/m,
    );
  });
});

test("unsafe opener semantics and broken local assets are errors", async () => {
  // Given an artifact with an unsafe external opener and a missing local asset.
  await withValidatorDirectory(async (directory) => {
    const htmlPath = join(directory, "errors.html");
    await writeFile(
      htmlPath,
      documentWith(`
        <main>
          <a href="https://example.com" target="_blank">Unsafe external link</a>
          <img src="missing.png" alt="Missing fixture">
        </main>`),
      "utf8",
    );

    // When it is validated through the public command.
    const result = await runValidator([htmlPath]);
    // Then both safety failures are visible.
    assert.notEqual(result.code, 0, result.stdout);
    assert.match(
      result.stdout,
      /^ERROR \[external-link-opener\].*noopener noreferrer/m,
    );
    assert.match(result.stdout, /^ERROR \[missing-asset\].*missing\.png/m);
    assert.match(result.stdout, /^SUMMARY errors=2 warnings=0 unverified=5/m);
  });
});

test("language, title, viewport, and generator fields are checked independently", async () => {
  // Given an artifact whose required metadata fields are independently invalid.
  await withValidatorDirectory(async (directory) => {
    const htmlPath = join(directory, "metadata-errors.html");
    await writeFile(
      htmlPath,
      `<!doctype html>
<html lang="not_a_tag">
  <head>
    <meta name="viewport" content="initial-scale=1">
    <meta name="generator" content="another-generator">
    <meta name="ptlam-visualization-version" content="2">
    <meta name="ptlam-visualization-capability" content="combined">
    <meta name="ptlam-visualization-design-system-version" content="2">
    <title> </title>
  </head>
  <body><main>Readable source</main></body>
</html>`,
      "utf8",
    );

    // When it is validated through the public command.
    const result = await runValidator([htmlPath]);
    // Then each metadata contract reports its own error.
    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /^ERROR \[document-language\]/m);
    assert.match(result.stdout, /^ERROR \[document-title\]/m);
    assert.match(
      result.stdout,
      /^ERROR \[metadata-viewport\].*width=device-width/m,
    );
    assert.match(result.stdout, /^ERROR \[metadata-generator\]/m);
    assert.match(
      result.stdout,
      /^ERROR \[metadata-ptlam-visualization-version\]/m,
    );
    assert.match(
      result.stdout,
      /^ERROR \[metadata-ptlam-visualization-capability\]/m,
    );
    assert.match(
      result.stdout,
      /^ERROR \[metadata-ptlam-visualization-design-system-version\]/m,
    );
  });
});

test("asset paths outside the artifact directory are rejected without following them", async () => {
  // Given a local asset reference that escapes the artifact directory.
  await withValidatorDirectory(async (directory) => {
    const artifactDirectory = join(directory, "artifact");
    const htmlPath = join(artifactDirectory, "outside.html");
    await writeFile(join(directory, "private.txt"), "must not be read", "utf8");
    await mkdir(artifactDirectory);
    await writeFile(
      htmlPath,
      documentWith('<main><img src="../private.txt" alt="Outside"></main>'),
      "utf8",
    );

    // When it is validated through the public command.
    const result = await runValidator([htmlPath]);
    // Then the escape is rejected without reading the target contents.
    assert.notEqual(result.code, 0);
    assert.match(
      result.stdout,
      /^ERROR \[asset-outside-context\].*was not followed/m,
    );
    assert.doesNotMatch(result.stdout, /must not be read/);
  });
});

test("remote dependencies and size thresholds are warnings and preserve a zero exit", async () => {
  // Given readable large local assets and an unfetched remote dependency.
  await withValidatorDirectory(async (directory) => {
    const firstAsset = join(directory, "first.bin");
    const secondAsset = join(directory, "second.bin");
    await writeFile(firstAsset, "");
    await writeFile(secondAsset, "");
    await truncate(firstAsset, 13 * MB);
    await truncate(secondAsset, 13 * MB);
    const htmlPath = join(directory, "warnings.html");
    await writeFile(
      htmlPath,
      documentWith(
        '<main><img src="first.bin" alt="First"><img src="second.bin" alt="Second"></main>',
        '<script src="https://example.invalid/never-fetch.js"></script>',
      ),
      "utf8",
    );

    // When the artifact is validated through the public command.
    const result = await runValidator([htmlPath]);
    // Then the risks are warnings and deterministic validation still succeeds.
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /^ERROR /m);
    assert.match(
      result.stdout,
      /^WARNING \[remote-dependency\].*it was not fetched/m,
    );
    assert.equal(
      (result.stdout.match(/^WARNING \[asset-size\]/gm) ?? []).length,
      2,
    );
    assert.match(result.stdout, /^WARNING \[total-size\]/m);
    assert.match(
      result.stdout,
      /^SUMMARY errors=0 warnings=4 unverified=5 local-assets=2/m,
    );
  });
});

test("warning-only overflow hazards do not fail validation", async () => {
  // Given CSS with a statically detectable narrow-screen overflow hazard.
  await withValidatorDirectory(async (directory) => {
    const htmlPath = join(directory, "overflow.html");
    await writeFile(
      htmlPath,
      documentWith(
        '<main class="ptv-wide">Wide content remains readable in source.</main>',
        "<style>.ptv-wide { min-width: 640px; }</style>",
      ),
      "utf8",
    );

    // When the artifact is validated through the public command.
    const result = await runValidator([htmlPath]);
    // Then the hazard is reported without turning browser QA into a false error.
    assert.equal(result.code, 0, result.stdout);
    assert.match(result.stdout, /^WARNING \[overflow-hazard\].*640px/m);
    assert.doesNotMatch(result.stdout, /^ERROR /m);
  });
});

test("complex source syntax is unverified instead of guessed", async () => {
  // Given an artifact whose asset path is produced by dynamic source syntax.
  await withValidatorDirectory(async (directory) => {
    const htmlPath = join(directory, "dynamic.html");
    await writeFile(
      htmlPath,
      documentWith('<main><img src="${assetPath}" alt="Dynamic asset"></main>'),
      "utf8",
    );

    // When the artifact is validated through the public command.
    const result = await runValidator([htmlPath]);
    // Then the unresolved construct is unverified rather than guessed invalid.
    assert.equal(result.code, 0, result.stdout);
    assert.match(
      result.stdout,
      /^UNVERIFIED \[source-syntax\].*complex or ambiguous/m,
    );
    assert.doesNotMatch(
      result.stdout,
      /^ERROR \[(?:missing-asset|asset-reference)\]/m,
    );
  });
});

test("invalid UTF-8 and invalid CLI usage fail before browser claims are emitted", async () => {
  // Given invalid bytes and a command invocation without an input path.
  await withValidatorDirectory(async (directory) => {
    const htmlPath = join(directory, "invalid-utf8.html");
    await writeFile(htmlPath, Uint8Array.from([0xff, 0xfe, 0xfd]));
    // When each case crosses the public command seam.
    const invalidUtf8 = await runValidator([htmlPath]);
    assert.notEqual(invalidUtf8.code, 0);
    assert.match(
      invalidUtf8.stdout,
      /^ERROR \[input-readability\].*not valid UTF-8/m,
    );
    assert.doesNotMatch(invalidUtf8.stdout, /browser-/);

    const usage = await runValidator([]);
    // Then both fail before any browser-only finding can be claimed.
    assert.notEqual(usage.code, 0);
    assert.match(usage.stdout, /^ERROR \[cli-usage\] Usage:/m);
    assert.match(usage.stdout, /^SUMMARY errors=1 warnings=0 unverified=0/m);
  });
});

test("HTML-only validation leaves the Mermaid runtime cache untouched", async () => {
  // Given a valid HTML-only artifact and an absent isolated runtime cache.
  await withValidatorDirectory(async (directory) => {
    const isolatedHome = join(directory, "isolated-home");
    const isolatedCache = join(directory, "absent-cache");
    await mkdir(isolatedHome);

    // When the artifact is validated through the public HTML command.
    const result = await runValidator([validFixture], {
      env: {
        HOME: isolatedHome,
        XDG_CACHE_HOME: isolatedCache,
      },
    });

    // Then validation succeeds without creating or inspecting the Mermaid cache.
    assert.equal(result.code, 0, result.stdout + result.stderr);
    await assert.rejects(lstat(isolatedCache), { code: "ENOENT" });
  });
});
