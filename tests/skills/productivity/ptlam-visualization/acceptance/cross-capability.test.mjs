import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assembleDocument } from "../../../../../skills/productivity/ptlam-visualization/scripts/html/scaffold.mjs";
import {
  activeMermaidCapsule,
  createEmbeddedMermaidRecord,
  embeddedMermaidRecordElement,
  markRenderedMermaidSvg,
  parseEmbeddedMermaidRecords,
} from "../../../../../skills/productivity/ptlam-visualization/scripts/html/lib/embedded-mermaid-record.mjs";
import { decideAccessibility } from "../../../../../skills/productivity/ptlam-visualization/scripts/mermaid/render.mjs";
import {
  createFakeRuntime,
  validSource,
  writeSource,
} from "../mermaid/output-fixtures/test-runtime.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../..");
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
    child.once("close", (code) =>
      resolveRun({ code, stderr, result: JSON.parse(stdout) }),
    );
  });
}

test("the public routing interface preserves every route and constraint class", async () => {
  const [skill, routing] = await Promise.all([
    readFile(
      join(repositoryRoot, "skills/productivity/ptlam-visualization/SKILL.md"),
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
  const corpus = `${skill}\n${routing}`;
  const routes = new Map([
    ["html", /rich narrative[\s\S]*HTML/iu],
    ["mermaid", /focused supported relationship[\s\S]*Mermaid/iu],
    ["combined", /Rich HTML page containing[\s\S]*Combined/iu],
    ["external", /Rich non-HTML report[\s\S]*External composition/iu],
    ["chat", /Simple content[\s\S]*Chat or specialized handoff/iu],
    ["abstain", /Explicit request not to visualize[\s\S]*Abstain/iu],
  ]);
  for (const [route, pattern] of routes) {
    assert.match(corpus, pattern, `${route} route must stay explicit`);
  }
  assert.match(
    corpus,
    /format, path, destination or named host[\s\S]*privacy[\s\S]*delivery constraints/iu,
  );
  assert.match(
    corpus,
    /continuing or repairing an artifact[\s\S]*preserve its existing mode/iu,
  );
  assert.match(
    corpus,
    /says\s+not to visualize[\s\S]*abstain before reading capability references or touching a\s+runtime/iu,
  );
});

test("HTML and combined assembly cross the same small interface safely", async () => {
  const html = await assembleDocument({ title: "HTML only", lang: "en" });
  assert.equal(
    (html.match(/name="ptlam-visualization-capability" content="html"/gu) ?? [])
      .length,
    1,
  );
  assert.doesNotMatch(html, /data-ptv-diagram-source/iu);

  const active = await activeMermaidCapsule();
  const record = await createEmbeddedMermaidRecord({
    diagramId: "acceptance-flow",
    source: validSource,
    capsuleId: active.capsuleId,
  });
  const svg = markRenderedMermaidSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="acceptance-flow-title" aria-describedby="acceptance-flow-description" viewBox="0 0 100 40">
  <title id="acceptance-flow-title">Acceptance flow</title>
  <desc id="acceptance-flow-description">Request to validated output.</desc>
  <path d="M0 20h100" />
</svg>`,
    record.diagramId,
  );
  const combined = await assembleDocument({
    title: "Combined",
    lang: "en",
    capability: "combined",
    trustedContent: `${svg}\n${embeddedMermaidRecordElement(record)}`,
  });
  assert.equal(
    (
      combined.match(
        /name="ptlam-visualization-capability" content="combined"/gu,
      ) ?? []
    ).length,
    1,
  );
  const parsed = await parseEmbeddedMermaidRecords(combined);
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0], record);
});

test("Mermaid external composition keeps the outer owner and no user companion", async () => {
  const fake = await createFakeRuntime();
  try {
    const input = await writeSource(fake.directory);
    const output = join(fake.directory, "internal.svg");
    const run = await runRender(
      [
        "--input",
        input,
        "--format",
        "svg",
        "--output",
        output,
        "--delivery-mode",
        "external-composition",
      ],
      fake.environment,
    );
    assert.equal(run.code, 0, run.stderr);
    assert.deepEqual(run.result.ownership, {
      outerCapabilityOwnsFinalArtifact: true,
      combinedHtmlContract: false,
      internalInput: true,
      userDeliverable: false,
    });
    assert.deepEqual(run.result.deliverables, [
      { path: output, format: "svg", primary: false, internal: true },
    ]);
  } finally {
    await fake.cleanup();
  }
});

test("an exact co-primary request returns per-file and set-level evidence", async () => {
  const fake = await createFakeRuntime();
  try {
    const input = await writeSource(fake.directory);
    const outputs = [
      { format: "svg", output: join(fake.directory, "diagram.svg") },
      { format: "png", output: join(fake.directory, "diagram.png") },
      { format: "mmd", output: join(fake.directory, "diagram.mmd") },
    ];
    const requestSet = join(fake.directory, "request-set.json");
    await writeFile(requestSet, JSON.stringify({ outputs }));
    const run = await runRender(
      ["--input", input, "--request-set", requestSet],
      fake.environment,
    );
    assert.equal(run.code, 0, run.stderr);
    assert.equal(run.result.status, "unverified");
    assert.equal(run.result.requestedCount, outputs.length);
    assert.equal(run.result.completedCount, outputs.length);
    assert.equal(run.result.items.length, outputs.length);
    assert.deepEqual(
      run.result.items.map((item) => item.deliverables[0]?.path),
      outputs.map(({ output }) => output),
    );
    assert.ok(run.result.items.every((item) => item.status === "ok"));
    assert.ok(run.result.unverified.length > 0);
    assert.equal(
      new Set(
        run.result.unverified.map(
          (finding) => `${finding.code}\u0000${finding.message}`,
        ),
      ).size,
      run.result.unverified.length,
    );
  } finally {
    await fake.cleanup();
  }
});

test("file-only accessibility never invents a companion channel", () => {
  assert.deepEqual(decideAccessibility("png", "file-only", "attachment"), {
    status: "ok",
    channel: "attachment",
  });
  assert.deepEqual(decideAccessibility("pdf", "file-only", "metadata"), {
    status: "ok",
    channel: "metadata",
  });
  assert.deepEqual(decideAccessibility("png", "file-only", "none"), {
    status: "decision-needed",
    code: "file-only-accessibility",
    message:
      "File-only PNG/PDF delivery needs attachment alt text or supported metadata; a sidecar will not be created.",
  });
});
