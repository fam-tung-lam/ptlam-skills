import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../..");
const scaffoldPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization-with-html/scripts/scaffold.mjs",
);

function runScaffold(arguments_, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [scaffoldPath, ...arguments_], {
      cwd: options.cwd ?? repositoryRoot,
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
}

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), "ptlam scaffold test "));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("the public CLI creates nested output from the repository working directory", async () => {
  await withTemporaryDirectory(async (directory) => {
    const outputPath = join(directory, "path with spaces", "starter.html");
    const result = await runScaffold([
      "--title",
      "Portable starter",
      "--lang",
      "en",
      "--output",
      outputPath,
    ]);

    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.signal, null);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /^Created portable artifact: /);

    const html = await readFile(outputPath, "utf8");
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /<html lang="en">/);
    assert.equal((html.match(/Portable starter/g) ?? []).length, 2);
    assert.match(html, /<main\b[^>]*id="ptv-main"/);
    assert.match(html, /<h1>Portable starter<\/h1>/);
  });
});

test("resource lookup is independent of cwd and preserves non-English text", async () => {
  await withTemporaryDirectory(async (directory) => {
    const workingDirectory = join(directory, "другая папка");
    const relativeOutput = join("результат", "проверка.html");
    await mkdir(workingDirectory, { recursive: true });

    const title = "Проверка визуализации — данные & вывод";
    const result = await runScaffold(
      ["--output", relativeOutput, "--lang", "ru", "--title", title],
      { cwd: workingDirectory },
    );

    assert.equal(result.code, 0, result.stderr);
    const html = await readFile(join(workingDirectory, relativeOutput), "utf8");
    assert.match(html, /<html lang="ru">/);
    assert.equal(
      (html.match(/Проверка визуализации — данные &amp; вывод/g) ?? []).length,
      2,
    );
    assert.match(html, /name="generator" content="ptlam-visualization-with-html"/);
    assert.match(html, /name="ptlam-visualization-with-html-version" content="1"/);
  });
});

test("title escaping prevents markup injection without changing document text", async () => {
  await withTemporaryDirectory(async (directory) => {
    const outputPath = join(directory, "escaped.html");
    const title =
      `<script>alert("unsafe")</script> & 'quoted' ` +
      "{{PTV_LANG}} {{PTV_TITLE}} PTV_SLOT:CONTENT";
    const result = await runScaffold([
      "--title",
      title,
      "--lang",
      "en-US",
      "--output",
      outputPath,
    ]);

    assert.equal(result.code, 0, result.stderr);
    const html = await readFile(outputPath, "utf8");
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(
      html,
      /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt; &amp; &#39;quoted&#39; \{\{PTV_LANG\}\} \{\{PTV_TITLE\}\} PTV_SLOT:CONTENT/,
    );
    assert.match(html, /<html lang="en-US">/);
  });
});

test("the starter inlines only required local resources", async () => {
  await withTemporaryDirectory(async (directory) => {
    const outputPath = join(directory, "standalone.html");
    const result = await runScaffold([
      "--title",
      "Standalone",
      "--lang",
      "en",
      "--output",
      outputPath,
    ]);

    assert.equal(result.code, 0, result.stderr);
    const html = await readFile(outputPath, "utf8");
    assert.match(html, /--ptv-color-canvas:/);
    assert.match(html, /Semantic document defaults for ptlam-visualization-with-html/);
    assert.match(html, /Responsive layout primitives for ptlam-visualization-with-html/);
    assert.match(
      html,
      /Keyboard, high-contrast, and reduced-motion foundations/,
    );
    assert.match(html, /Print preservation rules for ptlam-visualization-with-html/);
    const styleMarkers = [
      "ptlam-visualization-with-html design tokens, version 1",
      "Semantic document defaults for ptlam-visualization-with-html",
      "Responsive layout primitives for ptlam-visualization-with-html",
      "Keyboard, high-contrast, and reduced-motion foundations",
      "Print preservation rules for ptlam-visualization-with-html",
    ];
    const stylePositions = styleMarkers.map((marker) => html.indexOf(marker));
    assert.ok(stylePositions.every((position) => position >= 0));
    assert.deepEqual(
      stylePositions,
      [...stylePositions].sort((left, right) => left - right),
    );
    assert.doesNotMatch(html, /Composable narrative components/);
    assert.doesNotMatch(html, /Progressive exploration behaviors/);
    assert.doesNotMatch(html, /Original ptlam-visualization-with-html icon sprite/);
    assert.doesNotMatch(html, /PTV_SLOT:|\{\{PTV_/);
    assert.doesNotMatch(
      html,
      /<(?:link|script|img|iframe)\b[^>]*(?:href|src)=["'](?:https?:)?\/\//i,
    );
    assert.doesNotMatch(html, /@import\b|url\(\s*["']?(?:https?:)?\/\//i);
  });
});

test("an existing output is refused and preserved byte-for-byte", async () => {
  await withTemporaryDirectory(async (directory) => {
    const outputPath = join(directory, "existing.html");
    const original = Buffer.from([0x00, 0xff, 0x41, 0x0a]);
    await writeFile(outputPath, original);

    const result = await runScaffold([
      "--title",
      "Must not replace",
      "--lang",
      "en",
      "--output",
      outputPath,
    ]);

    assert.notEqual(result.code, 0);
    assert.match(
      result.stderr,
      /^ERROR \[output-exists\] Refusing to overwrite/m,
    );
    assert.deepEqual(await readFile(outputPath), original);
    assert.deepEqual(await readdir(directory), ["existing.html"]);
  });
});

test("invalid or incomplete CLI input fails without creating output", async () => {
  await withTemporaryDirectory(async (directory) => {
    const cases = [
      {
        arguments_: ["--title", "Missing output", "--lang", "en"],
        code: "cli-usage",
      },
      {
        arguments_: [
          "--title",
          "Duplicate",
          "--title",
          "Again",
          "--lang",
          "en",
          "--output",
          "unused.html",
        ],
        code: "cli-usage",
      },
      {
        arguments_: [
          "--title",
          "Invalid language",
          "--lang",
          'en" onload="unsafe',
          "--output",
          "unused.html",
        ],
        code: "cli-value",
      },
      {
        arguments_: [
          "--title",
          "Unknown option",
          "--lang",
          "en",
          "--output",
          "unused.html",
          "--overwrite",
        ],
        code: "cli-usage",
      },
    ];

    for (const scenario of cases) {
      const result = await runScaffold(scenario.arguments_, { cwd: directory });
      assert.notEqual(result.code, 0, result.stdout);
      assert.match(
        result.stderr,
        new RegExp(`^ERROR \\[${scenario.code}\\]`, "m"),
      );
    }

    assert.deepEqual(await readdir(directory), []);
  });
});

test("the scaffold implementation uses only Node.js standard-library imports", async () => {
  const source = await readFile(scaffoldPath, "utf8");
  const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
    (match) => match[1],
  );

  assert.ok(imports.length > 0);
  assert.ok(imports.every((specifier) => specifier.startsWith("node:")));
  assert.doesNotMatch(source, /https?:\/\/|\bfetch\s*\(|\bimport\s*\(/);
  assert.doesNotMatch(source, /components\/|behaviors\/|icons\//);
  assert.doesNotMatch(source, /writeFile\([^)]*outputPath/);
  assert.doesNotMatch(source, /rename\(/);
  assert.match(source, /await link\(temporaryPath, outputPath\)/);

  assert.equal(relative(repositoryRoot, scaffoldPath).startsWith(".."), false);
});
