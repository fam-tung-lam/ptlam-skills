import assert from "node:assert/strict";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  truncate,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../..");
const validatorPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/validate.mjs",
);
const validFixture = join(testDirectory, "validator-fixtures/valid.html");
const MB = 1024 * 1024;

function runValidator(arguments_, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [validatorPath, ...arguments_], {
      cwd: options.cwd ?? repositoryRoot,
      env: {
        PATH: process.env.PATH,
        ...options.env,
      },
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

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(
    join(tmpdir(), "ptlam-visualization-validator-"),
  );
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("valid fixture exits zero and never claims browser-only checks passed", async () => {
  const result = await runValidator([validFixture]);

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
  await withTemporaryDirectory(async (directory) => {
    const missing = await runValidator([join(directory, "missing.html")]);
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
  await withTemporaryDirectory(async (directory) => {
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

    const result = await runValidator([htmlPath]);
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
  await withTemporaryDirectory(async (directory) => {
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

    const result = await runValidator([htmlPath]);
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
  await withTemporaryDirectory(async (directory) => {
    const artifactDirectory = join(directory, "artifact");
    const htmlPath = join(artifactDirectory, "outside.html");
    await writeFile(join(directory, "private.txt"), "must not be read", "utf8");
    await mkdir(artifactDirectory);
    await writeFile(
      htmlPath,
      documentWith('<main><img src="../private.txt" alt="Outside"></main>'),
      "utf8",
    );

    const result = await runValidator([htmlPath]);
    assert.notEqual(result.code, 0);
    assert.match(
      result.stdout,
      /^ERROR \[asset-outside-context\].*was not followed/m,
    );
    assert.doesNotMatch(result.stdout, /must not be read/);
  });
});

test("remote dependencies and size thresholds are warnings and preserve a zero exit", async () => {
  await withTemporaryDirectory(async (directory) => {
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

    const result = await runValidator([htmlPath]);
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
  await withTemporaryDirectory(async (directory) => {
    const htmlPath = join(directory, "overflow.html");
    await writeFile(
      htmlPath,
      documentWith(
        '<main class="ptv-wide">Wide content remains readable in source.</main>',
        "<style>.ptv-wide { min-width: 640px; }</style>",
      ),
      "utf8",
    );

    const result = await runValidator([htmlPath]);
    assert.equal(result.code, 0, result.stdout);
    assert.match(result.stdout, /^WARNING \[overflow-hazard\].*640px/m);
    assert.doesNotMatch(result.stdout, /^ERROR /m);
  });
});

test("complex source syntax is unverified instead of guessed", async () => {
  await withTemporaryDirectory(async (directory) => {
    const htmlPath = join(directory, "dynamic.html");
    await writeFile(
      htmlPath,
      documentWith('<main><img src="${assetPath}" alt="Dynamic asset"></main>'),
      "utf8",
    );

    const result = await runValidator([htmlPath]);
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
  await withTemporaryDirectory(async (directory) => {
    const htmlPath = join(directory, "invalid-utf8.html");
    await writeFile(htmlPath, Uint8Array.from([0xff, 0xfe, 0xfd]));
    const invalidUtf8 = await runValidator([htmlPath]);
    assert.notEqual(invalidUtf8.code, 0);
    assert.match(
      invalidUtf8.stdout,
      /^ERROR \[input-readability\].*not valid UTF-8/m,
    );
    assert.doesNotMatch(invalidUtf8.stdout, /browser-/);

    const usage = await runValidator([]);
    assert.notEqual(usage.code, 0);
    assert.match(usage.stdout, /^ERROR \[cli-usage\] Usage:/m);
    assert.match(usage.stdout, /^SUMMARY errors=1 warnings=0 unverified=0/m);
  });
});

test("HTML-only validation does not inspect or create a Mermaid runtime cache", async () => {
  await withTemporaryDirectory(async (directory) => {
    const isolatedHome = join(directory, "isolated-home");
    const isolatedCache = join(directory, "absent-cache");
    await mkdir(isolatedHome);

    const result = await runValidator([validFixture], {
      env: {
        HOME: isolatedHome,
        XDG_CACHE_HOME: isolatedCache,
      },
    });

    assert.equal(result.code, 0, result.stdout + result.stderr);
    await assert.rejects(lstat(isolatedCache), { code: "ENOENT" });

    const source = await readFile(validatorPath, "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    assert.ok(imports.length > 0);
    assert.ok(imports.every((specifier) => specifier.startsWith("node:")));
    assert.doesNotMatch(
      source,
      /(?:scripts|runtime)[/\\]mermaid|setup\.mjs|@mermaid|mermaid-cli/i,
    );
  });
});
