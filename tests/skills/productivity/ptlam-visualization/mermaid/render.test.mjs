import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createFakeRuntime,
  repositoryRoot,
  validSource,
  writeSource,
} from "./output-fixtures/test-runtime.mjs";

const renderPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/mermaid/render.mjs",
);

function runRender(arguments_, environment) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [renderPath, ...arguments_], {
      cwd: repositoryRoot,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", rejectRun);
    child.once("close", (code) => {
      const result = stdout.trimStart().startsWith("{")
        ? JSON.parse(stdout)
        : undefined;
      resolveRun({ code, stdout, stderr, result });
    });
  });
}

const fixturePath = (name) =>
  join(
    repositoryRoot,
    "tests/skills/productivity/ptlam-visualization/mermaid/fixtures",
    `${name}.mmd`,
  );

test("render --help succeeds with formats, request sets, and Markdown options", async () => {
  const run = await runRender(["--help"], { PATH: process.env.PATH });
  assert.equal(run.code, 0);
  assert.equal(run.stderr, "");
  assert.match(run.stdout, /svg\|png\|pdf\|code\|mmd\|markdown/);
  assert.match(run.stdout, /--request-set/);
  assert.match(run.stdout, /--linked-assets/);
  assert.match(run.stdout, /only explicitly requested outputs/);
  assert.match(run.stdout, /Bounds rendering only/);
});

test("request-set and linked-assets files reject undocumented JSON shapes", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);
    const requestSet = join(fake.directory, "invalid-request-set.json");
    await writeFile(
      requestSet,
      JSON.stringify({
        outputs: [
          {
            format: "svg",
            output: join(fake.directory, "invalid.svg"),
            undocumented: true,
          },
          { format: "code" },
        ],
      }),
    );
    const invalidRequest = await runRender(
      ["--input", sourcePath, "--request-set", requestSet],
      fake.environment,
    );
    assert.equal(invalidRequest.code, 1);
    assert.equal(invalidRequest.result.errors[0].code, "request-set");

    const linkedAssets = join(fake.directory, "invalid-linked-assets.json");
    await writeFile(
      linkedAssets,
      JSON.stringify([
        { format: "svg", output: join(fake.directory, "invalid-asset.svg") },
      ]),
    );
    const invalidAssets = await runRender(
      [
        "--input",
        sourcePath,
        "--format",
        "markdown",
        "--output",
        join(fake.directory, "invalid.md"),
        "--markdown-mode",
        "static",
        "--linked-assets",
        linkedAssets,
      ],
      fake.environment,
    );
    assert.equal(invalidAssets.code, 1);
    assert.equal(invalidAssets.result.errors[0].code, "markdown-assets");
  } finally {
    await fake.cleanup();
  }
});

test("single-output and request-set CLI options cannot be silently mixed", async () => {
  const requestSet = await runRender(
    [
      "--input",
      "source.mmd",
      "--request-set",
      "request-set.json",
      "--delivery-mode",
      "file-only",
    ],
    { PATH: process.env.PATH },
  );
  assert.equal(requestSet.code, 1);
  assert.equal(requestSet.result.errors[0].code, "cli-usage");

  const codeOutput = await runRender(
    ["--input", "source.mmd", "--format", "code", "--output", "ignored.mmd"],
    { PATH: process.env.PATH },
  );
  assert.equal(codeOutput.code, 1);
  assert.equal(codeOutput.result.errors[0].code, "cli-usage");
});

test("SVG, PNG, and PDF render through the verified capsule with typed bounds", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);
    for (const format of ["svg", "png", "pdf"]) {
      const output = join(fake.directory, `diagram.${format}`);
      const run = await runRender(
        ["--input", sourcePath, "--format", format, "--output", output],
        fake.environment,
      );
      assert.equal(run.code, 0, run.stdout + run.stderr);
      assert.equal(run.result.status, "ok");
      assert.equal(run.result.requestedFormat, format);
      assert.equal(run.result.render.status, "passed");
      assert.ok((await readFile(output)).length > 0);
      assert.ok(run.result.unverified.length > 0);
      if (format === "svg") {
        assert.match(
          await readFile(output, "utf8"),
          /aria-labelledby[\s\S]*<title[\s\S]*<desc/,
        );
        assert.equal(
          run.result.render.accessibilityRepair.postprocessed,
          false,
        );
      } else {
        assert.equal(
          run.result.accessibility.textAlternative,
          "Intake moves to completion through validation.",
        );
        if (format === "pdf") {
          assert.equal(run.result.render.pdfFit, "passed-pinned-cli");
        }
      }
    }
  } finally {
    await fake.cleanup();
  }
});

test("adapter comments stay canonical while pinned rendering injects safe SVG semantics", async () => {
  const fake = await createFakeRuntime();
  try {
    const source = await readFile(fixturePath("block"), "utf8");
    const sourcePath = await writeSource(fake.directory, source, "block.mmd");
    const svgOutput = join(fake.directory, "block.svg");
    const svg = await runRender(
      ["--input", sourcePath, "--format", "svg", "--output", svgOutput],
      fake.environment,
    );
    assert.equal(svg.code, 0, svg.stdout + svg.stderr);
    assert.equal(svg.result.diagram.accessibility.mode, "adapter-comments");
    assert.equal(svg.result.render.accessibilityRepair.postprocessed, true);
    assert.equal(
      svg.result.warnings[0].code,
      "adapter-comments-host-accessibility",
    );
    const rendered = await readFile(svgOutput, "utf8");
    assert.match(rendered, /role="img"/);
    assert.match(rendered, /aria-labelledby=/);
    assert.match(rendered, /<title[^>]*>Processing blocks<\/title>/);
    assert.match(
      rendered,
      /<desc[^>]*>Input passes through validation and then storage\.<\/desc>/,
    );

    const code = await runRender(
      ["--input", sourcePath, "--format", "code"],
      fake.environment,
    );
    assert.equal(code.code, 0, code.stdout + code.stderr);
    assert.match(code.result.artifact.content, /%% ptlam-acc-title:/);
    assert.equal(
      code.result.warnings.some(
        (warning) => warning.code === "adapter-comments-host-accessibility",
      ),
      true,
    );

    const pngOutput = join(fake.directory, "block.png");
    const png = await runRender(
      ["--input", sourcePath, "--format", "png", "--output", pngOutput],
      fake.environment,
    );
    assert.equal(png.code, 0, png.stdout + png.stderr);
    assert.equal(
      png.result.accessibility.textAlternative,
      "Input passes through validation and then storage.",
    );
    assert.equal(
      png.result.render.accessibilityRepair.textAlternativeExternal,
      true,
    );
  } finally {
    await fake.cleanup();
  }
});

test("native-postprocess injects semantics only after completely empty upstream SVG", async () => {
  const fake = await createFakeRuntime();
  try {
    const source = `${await readFile(fixturePath("c4"), "utf8")}%% FAKE_NO_SVG_SEMANTICS\n`;
    const sourcePath = await writeSource(fake.directory, source, "c4.mmd");
    const output = join(fake.directory, "c4.svg");
    const run = await runRender(
      ["--input", sourcePath, "--format", "svg", "--output", output],
      fake.environment,
    );
    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.equal(run.result.diagram.accessibility.mode, "native-postprocess");
    assert.equal(run.result.render.accessibilityRepair.postprocessed, true);
    const rendered = await readFile(output, "utf8");
    assert.match(rendered, /role="img"/);
    assert.match(rendered, /aria-labelledby=/);
  } finally {
    await fake.cleanup();
  }
});

test("code, mmd, and native Markdown validate once without companion renders", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);
    const code = await runRender(
      ["--input", sourcePath, "--format", "code"],
      fake.environment,
    );
    assert.equal(code.code, 0);
    assert.match(code.result.artifact.content, /^```mermaid\n/);
    assert.deepEqual(code.result.deliverables, []);

    for (const format of ["mmd", "markdown"]) {
      const output = join(
        fake.directory,
        `delivered.${format === "mmd" ? "mmd" : "md"}`,
      );
      const run = await runRender(
        ["--input", sourcePath, "--format", format, "--output", output],
        fake.environment,
      );
      assert.equal(run.code, 0, run.stdout);
      assert.equal(run.result.deliverables.length, 1);
      assert.equal(
        (await readdir(fake.directory)).some((name) => name.endsWith(".svg")),
        false,
      );
      if (format === "mmd") {
        assert.equal(await readFile(output, "utf8"), validSource);
      } else {
        assert.match(
          await readFile(output, "utf8"),
          /^```mermaid\n[\s\S]*```\n$/,
        );
        assert.equal(run.result.markdown.testedMermaidVersion, "11.16.0");
        assert.equal(run.result.warnings[0].code, "consumer-version-drift");
      }
    }
  } finally {
    await fake.cleanup();
  }
});

test("file-only inaccessible delivery stops before render and creates no sidecar", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ptlam-file-only-"));
  try {
    const sourcePath = await writeSource(directory);
    const output = join(directory, "diagram.png");
    const run = await runRender(
      [
        "--input",
        sourcePath,
        "--format",
        "png",
        "--output",
        output,
        "--delivery-mode",
        "file-only",
        "--alt-channel",
        "none",
      ],
      { PATH: process.env.PATH },
    );
    assert.equal(run.code, 1);
    assert.equal(run.result.status, "decision-needed");
    assert.equal(run.result.errors[0].code, "file-only-accessibility");
    assert.deepEqual(await readdir(directory), ["source.mmd"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("overwrite, renderer failure, and timeout fail closed and clean temporary storage", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);
    const output = join(fake.directory, "existing.svg");
    await writeFile(output, "preserve me");
    const overwrite = await runRender(
      ["--input", sourcePath, "--format", "svg", "--output", output],
      fake.environment,
    );
    assert.equal(overwrite.code, 1);
    assert.equal(overwrite.result.errors[0].code, "output-exists");
    assert.equal(await readFile(output, "utf8"), "preserve me");

    const failureSource = await writeSource(
      fake.directory,
      `${validSource}%% FAIL_RENDER\n`,
      "failure.mmd",
    );
    const failure = await runRender(
      [
        "--input",
        failureSource,
        "--format",
        "svg",
        "--output",
        join(fake.directory, "failure.svg"),
      ],
      fake.environment,
    );
    assert.equal(failure.code, 1);
    assert.equal(failure.result.errors[0].code, "render-failed");

    const privateFailureSource = await writeSource(
      fake.directory,
      `${validSource}%% FAIL_RENDER\n%% LEAK_PRIVATE_PATHS\n`,
      "private-failure.mmd",
    );
    const privateFailure = await runRender(
      [
        "--input",
        privateFailureSource,
        "--format",
        "svg",
        "--output",
        join(fake.directory, "private-failure.svg"),
      ],
      fake.environment,
    );
    const privateEvidence = JSON.stringify(privateFailure.result);
    assert.equal(privateFailure.code, 1);
    assert.doesNotMatch(privateEvidence, /file:\/\//u);
    assert.doesNotMatch(privateEvidence, /\/private|\/Users/u);
    assert.doesNotMatch(privateEvidence, /ptlam-mermaid-render-secret/u);
    assert.doesNotMatch(
      privateEvidence,
      /mermaid-cli-intercept|%2FUsers|Library%2FCaches/iu,
    );
    assert.match(privateEvidence, /Unexpected token on line 9; expected NODE/u);

    const timeoutSource = await writeSource(
      fake.directory,
      `${validSource}%% HANG_RENDER\n`,
      "timeout.mmd",
    );
    const timeout = await runRender(
      [
        "--input",
        timeoutSource,
        "--format",
        "svg",
        "--output",
        join(fake.directory, "timeout.svg"),
        "--timeout-ms",
        "100",
      ],
      fake.environment,
    );
    assert.equal(timeout.code, 1);
    assert.equal(timeout.result.errors[0].code, "render-timeout");
    assert.deepEqual(await readdir(fake.temporaryRoot), []);
  } finally {
    await fake.cleanup();
  }
});

test("co-primary evidence preserves every requested item and reports partial failure", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(
      fake.directory,
      `${validSource}%% FAIL_PDF\n`,
    );
    const requestSet = join(fake.directory, "request-set.json");
    await writeFile(
      requestSet,
      JSON.stringify({
        outputs: [
          { format: "svg", output: join(fake.directory, "set.svg") },
          { format: "pdf", output: join(fake.directory, "set.pdf") },
          { format: "mmd", output: join(fake.directory, "set.mmd") },
        ],
      }),
    );
    const run = await runRender(
      ["--input", sourcePath, "--request-set", requestSet],
      fake.environment,
    );
    assert.equal(run.code, 1);
    assert.equal(run.result.status, "partial");
    assert.equal(run.result.requestedCount, 3);
    assert.equal(run.result.completedCount, 2);
    assert.equal(run.result.items.length, 3);
    assert.equal(run.result.errors[0].code, "co-primary-partial");
  } finally {
    await fake.cleanup();
  }
});

test("co-primary evidence aggregates and deduplicates item-level unverified checks", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);
    const requestSet = join(fake.directory, "unverified-request-set.json");
    await writeFile(
      requestSet,
      JSON.stringify({
        outputs: [
          { format: "svg", output: join(fake.directory, "set.svg") },
          { format: "png", output: join(fake.directory, "set.png") },
          { format: "mmd", output: join(fake.directory, "set.mmd") },
        ],
      }),
    );
    const run = await runRender(
      ["--input", sourcePath, "--request-set", requestSet],
      fake.environment,
    );
    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.equal(run.result.status, "unverified");
    assert.equal(run.result.completedCount, 3);
    assert.equal(run.result.unverified.length, 7);
    assert.equal(
      run.result.unverified.filter(
        (finding) => finding.code === "clipping-overlap",
      ).length,
      1,
    );
    assert.deepEqual(
      run.result.unverified.find(
        (finding) => finding.code === "clipping-overlap",
      ).requestedFormats,
      ["svg", "png"],
    );
  } finally {
    await fake.cleanup();
  }
});

test("static Markdown renders exactly the requested linked asset set and verifies links", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);
    const markdownOutput = join(fake.directory, "docs", "diagram.md");
    const assets = [
      {
        format: "svg",
        output: join(fake.directory, "docs", "assets", "diagram one.svg"),
      },
      {
        format: "png",
        output: join(fake.directory, "docs", "assets", "diagram two.png"),
      },
    ];
    const assetPlan = join(fake.directory, "linked-assets.json");
    await writeFile(assetPlan, JSON.stringify({ assets }));

    const run = await runRender(
      [
        "--input",
        sourcePath,
        "--format",
        "markdown",
        "--output",
        markdownOutput,
        "--markdown-mode",
        "static",
        "--linked-assets",
        assetPlan,
      ],
      fake.environment,
    );

    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.equal(run.result.status, "ok");
    assert.equal(run.result.markdown.mode, "static");
    assert.equal(run.result.markdown.linksVerified, true);
    assert.equal(run.result.markdown.requestedLinkedAssets, 2);
    assert.equal(
      run.result.warnings.some(
        (warning) => warning.code === "consumer-version-drift",
      ),
      false,
    );
    assert.equal(run.result.requestedCount, 3);
    assert.equal(run.result.completedCount, 3);
    assert.equal(run.result.files.length, 3);
    assert.equal(run.result.deliverables.length, 3);
    const markdown = await readFile(markdownOutput, "utf8");
    assert.match(
      markdown,
      /!\[Intake moves to completion through validation\.\]\(assets\/diagram%20one\.svg\)/,
    );
    assert.match(markdown, /assets\/diagram%20two\.png/);
    assert.doesNotMatch(markdown, /```mermaid/);
    assert.equal(
      (await readdir(join(fake.directory, "docs", "assets"))).length,
      2,
    );
    assert.equal(
      (await readdir(join(fake.directory, "docs"))).some((name) =>
        name.endsWith(".mmd"),
      ),
      false,
    );
  } finally {
    await fake.cleanup();
  }
});

test("static Markdown partial asset failure is visible and suppresses the Markdown file", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(
      fake.directory,
      `${validSource}%% FAIL_PNG\n`,
    );
    const markdownOutput = join(fake.directory, "docs", "partial.md");
    const requestSet = join(fake.directory, "static-request.json");
    await writeFile(
      requestSet,
      JSON.stringify({
        outputs: [
          {
            format: "markdown",
            output: markdownOutput,
            markdownMode: "static",
            linkedAssets: [
              {
                format: "svg",
                output: join(fake.directory, "docs", "assets", "partial.svg"),
              },
              {
                format: "png",
                output: join(fake.directory, "docs", "assets", "partial.png"),
              },
            ],
          },
          { format: "code" },
        ],
      }),
    );

    const run = await runRender(
      ["--input", sourcePath, "--request-set", requestSet],
      fake.environment,
    );
    assert.equal(run.code, 1);
    assert.equal(run.result.status, "partial");
    const markdownItem = run.result.items[0];
    assert.equal(markdownItem.status, "partial");
    assert.equal(markdownItem.errors[0].code, "markdown-asset-partial");
    assert.equal(markdownItem.requestedCount, 3);
    assert.equal(markdownItem.completedCount, 1);
    assert.equal(markdownItem.files[0].status, "not-created");
    await assert.rejects(readFile(markdownOutput), { code: "ENOENT" });
    assert.ok(
      await readFile(join(fake.directory, "docs", "assets", "partial.svg")),
    );
    await assert.rejects(
      readFile(join(fake.directory, "docs", "assets", "partial.png")),
      { code: "ENOENT" },
    );
  } finally {
    await fake.cleanup();
  }
});
