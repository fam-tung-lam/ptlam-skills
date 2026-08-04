import assert from "node:assert/strict";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  runNodeCommand,
  withTemporaryDirectory,
} from "../utils/node-command.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../../..");
const scaffoldPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/scaffold.mjs",
);

function runScaffold(arguments_, options = {}) {
  return runNodeCommand(scaffoldPath, arguments_, {
    cwd: options.cwd ?? repositoryRoot,
    env: options.env,
  });
}

const withScaffoldDirectory = (run) =>
  withTemporaryDirectory("ptlam-scaffold-test-", run);

test("the public CLI creates nested output from the repository working directory", async () => {
  // Given a new nested output path under the repository working directory.
  await withScaffoldDirectory(async (directory) => {
    const outputPath = join(directory, "path with spaces", "starter.html");
    // When the public scaffold command creates the starter.
    const result = await runScaffold([
      "--title",
      "Portable starter",
      "--lang",
      "en",
      "--output",
      outputPath,
    ]);

    // Then one complete portable document is written at the requested path.
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
  // Given a non-repository working directory and non-English document text.
  await withScaffoldDirectory(async (directory) => {
    const workingDirectory = join(directory, "другая папка");
    const relativeOutput = join("результат", "проверка.html");
    await mkdir(workingDirectory, { recursive: true });

    const title = "Проверка визуализации — данные & вывод";
    // When the public scaffold command resolves its bundled resources.
    const result = await runScaffold(
      ["--output", relativeOutput, "--lang", "ru", "--title", title],
      { cwd: workingDirectory },
    );

    // Then the artifact preserves its language, text, and required metadata.
    assert.equal(result.code, 0, result.stderr);
    const html = await readFile(join(workingDirectory, relativeOutput), "utf8");
    assert.match(html, /<html lang="ru">/);
    assert.equal(
      (html.match(/Проверка визуализации — данные &amp; вывод/g) ?? []).length,
      2,
    );
    const requiredMetadata = [
      ["generator", "ptlam-visualization"],
      ["ptlam-visualization-version", "1"],
      ["ptlam-visualization-capability", "html"],
      ["ptlam-visualization-design-system-version", "1"],
    ];
    for (const [name, content] of requiredMetadata) {
      assert.equal(
        (
          html.match(new RegExp(`name="${name}" content="${content}"`, "g")) ??
          []
        ).length,
        1,
        `${name} metadata must occur exactly once`,
      );
    }
    assert.doesNotMatch(
      html,
      new RegExp(["ptlam", "visualization", "with", "html"].join("-")),
    );
  });
});

test("title escaping prevents markup injection without changing document text", async () => {
  // Given a title containing markup and template-like text.
  await withScaffoldDirectory(async (directory) => {
    const outputPath = join(directory, "escaped.html");
    const title =
      `<script>alert("unsafe")</script> & 'quoted' ` +
      "{{PTV_LANG}} {{PTV_TITLE}} PTV_SLOT:CONTENT";
    // When the public scaffold command assembles the document.
    const result = await runScaffold([
      "--title",
      title,
      "--lang",
      "en-US",
      "--output",
      outputPath,
    ]);

    // Then markup is escaped while the title text and language remain intact.
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
  // Given a request for the minimal HTML starter.
  await withScaffoldDirectory(async (directory) => {
    const outputPath = join(directory, "standalone.html");
    // When the public scaffold command creates the artifact.
    const result = await runScaffold([
      "--title",
      "Standalone",
      "--lang",
      "en",
      "--output",
      outputPath,
    ]);

    // Then only required local foundations are inlined in stable order.
    assert.equal(result.code, 0, result.stderr);
    const html = await readFile(outputPath, "utf8");
    assert.match(html, /--ptv-color-canvas:/);
    assert.match(html, /Semantic document defaults for ptlam-visualization/);
    assert.match(html, /Responsive layout primitives for ptlam-visualization/);
    assert.match(
      html,
      /Keyboard, high-contrast, and reduced-motion foundations/,
    );
    assert.match(html, /Print preservation rules for ptlam-visualization/);
    const styleMarkers = [
      "ptlam-visualization design tokens, version 1",
      "Semantic document defaults for ptlam-visualization",
      "Responsive layout primitives for ptlam-visualization",
      "Keyboard, high-contrast, and reduced-motion foundations",
      "Print preservation rules for ptlam-visualization",
    ];
    const stylePositions = styleMarkers.map((marker) => html.indexOf(marker));
    assert.ok(stylePositions.every((position) => position >= 0));
    assert.deepEqual(
      stylePositions,
      [...stylePositions].sort((left, right) => left - right),
    );
    assert.doesNotMatch(html, /Composable narrative components/);
    assert.doesNotMatch(html, /Progressive exploration behaviors/);
    assert.doesNotMatch(html, /Original ptlam-visualization icon sprite/);
    assert.doesNotMatch(html, /PTV_SLOT:|\{\{PTV_/);
    assert.doesNotMatch(
      html,
      /<(?:link|script|img|iframe)\b[^>]*(?:href|src)=["'](?:https?:)?\/\//i,
    );
    assert.doesNotMatch(html, /@import\b|url\(\s*["']?(?:https?:)?\/\//i);
  });
});

test("an existing output is refused and preserved byte-for-byte", async () => {
  // Given an output path that already contains unrelated bytes.
  await withScaffoldDirectory(async (directory) => {
    const outputPath = join(directory, "existing.html");
    const original = Buffer.from([0x00, 0xff, 0x41, 0x0a]);
    await writeFile(outputPath, original);

    // When the public scaffold command targets that path.
    const result = await runScaffold([
      "--title",
      "Must not replace",
      "--lang",
      "en",
      "--output",
      outputPath,
    ]);

    // Then it fails closed and preserves the existing file exactly.
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
  // Given incomplete, duplicate, invalid, and unknown command options.
  await withScaffoldDirectory(async (directory) => {
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

    // When each case crosses the public command seam.
    for (const scenario of cases) {
      const result = await runScaffold(scenario.arguments_, { cwd: directory });
      assert.notEqual(result.code, 0, result.stdout);
      assert.match(
        result.stderr,
        new RegExp(`^ERROR \\[${scenario.code}\\]`, "m"),
      );
    }

    // Then every case fails with its domain error and creates no output.
    assert.deepEqual(await readdir(directory), []);
  });
});

test("HTML-only scaffold does not inspect or create a Mermaid runtime cache", async () => {
  // Given an absent isolated Mermaid cache and an HTML-only scaffold request.
  await withScaffoldDirectory(async (directory) => {
    const isolatedHome = join(directory, "isolated-home");
    const isolatedCache = join(directory, "absent-cache");
    const outputPath = join(directory, "html-only.html");
    await mkdir(isolatedHome);

    // When the public scaffold command creates the artifact.
    const result = await runScaffold(
      ["--title", "HTML only", "--lang", "en", "--output", outputPath],
      {
        env: {
          HOME: isolatedHome,
          XDG_CACHE_HOME: isolatedCache,
        },
      },
    );

    // Then the HTML artifact is created without touching Mermaid runtime state.
    assert.equal(result.code, 0, result.stderr);
    assert.match(await readFile(outputPath, "utf8"), /content="html"/);
    await assert.rejects(lstat(isolatedCache), { code: "ENOENT" });
  });
});
