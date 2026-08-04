import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  accessibilityCompatibilityWarnings,
  inspectMermaidSource,
  loadActiveManifest,
  normalizeMermaidSource,
  postprocessSvgAccessibility,
  sanitizeDiagnostic,
  sourceSha256,
} from "../../../../../skills/productivity/ptlam-visualization/scripts/mermaid/validate.mjs";
import {
  createFakeRuntime,
  repositoryRoot,
  validSource,
  writeSource,
} from "./output-fixtures/test-runtime.mjs";

const validatePath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/mermaid/validate.mjs",
);

function runValidate(arguments_, environment) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [validatePath, ...arguments_], {
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

test("validate --help succeeds with clean-room usage", async () => {
  const run = await runValidate(["--help"], { PATH: process.env.PATH });
  assert.equal(run.code, 0);
  assert.equal(run.stderr, "");
  assert.match(run.stdout, /Usage:/);
  assert.match(run.stdout, /--timeout-ms/);
  assert.match(run.stdout, /bounds only the render probe/);
  assert.match(run.stdout, /JSON evidence/);
});

test("renderer diagnostics redact local paths while preserving bounded actionable text", () => {
  const diagnostic = sanitizeDiagnostic(
    [
      "Parse error in file:///private/var/folders/account/source.mmd",
      "at /Users/private-account/Library/Caches/ptlam/runtime/cli.mjs",
      String.raw`at C:\Users\private-account\cache\cli.mjs`,
      "at https://mermaid-cli-intercept.invalid/%2FUsers%2Fptlam%2FLibrary%2FCaches%2Fmermaid%2Findex.js",
      "at https://renderer.invalid/Users/ptlam/Library/Caches/mermaid-cli/index.js",
      "at file%3A%2F%2F%2FUsers%2Fptlam%2FLibrary%2FCaches%2Fsource.mmd",
      "at C%3A%5CUsers%5Cptlam%5CAppData%5CLocal%5CCache%5Ccli.mjs",
      "Unexpected token on line 9; expected NODE",
      "x".repeat(5_000),
    ].join("\n"),
  );
  assert.doesNotMatch(diagnostic, /file:\/\//u);
  assert.doesNotMatch(
    diagnostic,
    /\/private|\/Users|C:\\|mermaid-cli-intercept|%2FUsers|file%3A/iu,
  );
  assert.match(diagnostic, /\[local path redacted\]/u);
  assert.match(diagnostic, /Unexpected token on line 9; expected NODE/u);
  assert.ok(diagnostic.length <= 2_000);
});

test("normalization is UTF-8, BOM/line-ending/NFC stable, and hashes exact bytes", () => {
  const bytes = Buffer.from(
    "\uFEFFflowchart LR\r\n  café\u0301\r\n\r\n",
    "utf8",
  );
  const normalized = normalizeMermaidSource(bytes);
  assert.equal(normalized, "flowchart LR\n  café́\n");
  assert.equal(
    sourceSha256(normalized),
    createHash("sha256").update(Buffer.from(normalized)).digest("hex"),
  );
  assert.throws(
    () => normalizeMermaidSource(Buffer.from([0xff, 0xfe])),
    /valid UTF-8/,
  );
});

test("validate CLI verifies exact capsule, parses/renders once, and emits JSON evidence", async () => {
  const fake = await createFakeRuntime();
  try {
    const sourcePath = await writeSource(fake.directory);
    const run = await runValidate([sourcePath], fake.environment);

    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.equal(run.stderr, "");
    assert.equal(run.result.status, "ok");
    assert.equal(run.result.diagram.family, "flowchart");
    assert.equal(run.result.runtime.mermaidVersion, "11.16.0");
    assert.equal(run.result.runtime.cliVersion, "11.16.0");
    assert.match(run.result.runtime.capsuleIdentity, /^[a-f0-9]{64}$/);
    assert.equal(run.result.validation.parseAndRender, "passed");
    assert.deepEqual(
      await readdir(fake.temporaryRoot),
      [],
      "temporary renderer directories must be cleaned",
    );
  } finally {
    await fake.cleanup();
  }
});

test("cold runtime setup can outlive the requested render timeout", async () => {
  const fake = await createFakeRuntime({ setupDelayMs: 250 });
  try {
    const sourcePath = await writeSource(fake.directory);
    const run = await runValidate(
      [sourcePath, "--timeout-ms", "100"],
      fake.environment,
    );

    assert.equal(run.code, 0, run.stdout + run.stderr);
    assert.equal(run.result.status, "ok");
    assert.equal(run.result.validation.parseAndRender, "passed");
  } finally {
    await fake.cleanup();
  }
});

test("static validation rejects unsafe, inaccessible, non-deterministic, and unknown input", async () => {
  const manifest = await loadActiveManifest();
  const cases = [
    [
      "deprecated",
      validSource.replace("flowchart LR", "%%{init: {}}%%\nflowchart LR"),
      "deprecated-directive",
    ],
    [
      "remote",
      validSource.replace("Intake]", "https://example.com]"),
      "remote-resource",
    ],
    [
      "accessibility",
      validSource.replace(/\s+accDescr:.*\n/u, "\n"),
      "accessibility",
    ],
    [
      "determinism",
      validSource.replace(/\s+deterministicIDSeed:.*\n/u, "\n"),
      "determinism",
    ],
    [
      "unknown config",
      validSource.replace(
        "deterministicIds: true",
        "unknownSetting: true\n  deterministicIds: true",
      ),
      "config-key",
    ],
    [
      "secure override",
      validSource.replace(
        "deterministicIds: true",
        "securityLevel: loose\n  deterministicIds: true",
      ),
      "secure-config",
    ],
    [
      "unknown family",
      validSource.replace("flowchart LR", "photograph"),
      "diagram-family",
    ],
  ];

  for (const [name, source, code] of cases) {
    await assert.rejects(
      inspectMermaidSource(source, manifest),
      (error) => error.code === code,
      name,
    );
  }
});

test("catalog accessibility modes accept native directives, exact adapter comments, and native postprocessing metadata", async () => {
  const manifest = await loadActiveManifest();
  const cases = [
    ["flowchart", validSource, "native"],
    ["block", await readFile(fixturePath("block"), "utf8"), "adapter-comments"],
    ["c4", await readFile(fixturePath("c4"), "utf8"), "native-postprocess"],
  ];

  for (const [family, source, mode] of cases) {
    const inspection = await inspectMermaidSource(source, manifest);
    assert.equal(inspection.family, family);
    assert.equal(inspection.accessibility.mode, mode);
    assert.ok(inspection.accessibility.title.length >= 3);
    assert.ok(inspection.accessibility.description.length >= 3);
  }
});

test("adapter-comment metadata is exact, unique, complete, and ignored for family detection", async () => {
  const manifest = await loadActiveManifest();
  const source = await readFile(fixturePath("block"), "utf8");
  const inspection = await inspectMermaidSource(source, manifest);
  assert.equal(inspection.family, "block");

  const cases = [
    [
      `${source}  %% ptlam-acc-title: Duplicate title\n`,
      "accessibility-duplicate",
    ],
    [
      source.replace(/^\s*%% ptlam-acc-description:.*\n/mu, ""),
      "accessibility",
    ],
    [
      source.replace("%% ptlam-acc-title:", "%% ptlam-acc-title :"),
      "accessibility",
    ],
    [
      source.replace(
        /^\s*%% ptlam-acc-title:.*\n\s*%% ptlam-acc-description:.*\n/mu,
        "  accTitle: Wrong mode title\n  accDescr: Wrong mode description\n",
      ),
      "accessibility-mode",
    ],
  ];
  for (const [candidate, code] of cases) {
    await assert.rejects(
      inspectMermaidSource(candidate, manifest),
      (error) => error.code === code,
    );
  }

  await assert.rejects(
    inspectMermaidSource(
      `${validSource}  %% ptlam-acc-title: Wrong mode title\n  %% ptlam-acc-description: Wrong mode description\n`,
      manifest,
    ),
    (error) => error.code === "accessibility-mode",
  );
});

test("SVG accessibility postprocessing is deterministic, injection-safe, and idempotent", () => {
  const sourceHash = "a".repeat(64);
  const unsafe = {
    mode: "adapter-comments",
    title: '<script>alert("title")</script> & title',
    description: "</desc><script>alert('description')</script>",
  };
  const input = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g id="ptlam-mermaid-aaaaaaaaaaaa-title"/></svg>`,
  );
  const repaired = postprocessSvgAccessibility(input, unsafe, sourceHash);
  const svg = repaired.bytes.toString("utf8");

  assert.equal(repaired.accessibilityRepair.postprocessed, true);
  assert.equal(repaired.accessibilityRepair.titleId.endsWith("-1-title"), true);
  assert.match(svg, /role="img"/);
  assert.match(
    svg,
    /aria-labelledby="ptlam-mermaid-[^"]+-title ptlam-mermaid-[^"]+-description"/,
  );
  assert.match(
    svg,
    /&lt;script&gt;alert\(&quot;title&quot;\)&lt;\/script&gt; &amp; title/,
  );
  assert.match(
    svg,
    /&lt;\/desc&gt;&lt;script&gt;alert\(&apos;description&apos;\)&lt;\/script&gt;/,
  );
  assert.doesNotMatch(svg, /<script>/);

  const second = postprocessSvgAccessibility(
    repaired.bytes,
    unsafe,
    sourceHash,
  );
  assert.equal(second.accessibilityRepair.postprocessed, false);
  assert.equal(second.bytes.toString("utf8"), svg);
  assert.equal((svg.match(/<title /gu) ?? []).length, 1);
  assert.equal((svg.match(/<desc /gu) ?? []).length, 1);

  assert.throws(
    () =>
      postprocessSvgAccessibility(
        Buffer.from('<svg viewBox="0 0 1 1"></svg>'),
        { ...unsafe, mode: "native" },
        sourceHash,
      ),
    (error) => error.code === "svg-accessibility",
  );
  assert.throws(
    () =>
      postprocessSvgAccessibility(
        Buffer.from('<svg viewBox="0 0 1 1"><title>Only</title></svg>'),
        { ...unsafe, mode: "native-postprocess" },
        sourceHash,
      ),
    (error) => error.code === "svg-accessibility-partial",
  );
  assert.throws(
    () =>
      postprocessSvgAccessibility(
        Buffer.from('<svg aria-label="Conflicting label"></svg>'),
        { ...unsafe, mode: "native-postprocess" },
        sourceHash,
      ),
    (error) => error.code === "svg-accessibility-partial",
  );

  const upstreamRole = postprocessSvgAccessibility(
    Buffer.from(
      '<svg role="graphics-document document" aria-roledescription="flowchart-v2" viewBox="0 0 1 1"></svg>',
    ),
    { ...unsafe, mode: "native-postprocess" },
    sourceHash,
  );
  const normalized = upstreamRole.bytes.toString("utf8");
  assert.match(normalized, /role="img"/);
  assert.doesNotMatch(normalized, /role="graphics-document document"/);
  assert.match(normalized, /aria-roledescription="flowchart-v2"/);
  assert.equal(
    postprocessSvgAccessibility(
      upstreamRole.bytes,
      { ...unsafe, mode: "native-postprocess" },
      sourceHash,
    ).accessibilityRepair.postprocessed,
    false,
  );

  const c4Accessibility = {
    mode: "native-postprocess",
    family: "c4",
    title: "Service context",
    description: "Portal & identity describe the service.",
  };
  const c4Partial = Buffer.from(
    '<svg role="graphics-document document" aria-roledescription="c4" aria-describedby="chart-desc"><desc id="chart-desc">Portal &amp; identity describe the service.</desc></svg>',
  );
  const c4Repaired = postprocessSvgAccessibility(
    c4Partial,
    c4Accessibility,
    sourceHash,
  );
  const c4Svg = c4Repaired.bytes.toString("utf8");
  assert.equal(c4Repaired.accessibilityRepair.postprocessed, true);
  assert.equal(
    c4Repaired.accessibilityRepair.upstreamSemantics,
    "verified-description",
  );
  assert.match(c4Svg, /role="img"/);
  assert.match(c4Svg, /aria-roledescription="c4"/);
  assert.match(c4Svg, /aria-describedby="chart-desc"/);
  assert.match(c4Svg, /aria-labelledby="ptlam-mermaid-[^"]+-title"/);
  assert.equal((c4Svg.match(/<desc /gu) ?? []).length, 1);
  assert.equal((c4Svg.match(/<title /gu) ?? []).length, 1);
  assert.equal(
    postprocessSvgAccessibility(c4Repaired.bytes, c4Accessibility, sourceHash)
      .accessibilityRepair.postprocessed,
    false,
  );
  for (const mismatch of [
    c4Partial.toString("utf8").replace('chart-desc"', 'other"'),
    c4Partial.toString("utf8").replace("Portal &amp;", "Wrong &amp;"),
    c4Partial.toString("utf8").replace("<svg ", '<svg aria-label="extra" '),
  ]) {
    assert.throws(
      () =>
        postprocessSvgAccessibility(
          Buffer.from(mismatch),
          c4Accessibility,
          sourceHash,
        ),
      (error) => error.code === "svg-accessibility-partial",
    );
  }

  const errorRoleDescription = postprocessSvgAccessibility(
    Buffer.from(
      '<svg role="graphics-document document" aria-roledescription="error"></svg>',
    ),
    {
      mode: "native-postprocess",
      family: "event-modeling",
      title: "Event model",
      description: "A command produces an event.",
    },
    sourceHash,
  );
  assert.doesNotMatch(
    errorRoleDescription.bytes.toString("utf8"),
    /aria-roledescription=/,
  );
  assert.equal(
    errorRoleDescription.accessibilityRepair.droppedUnsafeRoleDescription,
    true,
  );
});

test("adapter source compatibility warning recommends the pinned static renderer", () => {
  const warnings = accessibilityCompatibilityWarnings({
    mode: "adapter-comments",
  });
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].code, "adapter-comments-host-accessibility");
  assert.match(warnings[0].message, /prefer pinned static SVG/);
  assert.deepEqual(accessibilityCompatibilityWarnings({ mode: "native" }), []);
});

test("runtime core, CLI, capsule, and browser mismatches fail closed", async () => {
  const cases = [
    { actualCoreVersion: "11.15.0", code: "runtime-mismatch" },
    { result: { capsuleIdentity: "0".repeat(64) }, code: "runtime-mismatch" },
    { result: { cliVersion: "11.15.0" }, code: "runtime-mismatch" },
    { result: { browserVersion: "wrong" }, code: "runtime-mismatch" },
  ];
  for (const specification of cases) {
    const fake = await createFakeRuntime(specification);
    try {
      const sourcePath = await writeSource(fake.directory);
      const run = await runValidate([sourcePath], fake.environment);
      assert.equal(run.code, 1);
      assert.equal(run.result.status, "error");
      assert.equal(run.result.errors[0].code, specification.code);
    } finally {
      await fake.cleanup();
    }
  }
});
