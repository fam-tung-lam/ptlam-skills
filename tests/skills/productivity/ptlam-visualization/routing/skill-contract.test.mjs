import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const skillRoot = new URL(
  "../../../../../skills/productivity/ptlam-visualization/",
  import.meta.url,
);

const legacyHtmlIdentity = ["ptlam", "visualization", "with", "html"].join("-");
const legacyMermaidIdentity = [
  "ptlam",
  "visualization",
  "with",
  "mermaid",
].join("-");

const readSkillFile = (relativePath) =>
  readFile(new URL(relativePath, skillRoot), "utf8");

const readRepoFile = (relativePath) =>
  readFile(new URL(`../../../../../${relativePath}`, import.meta.url), "utf8");

test("skill exposes one concise unified interface", async () => {
  const skill = await readSkillFile("SKILL.md");
  const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);

  assert.ok(frontmatter, "SKILL.md must start with YAML frontmatter");
  const topLevelKeys = [...frontmatter[1].matchAll(/^([a-z_]+):/gm)].map(
    (match) => match[1],
  );
  assert.deepEqual(topLevelKeys, ["name", "description"]);
  assert.match(frontmatter[1], /^name: ptlam-visualization$/m);
  assert.match(
    frontmatter[1],
    /HTML[\s\S]*Mermaid[\s\S]*PNG\/SVG\/PDF[\s\S]*review surfaces/,
  );
  assert.match(frontmatter[1], /simple[\s\S]*chat/);
  assert.match(frontmatter[1], /requests not to visualize/);
  assert.ok(skill.split("\n").length < 500);
  assert.doesNotMatch(skill, new RegExp(legacyHtmlIdentity));
  assert.doesNotMatch(skill, new RegExp(legacyMermaidIdentity));
});

test("skill directly exposes progressive references and public commands", async () => {
  const skill = await readSkillFile("SKILL.md");
  const implementedReferences = [
    "references/capability-routing.md",
    "references/quality-and-safety.md",
    "references/html/workflow.md",
    "references/html/design-system.md",
    "references/html/quality-and-safety.md",
    "references/mermaid/workflow.md",
    "references/mermaid/output-routing.md",
    "references/mermaid/quality-and-safety.md",
  ];

  for (const resource of implementedReferences) {
    assert.match(skill, new RegExp(resource.replaceAll(".", "\\.")));
    await access(new URL(resource, skillRoot));
  }

  assert.match(skill, /references\/mermaid\/11\.16\.0\/index\.md/);
  for (const command of [
    "scripts/html/scaffold.mjs",
    "scripts/html/validate.mjs",
    "scripts/html/extract-mermaid.mjs",
    "scripts/mermaid/validate.mjs",
    "scripts/mermaid/render.mjs",
  ]) {
    assert.match(skill, new RegExp(command.replaceAll(".", "\\.")));
  }

  assert.match(
    skill,
    /Never read[\s\S]*Mermaid version references[\s\S]*inspect its cache[\s\S]*run its setup[\s\S]*HTML-only request/,
  );
  assert.match(
    skill,
    /visible locked setup only when[\s\S]*needs the active capsule/,
  );
});

test("OpenAI metadata invokes only the unified skill", async () => {
  const metadata = await readSkillFile("agents/openai.yaml");

  assert.match(metadata, /display_name: "PTLam Visualization"/);
  assert.match(
    metadata,
    /short_description: "Create polished HTML and Mermaid visuals"/,
  );
  assert.equal((metadata.match(/\$ptlam-visualization/g) ?? []).length, 1);
  assert.doesNotMatch(metadata, new RegExp(legacyHtmlIdentity));
  assert.doesNotMatch(metadata, new RegExp(legacyMermaidIdentity));
  assert.doesNotMatch(metadata, /icon_|brand_color|dependencies:|policy:/);
});

test("catalog and plugin register one unified active identity", async () => {
  const [pluginSource, rootCatalog, skillCatalog] = await Promise.all([
    readRepoFile(".claude-plugin/plugin.json"),
    readRepoFile("README.md"),
    readRepoFile("skills/README.md"),
  ]);
  const plugin = JSON.parse(pluginSource);

  assert.equal(
    plugin.skills.filter(
      (entry) => entry === "./skills/productivity/ptlam-visualization",
    ).length,
    1,
  );
  assert.ok(
    plugin.skills.every((entry) => !entry.includes(legacyHtmlIdentity)),
  );
  assert.ok(
    plugin.skills.every((entry) => !entry.includes(legacyMermaidIdentity)),
  );
  assert.equal((rootCatalog.match(/`ptlam-visualization`/g) ?? []).length, 1);
  assert.equal((skillCatalog.match(/`ptlam-visualization`/g) ?? []).length, 1);
});
