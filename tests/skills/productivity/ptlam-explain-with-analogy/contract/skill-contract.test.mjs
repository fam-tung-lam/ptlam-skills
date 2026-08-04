import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, "../../../../..");
const skillRoot = resolve(
  repositoryRoot,
  "skills/productivity/ptlam-explain-with-analogy",
);

const readSkillFile = (relativePath) =>
  readFile(resolve(skillRoot, relativePath), "utf8");

function assertIncludesAll(source, requirements) {
  for (const [description, pattern] of requirements) {
    assert.match(source, pattern, `missing contract for ${description}`);
  }
}

function firstMatchIndex(source, patterns, description) {
  const indices = patterns
    .map((pattern) => source.search(pattern))
    .filter((index) => index >= 0);
  assert.ok(indices.length > 0, `missing contract for ${description}`);
  return Math.min(...indices);
}

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? walkFiles(path) : [path];
      }),
    )
  ).flat();
}

test("models the literal system before selecting one stable analogy", async () => {
  const skill = await readSkillFile("SKILL.md");
  const body = skill.replace(/^---\n[\s\S]*?\n---\n/u, "");
  const literalModelIndex = firstMatchIndex(
    body,
    [
      /model(?:ing)? the literal (?:topic|system)/iu,
      /literal model(?:ing)? first/iu,
      /build (?:a |the )?literal model/iu,
    ],
    "literal modeling",
  );
  const analogySelectionIndex = firstMatchIndex(
    body,
    [
      /select(?:ing)? (?:a |the )?(?:scenario|analogy)/iu,
      /choos(?:e|ing) (?:(?:a|an|the) )?(?:scenario|analogy)/iu,
      /score (?:candidate )?(?:scenarios|analogies)/iu,
    ],
    "analogy selection",
  );

  assert.ok(
    literalModelIndex < analogySelectionIndex,
    "literal modeling must precede analogy selection",
  );
  assertIncludesAll(skill, [
    [
      "exactly one coherent scenario",
      /(?:exactly |only )?one coherent[\s\S]{0,80}(?:scenario|real-life world|analogy)/iu,
    ],
    [
      "stable mapping ledger",
      /(?:stable|unchanged)[\s\S]{0,100}mapping|mapping ledger/iu,
    ],
    [
      "non-colliding mappings",
      /(?:one-to-one|non-colliding|must not represent unrelated|one analogy element)[\s\S]{0,120}(?:mapping|concept|source)/iu,
    ],
    [
      "material mismatch rejection",
      /(?:mismatch|does not preserve)[\s\S]{0,120}(?:discard|replace|different scenario|boundary)/iu,
    ],
  ]);
});

test("keeps even one requested concept in essential connected context", async () => {
  const skill = await readSkillFile("SKILL.md");

  assertIncludesAll(skill, [
    [
      "single-concept context rule",
      /(?:single|one|only one)[\s\S]{0,100}concept[\s\S]{0,180}(?:connected context|owner|neighbor|input|output|state)/iu,
    ],
    [
      "owners and neighbors",
      /owner(?:s|ship)?[\s\S]{0,100}(?:neighbor|dependency|containment)/iu,
    ],
    ["inputs and outputs", /inputs?[\s\S]{0,80}outputs?/iu],
    [
      "cardinality and lifetime",
      /cardinalit(?:y|ies)[\s\S]{0,100}(?:lifetime|loss consequence)/iu,
    ],
    ["failure consequence", /(?:failure|loss) consequence/iu],
  ]);
});

test("routes visual-first learning by mechanism and progressive scenes", async () => {
  const skill = await readSkillFile("SKILL.md");

  assertIncludesAll(skill, [
    [
      "visual-first delivery",
      /visual[- ]first|lead with (?:the )?(?:visual|interactive)/iu,
    ],
    [
      "relationship mechanism",
      /relationships?[\s\S]{0,100}(?:connected map|dependencies)/iu,
    ],
    [
      "workflow mechanism",
      /workflow[\s\S]{0,100}(?:step-through|sequence|swimlane|handoff)/iu,
    ],
    [
      "structure mechanism",
      /structure[\s\S]{0,120}(?:containment|hierarchy|ownership|tree|exploded)/iu,
    ],
    [
      "state mechanism",
      /states?[\s\S]{0,100}(?:lifecycle|transition|controllable)/iu,
    ],
    [
      "comparison mechanism",
      /(?:comparison|differences?)[\s\S]{0,100}(?:side-by-side|trade-?offs?)/iu,
    ],
    [
      "cause and effect mechanism",
      /cause and effect[\s\S]{0,100}(?:controls?|simulation|exploration)/iu,
    ],
    [
      "combined mechanisms",
      /(?:combined|several|multiple)[\s\S]{0,100}mechanisms?[\s\S]{0,140}(?:ordered|progressive|scenes?)|combine[\s\S]{0,100}ordered treatments?[\s\S]{0,100}mechanisms?/iu,
    ],
    ["scene prerequisites", /scene[\s\S]{0,120}prerequisite/iu],
    ["reused mappings", /(?:reuse|reused)[\s\S]{0,80}mappings?/iu],
    ["small new idea", /(?:one|a)(?: small)? new idea/iu],
    ["learning action or observation", /(?:learner )?(?:action|observation)/iu],
    ["scene takeaway", /takeaway[\s\S]{0,100}(?:later|next) scene/iu],
  ]);
  assert.doesNotMatch(
    skill,
    /(?:concept count|content amount)[\s\S]{0,80}(?:selects?|determines?|chooses?) the visual/iu,
    "visual form must not be selected from concept count or content amount",
  );
});

test("requires meaningful, reversible, and accessible interaction", async () => {
  const skill = await readSkillFile("SKILL.md");

  assertIncludesAll(skill, [
    ["click or tap inspection", /click|tap/iu],
    [
      "meaningful drag",
      /drag[\s\S]{0,140}(?:position|order|containment|ownership|literal meaning)/iu,
    ],
    [
      "control-driven transitions",
      /(?:button|toggle|slider|input)[\s\S]{0,160}(?:transition|branch|causal|state)/iu,
    ],
    [
      "sequence controls",
      /(?:step|back)[\s\S]{0,120}(?:play|pause|replay|reset)/iu,
    ],
    [
      "reversible consequences",
      /(?:consequential interaction|changed state|every interaction)[\s\S]{0,140}(?:reversible|undo|back|reset)/iu,
    ],
    [
      "keyboard alternative to dragging",
      /drag(?:ging)?[\s\S]{0,180}keyboard/iu,
    ],
    ["visible changed state", /changed state[\s\S]{0,100}visible/iu],
    ["assistive announcement", /(?:assistive technolog|live region|announc)/iu],
    [
      "reduced-motion equivalence",
      /reduced motion[\s\S]{0,140}(?:same|equivalent|preserve)[\s\S]{0,80}(?:information|meaning)|(?:same|equivalent)[\s\S]{0,80}(?:information|meaning)[\s\S]{0,100}reduced motion/iu,
    ],
  ]);
});

test("uses a compatible visualizer only as an optional rendering handoff", async () => {
  const [skill, metadata] = await Promise.all([
    readSkillFile("SKILL.md"),
    readSkillFile("agents/openai.yaml"),
  ]);

  assertIncludesAll(skill, [
    [
      "optional compatible visualizer",
      /(?:compatible|available)[\s\S]{0,120}visualization skill|visualiz(?:er|ation skill)[\s\S]{0,120}(?:optional|when available|if available)/iu,
    ],
    ["example visualizer", /\$ptlam-visualization/iu],
    [
      "scenario handoff",
      /(?:pass|handoff|give)[\s\S]{0,180}(?:scenario|mapping ledger)/iu,
    ],
    [
      "scene and interaction handoff",
      /(?:ordered )?scenes?[\s\S]{0,180}(?:interaction|learner action)/iu,
    ],
    [
      "format and language handoff",
      /(?:format|destination)[\s\S]{0,120}language/iu,
    ],
    ["boundary handoff", /analogy boundar(?:y|ies)/iu],
    [
      "renderer owns visual mechanics",
      /visualiz(?:er|ation skill)[\s\S]{0,180}(?:rendering|accessibility|browser validation|format mechanics)/iu,
    ],
    [
      "analogy skill retains semantic ownership",
      /(?:this skill|analogy skill|coordinator|continue to own)[\s\S]{0,180}(?:analogy correctness|scenario fidelity|mapping stability|literal recap)/iu,
    ],
  ]);
  assert.doesNotMatch(
    metadata,
    /^(?:dependencies|required_skills?|requires):/mu,
    "metadata must not declare a hard visualization dependency",
  );
  assert.doesNotMatch(
    skill,
    /(?:always|must|required to) (?:invoke|use|call) \$ptlam-visualization/iu,
    "the example visualizer must not become mandatory",
  );
});

test("defines a complete ordered host-native fallback", async () => {
  const skill = await readSkillFile("SKILL.md");
  const fallbackIndex = firstMatchIndex(
    skill,
    [
      /host-native fallback/iu,
      /(?:without|no) (?:a )?(?:compatible )?visualiz(?:er|ation skill)/iu,
    ],
    "host-native fallback",
  );
  const fallback = skill.slice(fallbackIndex);

  const htmlIndex = firstMatchIndex(
    fallback,
    [/HTML[\s\S]{0,40}CSS[\s\S]{0,40}JavaScript/iu],
    "interactive HTML fallback",
  );
  const mermaidIndex = firstMatchIndex(
    fallback,
    [/Mermaid/iu],
    "Mermaid fallback",
  );
  const nativeVisualIndex = firstMatchIndex(
    fallback,
    [/native visual/iu],
    "other native visual fallback",
  );
  const textFlowIndex = firstMatchIndex(
    fallback,
    [/text (?:tree|flow)|tree or arrow flow|arrow flow/iu],
    "text-flow final fallback",
  );

  assert.ok(
    htmlIndex < mermaidIndex &&
      mermaidIndex < nativeVisualIndex &&
      nativeVisualIndex < textFlowIndex,
    "fallback routes must be ordered from interactive HTML to final text flow",
  );
  assertIncludesAll(fallback, [
    [
      "continued execution",
      /(?:continue|complete|useful)[\s\S]{0,120}(?:without|no)[\s\S]{0,80}(?:visualizer|visualization skill)|(?:without|no)[\s\S]{0,80}(?:visualizer|visualization skill)[\s\S]{0,80}continue|not[\s\S]{0,80}(?:error|tooling detour)/iu,
    ],
    [
      "self validation",
      /(?:create(?:d)? and )?validat(?:e|ed)[\s\S]{0,80}(?:itself|current agent|host-native)|host-native[\s\S]{0,80}created and validated/iu,
    ],
    [
      "scenario preservation",
      /preserve[\s\S]{0,80}(?:one-scenario|single scenario|scenario contract)|complete[\s\S]{0,100}(?:same|one|single) scenario/iu,
    ],
  ]);
});

test("marks analogy limits and ends by reconstructing the literal topic", async () => {
  const skill = await readSkillFile("SKILL.md");

  assertIncludesAll(skill, [
    [
      "material analogy boundaries",
      /(?:analogy boundary|where the analogy stops|material mismatch)/iu,
    ],
    [
      "literal facts remain distinct",
      /(?:exact|literal) (?:facts?|definitions?|values?|constraints?)[\s\S]{0,180}(?:distinct|separate|visibly|preserve|literal)/iu,
    ],
    [
      "compact literal reconstruction",
      /(?:end|finish|final)[\s\S]{0,140}(?:literal recap|literal reconstruction|reconstruct the literal)|compact[\s\S]{0,140}(?:literal|real system)[\s\S]{0,100}(?:reconstruct|flow|paragraph)/iu,
    ],
  ]);
});

test("package stays declarative and contains no visualization engine", async () => {
  const files = (await walkFiles(skillRoot))
    .map((path) => relative(skillRoot, path).split("\\").join("/"))
    .toSorted();

  assert.deepEqual(files, ["SKILL.md", "agents/openai.yaml"]);
  const [skill, metadata] = await Promise.all([
    readSkillFile("SKILL.md"),
    readSkillFile("agents/openai.yaml"),
  ]);
  assert.doesNotMatch(
    `${skill}\n${metadata}`,
    /(?:npm|pnpm|yarn|pip|uv) (?:install|add)|(?:node|python3?) scripts\//iu,
    "the declarative skill must not install or run a bundled engine",
  );
});
