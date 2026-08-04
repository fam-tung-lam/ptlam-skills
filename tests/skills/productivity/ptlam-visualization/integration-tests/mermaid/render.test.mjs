import assert from "node:assert/strict";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  createFakeRuntime,
  repositoryRoot,
  validSource,
  writeSource,
} from "../test_doubles/fake-mermaid-runtime.mjs";
import {
  runNodeCommand,
  withTemporaryDirectory,
} from "../utils/node-command.mjs";

const renderPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/mermaid/render.mjs",
);

async function runRender(arguments_, environment) {
  const run = await runNodeCommand(renderPath, arguments_, {
    cwd: repositoryRoot,
    env: environment,
  });
  const result = run.stdout.trimStart().startsWith("{")
    ? JSON.parse(run.stdout)
    : undefined;
  return { ...run, result };
}

const fixturePath = (name) =>
  join(
    repositoryRoot,
    "tests/skills/productivity/ptlam-visualization/integration-tests/mermaid/fixtures",
    `${name}.mmd`,
  );

test("render --help succeeds with formats, request sets, and Markdown options", async () => {
  // Given a clean-room render invocation.
  const environment = { PATH: process.env.PATH };

  // When --help is requested.
  const run = await runRender(["--help"], environment);

  // Then the public command describes every format and request mode.
  assert.equal(run.code, 0);
  assert.equal(run.stderr, "");
  assert.match(run.stdout, /svg\|png\|pdf\|code\|mmd\|markdown/);
  assert.match(run.stdout, /--request-set/);
  assert.match(run.stdout, /--linked-assets/);
  assert.match(run.stdout, /only explicitly requested outputs/);
  assert.match(run.stdout, /Bounds rendering only/);
});

test("request-set and linked-assets files reject undocumented JSON shapes", async () => {
  // Given request plans with undocumented JSON shapes.
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
    const linkedAssets = join(fake.directory, "invalid-linked-assets.json");
    await writeFile(
      linkedAssets,
      JSON.stringify([
        { format: "svg", output: join(fake.directory, "invalid-asset.svg") },
      ]),
    );

    // When they cross the public render command seam.
    const invalidRequest = await runRender(
      ["--input", sourcePath, "--request-set", requestSet],
      fake.environment,
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

    // Then each plan fails closed with its own schema error.
    assert.equal(invalidRequest.code, 1);
    assert.equal(invalidRequest.result.errors[0].code, "request-set");
    assert.equal(invalidAssets.code, 1);
    assert.equal(invalidAssets.result.errors[0].code, "markdown-assets");
  } finally {
    await fake.cleanup();
  }
});

test("single-output and request-set CLI options cannot be silently mixed", async () => {
  // Given mutually exclusive single-output and request-set options.
  const invocations = [
    [
      "--input",
      "source.mmd",
      "--request-set",
      "request-set.json",
      "--delivery-mode",
      "file-only",
    ],
    ["--input", "source.mmd", "--format", "code", "--output", "ignored.mmd"],
  ];

  // When the public command parses the invocation.
  const runs = await Promise.all(
    invocations.map((arguments_) =>
      runRender(arguments_, { PATH: process.env.PATH }),
    ),
  );

  // Then it rejects the ambiguous request without rendering.
  for (const run of runs) {
    assert.equal(run.code, 1);
    assert.equal(run.result.errors[0].code, "cli-usage");
  }
});

test("SVG, PNG, and PDF render through the verified capsule with typed bounds", async () => {
  // Given canonical source and a fake at the external Mermaid CLI seam.
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);

    // When every rendered format is requested through the public command.
    for (const format of ["svg", "png", "pdf"]) {
      const output = join(fake.directory, `diagram.${format}`);
      const run = await runRender(
        ["--input", sourcePath, "--format", format, "--output", output],
        fake.environment,
      );

      // Then exact runtime evidence and format-specific bounds are returned.
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
  // Given canonical adapter-comment source with unsafe-looking text.
  const fake = await createFakeRuntime();
  try {
    const source = await readFile(fixturePath("block"), "utf8");
    const sourcePath = await writeSource(fake.directory, source, "block.mmd");
    const svgOutput = join(fake.directory, "block.svg");
    const pngOutput = join(fake.directory, "block.png");

    // When the pinned render paths process SVG, code, and PNG delivery.
    const svg = await runRender(
      ["--input", sourcePath, "--format", "svg", "--output", svgOutput],
      fake.environment,
    );
    const rendered = await readFile(svgOutput, "utf8");
    const code = await runRender(
      ["--input", sourcePath, "--format", "code"],
      fake.environment,
    );
    const png = await runRender(
      ["--input", sourcePath, "--format", "png", "--output", pngOutput],
      fake.environment,
    );

    // Then source stays canonical and rendered semantics are safe and complete.
    assert.equal(svg.code, 0, svg.stdout + svg.stderr);
    assert.equal(svg.result.diagram.accessibility.mode, "adapter-comments");
    assert.equal(svg.result.render.accessibilityRepair.postprocessed, true);
    assert.equal(
      svg.result.warnings[0].code,
      "adapter-comments-host-accessibility",
    );
    assert.match(rendered, /role="img"/);
    assert.match(rendered, /aria-labelledby=/);
    assert.match(rendered, /<title[^>]*>Processing blocks<\/title>/);
    assert.match(
      rendered,
      /<desc[^>]*>Input passes through validation and then storage\.<\/desc>/,
    );
    assert.equal(code.code, 0, code.stdout + code.stderr);
    assert.match(code.result.artifact.content, /%% ptlam-acc-title:/);
    assert.equal(
      code.result.warnings.some(
        (warning) => warning.code === "adapter-comments-host-accessibility",
      ),
      true,
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
  // Given native-postprocess source and empty versus partial upstream SVG.
  const fake = await createFakeRuntime();
  try {
    const source = `${await readFile(fixturePath("c4"), "utf8")}%% FAKE_NO_SVG_SEMANTICS\n`;
    const sourcePath = await writeSource(fake.directory, source, "c4.mmd");
    const output = join(fake.directory, "c4.svg");

    // When the source crosses the public renderer.
    const run = await runRender(
      ["--input", sourcePath, "--format", "svg", "--output", output],
      fake.environment,
    );
    const rendered = await readFile(output, "utf8");

    // Then the empty upstream state is repaired with complete semantics.
    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.equal(run.result.diagram.accessibility.mode, "native-postprocess");
    assert.equal(run.result.render.accessibilityRepair.postprocessed, true);
    assert.match(rendered, /role="img"/);
    assert.match(rendered, /aria-labelledby=/);
  } finally {
    await fake.cleanup();
  }
});

test("code, mmd, and native Markdown validate once without companion renders", async () => {
  // Given canonical source and each source-delivery format.
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);

    // When code output is requested through the public render command.
    const code = await runRender(
      ["--input", sourcePath, "--format", "code"],
      fake.environment,
    );

    // Then source is validated without creating an unrequested render.
    assert.equal(code.code, 0);
    assert.match(code.result.artifact.content, /^```mermaid\n/);
    assert.deepEqual(code.result.deliverables, []);

    for (const format of ["mmd", "markdown"]) {
      const output = join(
        fake.directory,
        `delivered.${format === "mmd" ? "mmd" : "md"}`,
      );

      // When a file-based source format is requested.
      const run = await runRender(
        ["--input", sourcePath, "--format", format, "--output", output],
        fake.environment,
      );

      // Then only the requested source deliverable is created.
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
  // Given file-only PNG delivery with no accessible attachment or metadata channel.
  await withTemporaryDirectory("ptlam-file-only-", async (directory) => {
    const sourcePath = await writeSource(directory);
    const output = join(directory, "diagram.png");

    // When it crosses the public output policy.
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

    // Then rendering stops with a decision and no companion file appears.
    assert.equal(run.code, 1);
    assert.equal(run.result.status, "decision-needed");
    assert.equal(run.result.errors[0].code, "file-only-accessibility");
    assert.deepEqual(await readdir(directory), ["source.mmd"]);
  });
});

test("overwrite, renderer failure, and timeout fail closed and clean temporary storage", async () => {
  // Given existing output, renderer-failure, path-leak, and timeout scenarios.
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);
    const output = join(fake.directory, "existing.svg");
    await writeFile(output, "preserve me");

    // When an existing output crosses the public render command seam.
    const overwrite = await runRender(
      ["--input", sourcePath, "--format", "svg", "--output", output],
      fake.environment,
    );

    // Then rendering fails closed and preserves the existing file.
    assert.equal(overwrite.code, 1);
    assert.equal(overwrite.result.errors[0].code, "output-exists");
    assert.equal(await readFile(output, "utf8"), "preserve me");

    const failureSource = await writeSource(
      fake.directory,
      `${validSource}%% FAIL_RENDER\n`,
      "failure.mmd",
    );

    // When the renderer reports a failure.
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

    // Then the failure is returned as typed evidence.
    assert.equal(failure.code, 1);
    assert.equal(failure.result.errors[0].code, "render-failed");

    const privateFailureSource = await writeSource(
      fake.directory,
      `${validSource}%% FAIL_RENDER\n%% LEAK_PRIVATE_PATHS\n`,
      "private-failure.mmd",
    );

    // When renderer failure output contains private paths.
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

    // Then the returned evidence is sanitized.
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

    // When the renderer exceeds its timeout.
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

    // Then it fails closed and cleans all temporary state.
    assert.equal(timeout.code, 1);
    assert.equal(timeout.result.errors[0].code, "render-timeout");
    assert.deepEqual(await readdir(fake.temporaryRoot), []);
  } finally {
    await fake.cleanup();
  }
});

test("co-primary evidence preserves every requested item and reports partial failure", async () => {
  // Given a co-primary set with successful and failing outputs.
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

    // When the set crosses the public render command seam.
    const run = await runRender(
      ["--input", sourcePath, "--request-set", requestSet],
      fake.environment,
    );

    // Then every item is preserved and set-level partial failure is explicit.
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
  // Given a successful co-primary set with repeated visual QA findings.
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

    // When set-level evidence is assembled.
    const run = await runRender(
      ["--input", sourcePath, "--request-set", requestSet],
      fake.environment,
    );

    // Then findings are deduplicated while retaining every affected format.
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
  // Given static Markdown with an explicit linked-asset plan.
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

    // When the public renderer creates the requested set.
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
    const markdown = await readFile(markdownOutput, "utf8");

    // Then only requested assets and verified relative links are delivered.
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
  // Given static Markdown whose linked-asset set contains one failing render.
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

    // When the public renderer processes the set.
    const run = await runRender(
      ["--input", sourcePath, "--request-set", requestSet],
      fake.environment,
    );

    // Then partial failure is visible and no broken Markdown deliverable appears.
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
