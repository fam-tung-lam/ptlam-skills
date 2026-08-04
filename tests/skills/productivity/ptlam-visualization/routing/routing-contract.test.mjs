import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillRoot = new URL(
  "../../../../../skills/productivity/ptlam-visualization/",
  import.meta.url,
);

const readSkillFile = (relativePath) =>
  readFile(new URL(relativePath, skillRoot), "utf8");

async function routingCorpus() {
  const paths = [
    "SKILL.md",
    "references/capability-routing.md",
    "references/quality-and-safety.md",
    "references/mermaid/workflow.md",
    "references/mermaid/output-routing.md",
    "references/mermaid/quality-and-safety.md",
  ];
  return (await Promise.all(paths.map(readSkillFile))).join("\n");
}

test("instructions encode every required route without claiming model evaluation", async () => {
  const corpus = await routingCorpus();
  const cases = [
    ["rich HTML", /rich narrative[\s\S]*HTML[\s\S]*browser QA/i],
    ["Mermaid code", /Mermaid code[\s\S]*Fenced `mermaid` source/],
    ["editable source", /Editable source file[\s\S]*\.mmd/],
    ["focused image", /focused supported diagram[\s\S]*\.png/i],
    ["SVG", /Vector\/web diagram[\s\S]*\.svg/],
    ["PDF", /Standalone printable diagram[\s\S]*\.pdf/],
    ["native Markdown", /Mermaid code for Markdown[\s\S]*Fenced `mermaid`/],
    [
      "static Markdown",
      /Markdown with static assets[\s\S]*requested linked assets/,
    ],
    ["combined HTML", /HTML containing a diagram[\s\S]*accessible SVG/],
    [
      "external composition",
      /external composition[\s\S]*outer capability owns/i,
    ],
    [
      "specialized handoff",
      /map, plot, image, or specialized artifact[\s\S]*External composition/i,
    ],
    ["ordinary chat", /ordinary chat for a simple fact/i],
    [
      "explicit abstention",
      /explicit abstention when the user says not to visualize/i,
    ],
  ];

  for (const [name, pattern] of cases) {
    assert.match(corpus, pattern, `${name} must have an explicit written rule`);
  }
});

test("content fitness precedes format while exact constraints survive", async () => {
  const router = await readSkillFile("references/capability-routing.md");

  assert.match(
    router,
    /Record exact user constraints[\s\S]*Never[\s\S]*silently discard or substitute/,
  );
  assert.match(
    router,
    /Select capability fitness[\s\S]*Apply[\s\S]*preserved output format only after/,
  );
  assert.match(
    router,
    /extension is a constraint, not proof of capability fitness[\s\S]*photograph, illustration, plot, map, or multi-page report/,
  );
  assert.match(router, /explicit request not to visualize[\s\S]*Abstain/i);
});

test("primary, co-primary, combined, and external ownership stay distinct", async () => {
  const [skill, router, output] = await Promise.all([
    readSkillFile("SKILL.md"),
    readSkillFile("references/capability-routing.md"),
    readSkillFile("references/mermaid/output-routing.md"),
  ]);
  const corpus = `${skill}\n${router}\n${output}`;

  assert.match(
    corpus,
    /one requested primary artifact[\s\S]*explicitly requests[\s\S]*co-primary set/i,
  );
  assert.match(corpus, /add no unrequested companion/i);
  assert.match(
    corpus,
    /Mermaid owns[\s\S]*diagram[\s\S]*HTML owns[\s\S]*final[\s\S]*(?:browser QA|QA)/,
  );
  assert.match(
    corpus,
    /outer capability owns[\s\S]*final[\s\S]*inputs are not extra user[\s\S]*deliverables/i,
  );
  assert.match(corpus, /does not claim the combined-HTML[\s\S]*contract/i);
});

test("shared and Mermaid safety rules are explicit", async () => {
  const [shared, mermaid, output] = await Promise.all([
    readSkillFile("references/quality-and-safety.md"),
    readSkillFile("references/mermaid/quality-and-safety.md"),
    readSkillFile("references/mermaid/output-routing.md"),
  ]);

  assert.match(
    shared,
    /no analytics, telemetry, tracking pixels, hidden requests, or uploads/i,
  );
  assert.match(shared, /unexecuted checks[\s\S]*unverified, never passed/);
  assert.match(mermaid, /Never resolve floating `latest`[\s\S]*floating `npx`/);
  assert.match(mermaid, /securityLevel: strict/);
  assert.match(
    mermaid,
    /isolated browser profile[\s\S]*bounded[\s\S]*guaranteed cleanup/,
  );
  assert.match(
    output,
    /“file only”[\s\S]*attachment alt field or file metadata[\s\S]*unrequested sidecar/,
  );
});
