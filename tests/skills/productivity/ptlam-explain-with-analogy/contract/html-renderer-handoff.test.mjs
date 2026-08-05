import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../..");
const skillRoot = resolve(
  repositoryRoot,
  "skills/productivity/ptlam-explain-with-analogy",
);

const readSkillFile = (path) => readFile(resolve(skillRoot, path), "utf8");

function assertIncludesAll(source, requirements) {
  for (const [description, pattern] of requirements) {
    assert.match(
      source,
      pattern,
      `missing renderer handoff for ${description}`,
    );
  }
}

test("hands semantic ownership to no renderer while preferring interactive HTML", async () => {
  // Given the analogy workflow and UI metadata.
  const [skill, metadata] = await Promise.all([
    readSkillFile("SKILL.md"),
    readSkillFile("agents/openai.yaml"),
  ]);

  // When renderer selection and ownership are inspected.
  const handoff = skill.slice(skill.indexOf("## Hand off rendering"));

  // Then HTML rendering is preferred but optional and semantics remain here.
  assertIncludesAll(handoff, [
    ["preferred HTML renderer", /Prefer `?\$ptlam-visualization-with-html`?/iu],
    ["optional renderer", /renderer optional|Keep the renderer optional/iu],
    ["literal truth model", /literal truth model/iu],
    ["mapping ledger", /mapping ledger/iu],
    ["abstraction tree", /abstraction tree/iu],
    ["scene state", /initial state[\s\S]{0,120}state deltas/iu],
    ["control behavior", /control behavior/iu],
    [
      "renderer mechanics ownership",
      /renderer own[\s\S]{0,160}HTML\/CSS\/JavaScript mechanics/iu,
    ],
    [
      "analogy semantic ownership",
      /Own the learning goal[\s\S]{0,240}mapping gate/iu,
    ],
  ]);
  assert.doesNotMatch(
    metadata,
    /^(?:dependencies|required_skills?|requires):/mu,
  );
});

test("requests synchronized twins, semantic zoom, and stateful learning controls", async () => {
  // Given the complete analogy skill contract.
  const skill = await readSkillFile("SKILL.md");

  // When its renderer-request requirements are inspected.
  const handoff = skill.slice(skill.indexOf("## Synchronize"));

  // Then mapped systems and every dynamic panel move through one learning state.
  assertIncludesAll(handoff, [
    [
      "shared twin identities",
      /corresponding nodes, edges,[\s\S]{0,120}same semantic identities/iu,
    ],
    [
      "synchronized twin state",
      /both twins[\s\S]{0,100}same abstraction level and current step/iu,
    ],
    ["C4 semantic zoom", /C4-like semantic zoom/iu],
    ["connected zoom maps", /truthful connected map/iu],
    ["zoom out", /zoom out/iu],
    ["flowchart left", /flowchart on the left/iu],
    [
      "state or frames right",
      /live state, frames, messages, or records on the right/iu,
    ],
    ["control plane below", /control plane below/iu],
    ["manual controls", /manual step, back, and reset/iu],
    ["optional autoplay", /autoplay[\s\S]{0,100}play, pause, and replay/iu],
    [
      "sequence composition",
      /sequence diagrams[\s\S]{0,160}left[\s\S]{0,100}right[\s\S]{0,100}controls below/iu,
    ],
    ["memory layers", /stable, context, and\s+volatile/iu],
    ["memory-layer counterpart", /stable real-life counterpart/iu],
    ["memory-layer visual", /analogy-mapped visual/iu],
  ]);
});

test("keeps the primary path top-to-bottom and removes redundant explanation", async () => {
  // Given the progressive-scene instructions.
  const skill = await readSkillFile("SKILL.md");
  const path = skill.slice(
    skill.indexOf("## Plan one top-to-bottom learning path"),
  );

  // When primary layout and post-visual explanation rules are inspected.
  const visualRule = path.slice(0, path.indexOf("## Synchronize"));

  // Then tabs cannot replace the path and a complete visual is not explained twice.
  assertIncludesAll(visualRule, [
    ["scrolling document", /scrollable, top-to-bottom narrative/iu],
    ["no primary tabs", /Do not hide the main learning path\s+behind tabs/iu],
    ["visual leads", /Lead each mechanism with its interactive visual/iu],
    ["remove duplicate formats", /Remove any prose/iu],
    [
      "remove repeated explanation",
      /repeats what a preceding interactive visual\s+already teaches/iu,
    ],
    ["no primary table", /Do not make a table the primary teaching surface/iu],
  ]);
});

test("adds checks only after an explicit learner request", async () => {
  // Given the analogy skill's learning-output policy.
  const skill = await readSkillFile("SKILL.md");

  // When default and opt-in checking behavior are inspected.
  const checksRule = skill.match(
    /Do not add learner quizzes[\s\S]{0,260}same artifact after the explanation\./iu,
  )?.[0];

  // Then no check appears by default and explicit intent is the only opt-in.
  assert.ok(checksRule, "missing complete optional-checks contract");
  assert.match(checksRule, /by\s+default/iu);
  assert.match(checksRule, /only when the learner explicitly requests them/iu);
});
