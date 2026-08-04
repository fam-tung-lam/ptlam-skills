import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ScaffoldError,
  assembleDocument,
} from "../../../../../skills/productivity/ptlam-visualization/scripts/html/scaffold.mjs";
import {
  ACTIVE_MERMAID_VERSION,
  EMBEDDED_MERMAID_MIME,
  activeMermaidCapsule,
  canonicalRecordJson,
  createEmbeddedMermaidRecord,
  embeddedMermaidRecordElement,
  markRenderedMermaidSvg,
  normalizeMermaidSource,
  parseEmbeddedMermaidRecords,
  sourceSha256,
} from "../../../../../skills/productivity/ptlam-visualization/scripts/html/lib/embedded-mermaid-record.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../..");
const extractorPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/extract-mermaid.mjs",
);
const validatorPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/validate.mjs",
);
const combinedModulePath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/lib/embedded-mermaid-record.mjs",
);
const active = await activeMermaidCapsule();
const capsuleId = active.capsuleId;

function accessibleSvg(diagramId, overrides = {}) {
  const titleId = `${diagramId}-title`;
  const descriptionId = `${diagramId}-description`;
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${titleId}" aria-describedby="${descriptionId}" viewBox="0 0 100 40"${overrides.rootAttributes ?? ""}>
  <title id="${titleId}">${overrides.title ?? "Flow"}</title>
  <desc id="${descriptionId}">${overrides.description ?? "Start to end"}</desc>
  ${overrides.body ?? '<path d="M0 20h100" />'}
</svg>`;
}

function combinedFragment(record, overrides = {}) {
  const rendered =
    overrides.rendered ??
    markRenderedMermaidSvg(accessibleSvg(record.diagramId), record.diagramId);
  const element = overrides.element ?? embeddedMermaidRecordElement(record);
  return `${rendered}\n${element}`;
}

function minimalDocument(fragment, capability = "combined") {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="ptlam-visualization" />
    <meta name="ptlam-visualization-version" content="1" />
    <meta name="ptlam-visualization-capability" content="${capability}" />
    <meta name="ptlam-visualization-design-system-version" content="1" />
    <title>Combined fixture</title>
  </head>
  <body><main>${fragment}</main></body>
</html>`;
}

function recordElementFromJson(json, diagramId = "flow") {
  const encoded = Buffer.from(json, "utf8").toString("base64");
  return `<script type="${EMBEDDED_MERMAID_MIME}" data-ptv-diagram-source data-ptv-diagram-id="${diagramId}">${encoded}</script>`;
}

function recordElementFromBytes(bytes, diagramId = "flow") {
  return `<script type="${EMBEDDED_MERMAID_MIME}" data-ptv-diagram-source data-ptv-diagram-id="${diagramId}">${Buffer.from(bytes).toString("base64")}</script>`;
}

function runCommand(commandPath, arguments_, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [commandPath, ...arguments_], {
      cwd: repositoryRoot,
      env: { PATH: process.env.PATH, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", rejectRun);
    child.once("close", (code, signal) =>
      resolveRun({ code, signal, stdout, stderr }),
    );
  });
}

const runExtractor = (arguments_, options) =>
  runCommand(extractorPath, arguments_, options);
const runValidator = (arguments_, options) =>
  runCommand(validatorPath, arguments_, options);

async function withTemporaryDirectory(run) {
  const directory = await mkdtemp(join(tmpdir(), "ptv-combined-"));
  try {
    return await run(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("active capsule comes from the exact manifest identity", async () => {
  const manifest = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "skills/productivity/ptlam-visualization/references/mermaid/11.16.0/MANIFEST.json",
      ),
      "utf8",
    ),
  );
  assert.equal(active.mermaidVersion, ACTIVE_MERMAID_VERSION);
  assert.equal(active.capsuleId, manifest.capsuleIdentity.value);
  assert.equal(manifest.capsuleIdentity.algorithm, "sha256-canonical-json-v1");
});

test("normalization removes one BOM, canonicalizes lines and NFC, and keeps one LF", () => {
  const source = "\uFEFFflowchart LR\r\n  A[cafe\u0301] --> B\r\n\r\n";
  const normalized = normalizeMermaidSource(source);
  assert.equal(normalized, "flowchart LR\n  A[café] --> B\n");
  assert.equal(sourceSha256(normalized).length, 64);
  assert.equal(
    normalizeMermaidSource("\uFEFF\uFEFFflowchart LR"),
    "\uFEFFflowchart LR\n",
  );
  assert.equal(
    normalizeMermaidSource("flowchart LR\n  "),
    "flowchart LR\n  \n",
  );
  assert.throws(
    () => normalizeMermaidSource("\ud800"),
    /invalid Unicode scalar/,
  );
});

test("record creation is exact and requires active version and capsule evidence", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "main-flow",
    source: "flowchart LR\n  A --> B",
    capsuleId,
  });
  assert.deepEqual(Object.keys(record), [
    "schemaVersion",
    "diagramId",
    "sourceEncoding",
    "source",
    "sourceSha256",
    "mermaidVersion",
    "capsuleId",
  ]);
  assert.equal(canonicalRecordJson(record), JSON.stringify(record));
  await assert.rejects(
    createEmbeddedMermaidRecord({
      diagramId: "main-flow",
      source: "flowchart LR",
      capsuleId: "a".repeat(64),
    }),
    /does not match the active Mermaid manifest/,
  );
  await assert.rejects(
    createEmbeddedMermaidRecord({
      diagramId: "main-flow",
      source: "flowchart LR",
      capsuleId,
      mermaidVersion: "11.15.0",
    }),
    /Expected Mermaid 11\.16\.0/,
  );
  await assert.rejects(
    createEmbeddedMermaidRecord({
      diagramId: "bad id",
      source: "flowchart LR",
      capsuleId,
    }),
    /diagramId/,
  );
});

test("accessible rendered SVG and inert source record round-trip together", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "main-flow",
    source: "flowchart LR\n  A --> B",
    capsuleId,
  });
  const fragment = combinedFragment(record);
  assert.match(fragment, /<svg\b[^>]*data-ptv-diagram-rendered/);
  assert.ok(fragment.includes(EMBEDDED_MERMAID_MIME));
  assert.deepEqual(await parseEmbeddedMermaidRecords(fragment), [record]);
});

test("record element rejects malformed base64, UTF-8, JSON, and noncanonical JSON", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const rendered = markRenderedMermaidSvg(accessibleSvg("flow"), "flow");
  const cases = [
    {
      element: `<script type="${EMBEDDED_MERMAID_MIME}" data-ptv-diagram-source data-ptv-diagram-id="flow">***</script>`,
      message: /standard base64/,
    },
    {
      element: recordElementFromBytes([0xff]),
      message: /not valid UTF-8/,
    },
    {
      element: recordElementFromJson("{"),
      message: /not valid JSON/,
    },
    {
      element: recordElementFromJson(` ${JSON.stringify(record)}`),
      message: /canonical JSON/,
    },
  ];
  for (const scenario of cases) {
    await assert.rejects(
      parseEmbeddedMermaidRecords(`${rendered}${scenario.element}`),
      scenario.message,
    );
  }
});

test("record schema rejects extra, missing, wrong, mismatched, and noncanonical fields", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const rendered = markRenderedMermaidSvg(accessibleSvg("flow"), "flow");
  const withoutCapsule = { ...record };
  delete withoutCapsule.capsuleId;
  const cases = [
    [{ ...record, extra: true }, /Record keys must be exactly/],
    [withoutCapsule, /Record keys must be exactly/],
    [{ ...record, schemaVersion: 2 }, /schemaVersion must be 1/],
    [{ ...record, sourceEncoding: "utf8" }, /sourceEncoding/],
    [{ ...record, source: `${record.source}\n` }, /not canonical/],
    [{ ...record, sourceSha256: "0".repeat(64) }, /does not match/],
    [{ ...record, mermaidVersion: "11.15.0" }, /Mermaid 11\.16\.0/],
    [{ ...record, capsuleId: "a".repeat(64) }, /active Mermaid manifest/],
  ];
  for (const [candidate, message] of cases) {
    await assert.rejects(
      parseEmbeddedMermaidRecords(
        `${rendered}${recordElementFromJson(JSON.stringify(candidate))}`,
      ),
      message,
    );
  }

  const mismatched = embeddedMermaidRecordElement(record).replace(
    'data-ptv-diagram-id="flow"',
    'data-ptv-diagram-id="other"',
  );
  await assert.rejects(
    parseEmbeddedMermaidRecords(`${rendered}${mismatched}`),
    /does not match its HTML attribute/,
  );
});

test("source element requires exact MIME, boolean marker, unique attributes, and no src", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const rendered = markRenderedMermaidSvg(accessibleSvg("flow"), "flow");
  const encoded = Buffer.from(JSON.stringify(record), "utf8").toString(
    "base64",
  );
  const cases = [
    `<script type="text/plain" data-ptv-diagram-source data-ptv-diagram-id="flow">${encoded}</script>`,
    `<script type="${EMBEDDED_MERMAID_MIME}" data-ptv-diagram-id="flow">${encoded}</script>`,
    `<script type="${EMBEDDED_MERMAID_MIME}" data-ptv-diagram-source="true" data-ptv-diagram-id="flow">${encoded}</script>`,
    `<script type="${EMBEDDED_MERMAID_MIME}" data-ptv-diagram-source src="record.json" data-ptv-diagram-id="flow">${encoded}</script>`,
    `<script type="${EMBEDDED_MERMAID_MIME}" data-ptv-diagram-source data-ptv-diagram-id="flow" data-ptv-diagram-id="flow">${encoded}</script>`,
  ];
  for (const element of cases) {
    await assert.rejects(
      parseEmbeddedMermaidRecords(`${rendered}${element}`),
      /marker and MIME|boolean marker|repeats data-ptv-diagram-id/,
    );
  }
});

test("association rejects missing, duplicate, orphan, or non-SVG rendered markers", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const element = embeddedMermaidRecordElement(record);
  const rendered = markRenderedMermaidSvg(accessibleSvg("flow"), "flow");
  const orphan = markRenderedMermaidSvg(accessibleSvg("orphan"), "orphan");
  await assert.rejects(
    parseEmbeddedMermaidRecords(element),
    /rendered diagram/,
  );
  await assert.rejects(
    parseEmbeddedMermaidRecords(`${rendered}${rendered}${element}`),
    /Expected exactly one rendered diagram marker/,
  );
  await assert.rejects(
    parseEmbeddedMermaidRecords(`${rendered}${orphan}${element}`),
    /must have exactly one matching source record/,
  );
  await assert.rejects(
    parseEmbeddedMermaidRecords(
      `<figure data-ptv-diagram-rendered data-ptv-diagram-id="flow"></figure>${element}`,
    ),
    /inline SVG root/,
  );
  await assert.rejects(
    parseEmbeddedMermaidRecords(`${rendered}${element}${element}`),
    /Duplicate Mermaid source record/,
  );
});

test("rendered SVG requires complete accessibility semantics and safe local content", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const element = embeddedMermaidRecordElement(record);
  const cases = [
    accessibleSvg("flow").replace(/<desc[\s\S]*?<\/desc>/, ""),
    accessibleSvg("flow").replace(' aria-describedby="flow-description"', ""),
    accessibleSvg("flow").replace(' role="img"', ""),
    accessibleSvg("flow", { body: '<script>alert("x")</script>' }),
    accessibleSvg("flow", {
      body: '<image href="https://example.invalid/diagram.png" />',
    }),
    accessibleSvg("flow", {
      body: '<a href="javascript:alert(1)">Unsafe link</a>',
    }),
    accessibleSvg("flow", {
      body: '<a href="jav&#x61;script:alert(1)">Encoded unsafe link</a>',
    }),
    accessibleSvg("flow", {
      body: '<image href="data:text/html;base64,PHNjcmlwdD4=" />',
    }),
    accessibleSvg("flow", { rootAttributes: ' onclick="alert(1)"' }),
  ];
  for (const svg of cases) {
    const marked = svg.replace(
      "<svg ",
      '<svg data-ptv-diagram-rendered data-ptv-diagram-id="flow" ',
    );
    await assert.rejects(
      parseEmbeddedMermaidRecords(`${marked}${element}`),
      /accessibility|needs non-empty|must expose|executable or remote/,
    );
  }
});

test("nested SVG content cannot escape rendered root safety validation", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const element = embeddedMermaidRecordElement(record);
  const marked = accessibleSvg("flow", {
    body: '<svg></svg><script>alert("escaped validation")</script>',
  }).replace(
    "<svg ",
    '<svg data-ptv-diagram-rendered data-ptv-diagram-id="flow" ',
  );

  await assert.rejects(
    parseEmbeddedMermaidRecords(`${marked}${element}`),
    /executable or remote/,
  );
});

test("comments and executable page scripts cannot forge associations", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const fragment = combinedFragment(record);
  const forged = `<!-- <svg data-ptv-diagram-rendered data-ptv-diagram-id="orphan"></svg> -->
<script>const fake = '<svg data-ptv-diagram-rendered data-ptv-diagram-id="orphan"></svg>';</script>
${fragment}`;
  assert.deepEqual(await parseEmbeddedMermaidRecords(forged), [record]);
  assert.equal(globalThis.fake, undefined);
});

test("scaffold assembles validated combined content and strict combined metadata", async () => {
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR\n  A --> B",
    capsuleId,
  });
  const html = await assembleDocument({
    title: "Combined artifact",
    lang: "en",
    capability: "combined",
    trustedContent: combinedFragment(record),
  });
  assert.equal(
    (
      html.match(/name="ptlam-visualization-capability" content="combined"/g) ??
      []
    ).length,
    1,
  );
  assert.doesNotMatch(
    html,
    /name="ptlam-visualization-capability" content="html"/,
  );
  assert.deepEqual(await parseEmbeddedMermaidRecords(html), [record]);
});

test("public assembly seam validates its exact argument contract", async () => {
  for (const options of [
    undefined,
    { title: "", lang: "en" },
    { title: "Report", lang: "not_a_language" },
    { title: "Report", lang: "en", trustedContent: 42 },
    { title: "Report", lang: "en", capability: "unknown" },
  ]) {
    await assert.rejects(
      assembleDocument(options),
      (error) => error instanceof ScaffoldError && error.code === "assembly",
    );
  }
});

test("progressive HTML docs expose assembly and specialized ownership seams", async () => {
  const [combinedReference, htmlWorkflow, sharedRouting] = await Promise.all([
    readFile(
      join(
        repositoryRoot,
        "skills/productivity/ptlam-visualization/references/html/combined-mermaid.md",
      ),
      "utf8",
    ),
    readFile(
      join(
        repositoryRoot,
        "skills/productivity/ptlam-visualization/references/html/workflow.md",
      ),
      "utf8",
    ),
    readFile(
      join(
        repositoryRoot,
        "skills/productivity/ptlam-visualization/references/capability-routing.md",
      ),
      "utf8",
    ),
  ]);
  assert.match(
    combinedReference,
    /import \{[\s\S]*assembleDocument[\s\S]*scripts\/html\/scaffold\.mjs/,
  );
  assert.match(
    combinedReference,
    /assembleDocument\(\{[\s\S]*title[\s\S]*lang[\s\S]*capability = "html"[\s\S]*trustedContent = ""[\s\S]*Promise<string>/,
  );
  assert.match(
    combinedReference,
    /createEmbeddedMermaidRecord[\s\S]*capability: "combined"/,
  );
  assert.match(combinedReference, /markRenderedMermaidSvg/);
  assert.match(combinedReference, /embeddedMermaidRecordElement/);
  assert.match(
    htmlWorkflow,
    /specialized capability first[\s\S]*owns the data transformations[\s\S]*accessibility[\s\S]*validation/iu,
  );
  assert.match(
    htmlWorkflow,
    /HTML then owns page structure[\s\S]*safe embedding[\s\S]*final browser QA/iu,
  );
  assert.match(
    combinedReference,
    /not a generic chart or map renderer[\s\S]*specialized[\s\S]*already validated output/iu,
  );
  assert.match(
    sharedRouting,
    /specialized plot[\s\S]*inside a richer HTML page[\s\S]*specialized capability first[\s\S]*HTML\s+may compose only the validated output/iu,
  );
});

test("HTML validator enforces combined metadata, records, capsule, and association", async () => {
  await withTemporaryDirectory(async (directory) => {
    const record = await createEmbeddedMermaidRecord({
      diagramId: "flow",
      source: "flowchart LR\n  A --> B",
      capsuleId,
    });
    const validPath = join(directory, "valid-combined.html");
    const html = await assembleDocument({
      title: "Combined artifact",
      lang: "en",
      capability: "combined",
      trustedContent: combinedFragment(record),
    });
    await writeFile(validPath, html, "utf8");
    const valid = await runValidator([validPath]);
    assert.equal(valid.code, 0, valid.stdout + valid.stderr);
    assert.doesNotMatch(valid.stdout, /^ERROR /m);
    assert.match(valid.stdout, /SUMMARY errors=0 warnings=0 unverified=5/);

    const wrongMetadataPath = join(directory, "wrong-metadata.html");
    await writeFile(
      wrongMetadataPath,
      minimalDocument(combinedFragment(record), "html"),
      "utf8",
    );
    const wrongMetadata = await runValidator([wrongMetadataPath]);
    assert.notEqual(wrongMetadata.code, 0);
    assert.match(
      wrongMetadata.stdout,
      /^ERROR \[metadata-ptlam-visualization-capability\]/m,
    );

    const missingPath = join(directory, "missing-record.html");
    await writeFile(missingPath, minimalDocument(""), "utf8");
    const missing = await runValidator([missingPath]);
    assert.notEqual(missing.code, 0);
    assert.match(missing.stdout, /^ERROR \[combined-record-missing\]/m);

    const wrongCapsulePath = join(directory, "wrong-capsule.html");
    const wrongCapsule = { ...record, capsuleId: "a".repeat(64) };
    await writeFile(
      wrongCapsulePath,
      minimalDocument(
        `${markRenderedMermaidSvg(accessibleSvg("flow"), "flow")}${recordElementFromJson(JSON.stringify(wrongCapsule))}`,
      ),
      "utf8",
    );
    const wrongCapsuleResult = await runValidator([wrongCapsulePath]);
    assert.notEqual(wrongCapsuleResult.code, 0);
    assert.match(
      wrongCapsuleResult.stdout,
      /^ERROR \[combined-capsule-identity\]/m,
    );
  });
});

test("extractor list and validation create no sidecar; explicit extraction writes exact source", async () => {
  await withTemporaryDirectory(async (directory) => {
    const record = await createEmbeddedMermaidRecord({
      diagramId: "flow",
      source: "flowchart LR\r\n A --> B\r\n",
      capsuleId,
    });
    const input = join(directory, "combined.html");
    const output = join(directory, "nested", "flow.mmd");
    await writeFile(input, minimalDocument(combinedFragment(record)), "utf8");

    const validated = await runValidator([input]);
    assert.equal(validated.code, 0, validated.stdout + validated.stderr);
    const listed = await runExtractor(["--input", input, "--list"]);
    assert.equal(listed.code, 0, listed.stderr);
    assert.deepEqual(await readdir(directory), ["combined.html"]);

    const listResult = JSON.parse(listed.stdout);
    assert.deepEqual(listResult.diagrams, [
      {
        diagramId: "flow",
        sourceSha256: record.sourceSha256,
        mermaidVersion: ACTIVE_MERMAID_VERSION,
        capsuleId,
      },
    ]);
    assert.doesNotMatch(listed.stdout, /flowchart|\/Users\//);

    const extracted = await runExtractor([
      "--input",
      input,
      "--diagram",
      "flow",
      "--output",
      output,
    ]);
    assert.equal(extracted.code, 0, extracted.stderr);
    assert.equal(await readFile(output, "utf8"), record.source);

    const refused = await runExtractor([
      "--input",
      input,
      "--diagram",
      "flow",
      "--output",
      output,
    ]);
    assert.notEqual(refused.code, 0);
    assert.match(refused.stderr, /ERROR \[output-exists\]/);
  });
});

test("extractor rejects invalid CLI, invalid UTF-8, and missing diagrams", async () => {
  await withTemporaryDirectory(async (directory) => {
    const record = await createEmbeddedMermaidRecord({
      diagramId: "flow",
      source: "flowchart LR",
      capsuleId,
    });
    const input = join(directory, "combined.html");
    await writeFile(input, minimalDocument(combinedFragment(record)), "utf8");

    const invalidCli = await runExtractor([
      "--input",
      input,
      "--list",
      "--output",
      "unused.mmd",
    ]);
    assert.notEqual(invalidCli.code, 0);
    assert.match(invalidCli.stderr, /ERROR \[cli-usage\]/);

    const invalidUtf8 = join(directory, "invalid.html");
    await writeFile(invalidUtf8, Uint8Array.from([0xff]));
    const invalidInput = await runExtractor(["--input", invalidUtf8, "--list"]);
    assert.notEqual(invalidInput.code, 0);
    assert.match(invalidInput.stderr, /ERROR \[input-utf8\]/);

    const missing = await runExtractor([
      "--input",
      input,
      "--diagram",
      "missing",
      "--output",
      join(directory, "missing.mmd"),
    ]);
    assert.notEqual(missing.code, 0);
    assert.match(missing.stderr, /ERROR \[diagram\]/);
  });
});

test("combined HTML scripts never invoke Mermaid render, setup, browser, or network", async () => {
  const sources = await Promise.all(
    [combinedModulePath, extractorPath, validatorPath].map((path) =>
      readFile(path, "utf8"),
    ),
  );
  for (const source of sources) {
    assert.doesNotMatch(
      source,
      /(?:scripts|runtime)[/\\]mermaid|setup\.mjs|render\.mjs|@mermaid|mermaid-cli|\bfetch\s*\(|https?:\/\//i,
    );
  }
  assert.match(
    sources[2],
    /if \(combinedSignals \|\| combinedDeclared\) \{\s*await checkCombinedContract\(report, source\);\s*\}/,
  );
  assert.match(sources[2], /import\("\.\/lib\/embedded-mermaid-record\.mjs"\)/);
});
