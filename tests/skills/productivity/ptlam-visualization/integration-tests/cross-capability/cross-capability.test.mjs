import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { assembleDocument } from "../../../../../../skills/productivity/ptlam-visualization/scripts/html/scaffold.mjs";
import {
  activeMermaidCapsule,
  createEmbeddedMermaidRecord,
  embeddedMermaidRecordElement,
  markRenderedMermaidSvg,
  parseEmbeddedMermaidRecords,
} from "../../../../../../skills/productivity/ptlam-visualization/scripts/html/lib/embedded-mermaid-record.mjs";
import { decideAccessibility } from "../../../../../../skills/productivity/ptlam-visualization/scripts/mermaid/render.mjs";
import {
  createFakeRuntime,
  validSource,
  writeSource,
} from "../test_doubles/fake-mermaid-runtime.mjs";
import { runNodeCommand } from "../utils/node-command.mjs";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../../..");
const renderPath = join(
  repositoryRoot,
  "skills/productivity/ptlam-visualization/scripts/mermaid/render.mjs",
);

async function runRender(arguments_, environment) {
  const run = await runNodeCommand(renderPath, arguments_, {
    cwd: repositoryRoot,
    env: environment,
  });
  return { ...run, result: JSON.parse(run.stdout) };
}

test("the public routing interface preserves every route and constraint class", async () => {
  // Given the unified skill and capability-routing reference.
  const referencePaths = [
    join(repositoryRoot, "skills/productivity/ptlam-visualization/SKILL.md"),
    join(
      repositoryRoot,
      "skills/productivity/ptlam-visualization/references/capability-routing.md",
    ),
  ];

  // When their public route and constraint language is read together.
  const [skill, routing] = await Promise.all(
    referencePaths.map((path) => readFile(path, "utf8")),
  );
  const corpus = `${skill}\n${routing}`;
  const routes = new Map([
    ["html", /rich narrative[\s\S]*HTML/iu],
    ["mermaid", /focused supported relationship[\s\S]*Mermaid/iu],
    ["combined", /Rich HTML page containing[\s\S]*Combined/iu],
    ["external", /Rich non-HTML report[\s\S]*External composition/iu],
    ["chat", /Simple content[\s\S]*Chat or specialized handoff/iu],
    ["abstain", /Explicit request not to visualize[\s\S]*Abstain/iu],
  ]);

  // Then every supported, external, chat, and abstain route remains explicit.
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
  // Given HTML-only content and a canonical inert Mermaid record with rendered SVG.
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

  // When both artifacts cross the same public assembly seam.
  const html = await assembleDocument({ title: "HTML only", lang: "en" });
  const combined = await assembleDocument({
    title: "Combined",
    lang: "en",
    capability: "combined",
    trustedContent: `${svg}\n${embeddedMermaidRecordElement(record)}`,
  });
  const parsed = await parseEmbeddedMermaidRecords(combined);

  // Then capability metadata and combined associations remain exact.
  assert.equal(
    (html.match(/name="ptlam-visualization-capability" content="html"/gu) ?? [])
      .length,
    1,
  );
  assert.doesNotMatch(html, /data-ptv-diagram-source/iu);
  assert.equal(
    (
      combined.match(
        /name="ptlam-visualization-capability" content="combined"/gu,
      ) ?? []
    ).length,
    1,
  );
  assert.equal(parsed.length, 1);
  assert.deepEqual(parsed[0], record);
});

test("Mermaid external composition keeps the outer owner and no user companion", async () => {
  // Given a render requested as an internal input to an outer capability.
  const fake = await createFakeRuntime();
  try {
    const input = await writeSource(fake.directory);
    const output = join(fake.directory, "internal.svg");

    // When it crosses the public Mermaid render command.
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

    // Then ownership stays external and the render is not a user deliverable.
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
  // Given one exact request set with three co-primary formats.
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

    // When the public renderer processes the set.
    const run = await runRender(
      ["--input", input, "--request-set", requestSet],
      fake.environment,
    );

    // Then per-file evidence and deduplicated set evidence preserve the exact set.
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
  // Given supported and absent file-only accessibility channels.
  const cases = [
    [
      ["png", "file-only", "attachment"],
      { status: "ok", channel: "attachment" },
    ],
    [["pdf", "file-only", "metadata"], { status: "ok", channel: "metadata" }],
    [
      ["png", "file-only", "none"],
      {
        status: "decision-needed",
        code: "file-only-accessibility",
        message:
          "File-only PNG/PDF delivery needs attachment alt text or supported metadata; a sidecar will not be created.",
      },
    ],
  ];

  // When the public output policy chooses a destination.
  const decisions = cases.map(([arguments_, expected]) => ({
    actual: decideAccessibility(...arguments_),
    expected,
  }));

  // Then it uses only explicit channels or requests a decision.
  for (const decision of decisions) {
    assert.deepEqual(decision.actual, decision.expected);
  }
});
