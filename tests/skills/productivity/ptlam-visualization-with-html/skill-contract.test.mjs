import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skillRoot = new URL(
  "../../../../skills/productivity/ptlam-visualization-with-html/",
  import.meta.url,
);

async function readRepoFile(relativePath) {
  return readFile(new URL(`../../../../${relativePath}`, import.meta.url), "utf8");
}

test("skill exposes the hybrid trigger and direct resource interfaces", async () => {
  const skill = await readFile(new URL("SKILL.md", skillRoot), "utf8");

  assert.match(skill, /^name: ptlam-visualization-with-html$/m);
  assert.match(skill, /explicitly asks[\s\S]*automatically when visual/);
  assert.match(skill, /keep simple answers[\s\S]*in chat/);

  for (const resource of [
    "references/visualization.md",
    "references/design-system.md",
    "references/quality-and-safety.md",
    "scripts/scaffold.mjs",
    "scripts/validate.mjs",
  ]) {
    assert.match(skill, new RegExp(resource.replaceAll(".", "\\.")));
  }

  assert.match(skill, /default system browser first/);
  assert.match(skill, /never overwrite an unrelated file/i);
  assert.match(skill, /never upload or publish them in v1/i);
});

test("OpenAI metadata is concise and invokes the named skill", async () => {
  const metadata = await readFile(
    new URL("agents/openai.yaml", skillRoot),
    "utf8",
  );

  assert.match(metadata, /display_name: "PTLam Visualization with HTML"/);
  assert.match(
    metadata,
    /short_description: "Create polished interactive HTML artifacts"/,
  );
  assert.match(metadata, /default_prompt: "Use \$ptlam-visualization-with-html /);
  assert.doesNotMatch(metadata, /icon_|brand_color|dependencies:|policy:/);
});

test("catalog and Claude plugin register the promoted skill", async () => {
  const [pluginSource, rootCatalog, skillCatalog] = await Promise.all([
    readRepoFile(".claude-plugin/plugin.json"),
    readRepoFile("README.md"),
    readRepoFile("skills/README.md"),
  ]);
  const plugin = JSON.parse(pluginSource);

  assert.equal(
    plugin.skills.filter(
      (entry) => entry === "./skills/productivity/ptlam-visualization-with-html",
    ).length,
    1,
  );
  assert.match(rootCatalog, /## Available skills[\s\S]*`ptlam-visualization-with-html`/);
  assert.match(skillCatalog, /`productivity`[^\n]*`ptlam-visualization-with-html`/);
});
