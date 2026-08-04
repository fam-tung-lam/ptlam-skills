import assert from "node:assert/strict";
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ScaffoldError,
  assembleDocument,
} from "../../../../../../skills/productivity/ptlam-visualization/scripts/html/scaffold.mjs";
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
} from "../../../../../../skills/productivity/ptlam-visualization/scripts/html/lib/embedded-mermaid-record.mjs";
import {
  runNodeCommand,
  withTemporaryDirectory,
} from "../utils/node-command.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../../..");
const extractorPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/extract-mermaid.mjs",
);
const validatorPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/html/validate.mjs",
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
  return runNodeCommand(commandPath, arguments_, {
    cwd: repositoryRoot,
    env: options.env,
  });
}

const runExtractor = (arguments_, options) =>
  runCommand(extractorPath, arguments_, options);
const runValidator = (arguments_, options) =>
  runCommand(validatorPath, arguments_, options);

const withCombinedDirectory = (run) =>
  withTemporaryDirectory("ptv-combined-", run);

test("active capsule comes from the exact manifest identity", async () => {
  // Given the active combined-artifact capsule and its manifest.
  const manifest = JSON.parse(
    await readFile(
      join(
        repositoryRoot,
        "skills/productivity/ptlam-visualization/references/mermaid/11.16.0/MANIFEST.json",
      ),
      "utf8",
    ),
  );

  // When their public identities are compared.
  const manifestIdentity = manifest.capsuleIdentity;

  // Then the exact pinned Mermaid version and capsule digest agree.
  assert.equal(active.mermaidVersion, ACTIVE_MERMAID_VERSION);
  assert.equal(active.capsuleId, manifestIdentity.value);
  assert.equal(manifestIdentity.algorithm, "sha256-canonical-json-v1");
});

test("normalization removes one BOM, canonicalizes lines and NFC, and keeps one LF", () => {
  // Given source bytes with a BOM, mixed line endings, and decomposed text.
  const source = "\uFEFFflowchart LR\r\n  A[cafe\u0301] --> B\r\n\r\n";

  // When the public combined-source normalizer processes them.
  const normalized = normalizeMermaidSource(source);

  // Then one canonical UTF-8 source with one trailing line feed remains.
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
  // Given valid and mismatched record identity inputs.
  const validInput = {
    diagramId: "main-flow",
    source: "flowchart LR\n  A --> B",
    capsuleId,
  };

  // When they cross the public record-creation seam.
  const record = await createEmbeddedMermaidRecord(validInput);

  // Then canonical evidence is created or the precise mismatch fails closed.
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
  // Given accessible rendered SVG and its canonical inert source record.
  const record = await createEmbeddedMermaidRecord({
    diagramId: "main-flow",
    source: "flowchart LR\n  A --> B",
    capsuleId,
  });
  const fragment = combinedFragment(record);

  // When both are parsed through the public combined seam.
  const parsed = await parseEmbeddedMermaidRecords(fragment);

  // Then their diagram association round-trips exactly.
  assert.match(fragment, /<svg\b[^>]*data-ptv-diagram-rendered/);
  assert.ok(fragment.includes(EMBEDDED_MERMAID_MIME));
  assert.deepEqual(parsed, [record]);
});

test("record element rejects malformed base64, UTF-8, JSON, and noncanonical JSON", async () => {
  // Given record elements with malformed transport and serialization forms.
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

  // When each element crosses the public parser.
  for (const scenario of cases) {
    // Then every malformed form fails before it can become trusted source.
    await assert.rejects(
      parseEmbeddedMermaidRecords(`${rendered}${scenario.element}`),
      scenario.message,
    );
  }
});

test("record schema rejects extra, missing, wrong, mismatched, and noncanonical fields", async () => {
  // Given decoded records that violate one schema or identity rule.
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

  // When they cross the public record validator.
  for (const [candidate, message] of cases) {
    // Then each invalid record is rejected with no permissive fallback.
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
  // Given inert source elements with malformed ownership attributes.
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

  // When they cross the public combined parser.
  for (const element of cases) {
    // Then only the exact local inert-source contract is accepted.
    await assert.rejects(
      parseEmbeddedMermaidRecords(`${rendered}${element}`),
      /marker and MIME|boolean marker|repeats data-ptv-diagram-id/,
    );
  }
});

test("association rejects missing, duplicate, orphan, or non-SVG rendered markers", async () => {
  // Given rendered and source elements with broken diagram associations.
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const element = embeddedMermaidRecordElement(record);
  const rendered = markRenderedMermaidSvg(accessibleSvg("flow"), "flow");
  const orphan = markRenderedMermaidSvg(accessibleSvg("orphan"), "orphan");
  const cases = [
    [element, /rendered diagram/],
    [
      `${rendered}${rendered}${element}`,
      /Expected exactly one rendered diagram marker/,
    ],
    [
      `${rendered}${orphan}${element}`,
      /must have exactly one matching source record/,
    ],
    [
      `<figure data-ptv-diagram-rendered data-ptv-diagram-id="flow"></figure>${element}`,
      /inline SVG root/,
    ],
    [`${rendered}${element}${element}`, /Duplicate Mermaid source record/],
  ];

  // When the combined fragment is parsed.
  for (const [fragment, message] of cases) {
    // Then missing, duplicate, orphan, and wrong-element markers fail closed.
    await assert.rejects(parseEmbeddedMermaidRecords(fragment), message);
  }
});

test("rendered SVG requires complete accessibility semantics and safe local content", async () => {
  // Given rendered SVG variants with incomplete or unsafe semantics.
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

  // When they cross the combined-artifact parser.
  for (const svg of cases) {
    const marked = svg.replace(
      "<svg ",
      '<svg data-ptv-diagram-rendered data-ptv-diagram-id="flow" ',
    );

    // Then only complete, safe, locally contained SVG is accepted.
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
  // Given comment text and executable scripts that mimic association markers.
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR",
    capsuleId,
  });
  const fragment = combinedFragment(record);
  const forged = `<!-- <svg data-ptv-diagram-rendered data-ptv-diagram-id="orphan"></svg> -->
<script>const fake = '<svg data-ptv-diagram-rendered data-ptv-diagram-id="orphan"></svg>';</script>
${fragment}`;

  // When the combined HTML is parsed.
  const parsed = await parseEmbeddedMermaidRecords(forged);

  // Then neither source form can forge a trusted diagram association.
  assert.deepEqual(parsed, [record]);
  assert.equal(globalThis.fake, undefined);
});

test("scaffold assembles validated combined content and strict combined metadata", async () => {
  // Given trusted combined content and its canonical record.
  const record = await createEmbeddedMermaidRecord({
    diagramId: "flow",
    source: "flowchart LR\n  A --> B",
    capsuleId,
  });

  // When the public document assembly seam creates the page.
  const html = await assembleDocument({
    title: "Combined artifact",
    lang: "en",
    capability: "combined",
    trustedContent: combinedFragment(record),
  });

  // Then strict combined metadata and associations validate together.
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
  // Given invalid assembly arguments at the public document seam.
  const cases = [
    undefined,
    { title: "", lang: "en" },
    { title: "Report", lang: "not_a_language" },
    { title: "Report", lang: "en", trustedContent: 42 },
    { title: "Report", lang: "en", capability: "unknown" },
  ];

  // When each argument set is submitted.
  for (const options of cases) {
    // Then the exact contract fails before an artifact is assembled.
    await assert.rejects(
      assembleDocument(options),
      (error) => error instanceof ScaffoldError && error.code === "assembly",
    );
  }
});

test("progressive HTML docs expose assembly and specialized ownership seams", async () => {
  // Given the HTML workflow and combined-ownership references.
  const referencePaths = [
    join(
      repositoryRoot,
      "skills/productivity/ptlam-visualization/references/html/combined-mermaid.md",
    ),
    join(
      repositoryRoot,
      "skills/productivity/ptlam-visualization/references/html/workflow.md",
    ),
    join(
      repositoryRoot,
      "skills/productivity/ptlam-visualization/references/capability-routing.md",
    ),
  ];

  // When their public assembly guidance is read together.
  const [combinedReference, htmlWorkflow, sharedRouting] = await Promise.all(
    referencePaths.map((path) => readFile(path, "utf8")),
  );

  // Then generic HTML and specialized Mermaid ownership stay distinct.
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
  // Given valid and invalid combined HTML documents.
  await withCombinedDirectory(async (directory) => {
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

    // When each document crosses the public HTML validator command.
    const valid = await runValidator([validPath]);

    // Then metadata, record, capsule, and association rules are enforced together.
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
  // Given valid combined HTML with one inert Mermaid source record.
  await withCombinedDirectory(async (directory) => {
    const record = await createEmbeddedMermaidRecord({
      diagramId: "flow",
      source: "flowchart LR\r\n A --> B\r\n",
      capsuleId,
    });
    const input = join(directory, "combined.html");
    const output = join(directory, "nested", "flow.mmd");
    await writeFile(input, minimalDocument(combinedFragment(record)), "utf8");

    // When list and validation commands run.
    const validated = await runValidator([input]);
    const listed = await runExtractor(["--input", input, "--list"]);

    // Then neither command creates a sidecar, and listing returns exact evidence.
    assert.equal(validated.code, 0, validated.stdout + validated.stderr);
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

    // When explicit extraction is requested.
    const extracted = await runExtractor([
      "--input",
      input,
      "--diagram",
      "flow",
      "--output",
      output,
    ]);

    // Then it writes the exact requested source file.
    assert.equal(extracted.code, 0, extracted.stderr);
    assert.equal(await readFile(output, "utf8"), record.source);

    // When extraction targets that existing file again.
    const refused = await runExtractor([
      "--input",
      input,
      "--diagram",
      "flow",
      "--output",
      output,
    ]);

    // Then the command refuses to overwrite it.
    assert.notEqual(refused.code, 0);
    assert.match(refused.stderr, /ERROR \[output-exists\]/);
  });
});

test("extractor rejects invalid CLI, invalid UTF-8, and missing diagrams", async () => {
  // Given invalid command options, invalid bytes, and an absent diagram ID.
  await withCombinedDirectory(async (directory) => {
    const record = await createEmbeddedMermaidRecord({
      diagramId: "flow",
      source: "flowchart LR",
      capsuleId,
    });
    const input = join(directory, "combined.html");
    await writeFile(input, minimalDocument(combinedFragment(record)), "utf8");

    // When invalid command options cross the public extractor command.
    const invalidCli = await runExtractor([
      "--input",
      input,
      "--list",
      "--output",
      "unused.mmd",
    ]);

    // Then the command returns an actionable CLI failure.
    assert.notEqual(invalidCli.code, 0);
    assert.match(invalidCli.stderr, /ERROR \[cli-usage\]/);

    // Given an input document containing invalid UTF-8 bytes.
    const invalidUtf8 = join(directory, "invalid.html");
    await writeFile(invalidUtf8, Uint8Array.from([0xff]));

    // When the invalid document crosses the public extractor command.
    const invalidInput = await runExtractor(["--input", invalidUtf8, "--list"]);

    // Then the command returns an actionable encoding failure.
    assert.notEqual(invalidInput.code, 0);
    assert.match(invalidInput.stderr, /ERROR \[input-utf8\]/);

    // Given a diagram ID that is absent from the valid input document.
    const missingOutput = join(directory, "missing.mmd");

    // When explicit extraction requests that absent diagram.
    const missing = await runExtractor([
      "--input",
      input,
      "--diagram",
      "missing",
      "--output",
      missingOutput,
    ]);

    // Then the command returns an actionable diagram failure without output.
    assert.notEqual(missing.code, 0);
    assert.match(missing.stderr, /ERROR \[diagram\]/);
  });
});

test("combined HTML commands leave the Mermaid runtime cache untouched", async () => {
  // Given valid combined HTML and an absent isolated Mermaid runtime cache.
  await withCombinedDirectory(async (directory) => {
    const isolatedHome = join(directory, "isolated-home");
    const isolatedCache = join(directory, "absent-cache");
    const input = join(directory, "combined.html");
    await mkdir(isolatedHome);
    const record = await createEmbeddedMermaidRecord({
      diagramId: "flow",
      source: "flowchart LR\n  A[Start] --> B[End]\n",
      capsuleId,
    });
    await writeFile(input, minimalDocument(combinedFragment(record)), "utf8");
    const environment = {
      HOME: isolatedHome,
      XDG_CACHE_HOME: isolatedCache,
    };

    // When validation and inert-source listing cross their public command seams.
    const validation = await runValidator([input], { env: environment });
    const extraction = await runExtractor(["--input", input, "--list"], {
      env: environment,
    });

    // Then both succeed without initializing the Mermaid renderer or its cache.
    assert.equal(validation.code, 0, validation.stdout + validation.stderr);
    assert.equal(extraction.code, 0, extraction.stdout + extraction.stderr);
    assert.match(extraction.stdout, /flow/);
    await assert.rejects(lstat(isolatedCache), { code: "ENOENT" });
  });
});
