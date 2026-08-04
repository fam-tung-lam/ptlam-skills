import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const repoRoot = new URL("../../../../", import.meta.url);
const skillRoot = new URL("skills/engineering/ptlam-testing/", repoRoot);

const readRepoFile = (path) => readFile(new URL(path, repoRoot), "utf8");

test("skill metadata and catalogs expose ptlam-testing portably", async () => {
  // Given
  const [skill, pluginSource, rootCatalog, skillCatalog] = await Promise.all([
    readFile(new URL("SKILL.md", skillRoot), "utf8"),
    readRepoFile(".claude-plugin/plugin.json"),
    readRepoFile("README.md"),
    readRepoFile("skills/README.md"),
  ]);

  // When
  const plugin = JSON.parse(pluginSource);

  // Then
  assert.match(skill, /Use when an agent needs to select a test/);
  assert.doesNotMatch(skill, /Use when Codex needs/);
  assert.equal(
    plugin.skills.filter(
      (entry) => entry === "./skills/engineering/ptlam-testing",
    ).length,
    1,
  );
  assert.match(rootCatalog, /## Available skills[\s\S]*`ptlam-testing`/);
  assert.match(skillCatalog, /`engineering`[^\n]*`ptlam-testing`/);
});

test("mandatory testing invariants outrank repository mechanics", async () => {
  // Given
  const skill = await readFile(new URL("SKILL.md", skillRoot), "utf8");

  // When
  const invariants = skill.match(
    /Apply these mandatory invariants[\s\S]*?Resolve only implementation mechanics/,
  )?.[0];

  // Then
  assert.ok(invariants);
  assert.match(invariants, /Given-When-Then in every test/);
  assert.match(invariants, /mirror corresponding source placement/);
  assert.match(invariants, /nearest common test scope/);
  assert.match(invariants, /keep audit mode read-only/);
  assert.match(invariants, /activate TDD only/);
  assert.match(invariants, /cannot override these invariants/);
  assert.match(
    skill,
    /Resolve only implementation mechanics[^\n]*in this\n   order/,
  );
});

test("environment resolution requires an established viable toolchain", async () => {
  // Given
  const [skill, workflow] = await Promise.all([
    readFile(new URL("SKILL.md", skillRoot), "utf8"),
    readFile(
      new URL("references/workflows/resolve-testing-environment.md", skillRoot),
      "utf8",
    ),
  ]);

  // When
  const resolutionRule = skill.match(
    /Follow the testing-environment workflow[\s\S]*?repository policy\./,
  )?.[0];

  // Then
  assert.ok(resolutionRule);
  assert.match(resolutionRule, /both unambiguous and\n   currently viable/);
  assert.match(resolutionRule, /maintenance suitability/);
  assert.match(workflow, /unless repository evidence[\s\S]*currently\nviable/);
  assert.match(workflow, /installed versions remain\n  compatible/);
  assert.match(workflow, /maintenance state remains suitable/);
});

test("skill package contains no fixed technology catalogs or dated snapshot", async () => {
  // Given
  const packageEntries = await readdir(skillRoot, { recursive: true });
  const textEntries = packageEntries.filter((entry) =>
    /\.(?:md|ya?ml)$/.test(entry),
  );

  // When
  const packageText = (
    await Promise.all(
      textEntries.map((entry) => readFile(new URL(entry, skillRoot), "utf8")),
    )
  ).join("\n");

  // Then
  assert.equal(
    packageEntries.some((entry) =>
      /(?:^|\/)(?:targets|test-tools)(?:\/|$)/.test(entry),
    ),
    false,
  );
  assert.doesNotMatch(
    packageText,
    /Flutter|Dart|Mockito|bloc_test|integration_test|references\/(?:targets|test-tools)/i,
  );
  await assert.rejects(
    readRepoFile("docs/research/flutter-testing-2026.md"),
    (error) => error.code === "ENOENT",
  );
});

test("universal level, placement, doubles, audit, and TDD rules remain reusable", async () => {
  // Given
  const [skill, unit, integration, endToEnd, doubles, tdd] = await Promise.all([
    readFile(new URL("SKILL.md", skillRoot), "utf8"),
    readFile(new URL("references/test-levels/unit.md", skillRoot), "utf8"),
    readFile(
      new URL("references/test-levels/integration.md", skillRoot),
      "utf8",
    ),
    readFile(new URL("references/test-levels/e2e.md", skillRoot), "utf8"),
    readFile(new URL("references/patterns/test-doubles.md", skillRoot), "utf8"),
    readFile(
      new URL("references/workflows/test-driven-development.md", skillRoot),
      "utf8",
    ),
  ]);

  // When
  const guidance = [unit, integration, endToEnd].join("\n");

  // Then
  assert.match(
    skill,
    /mirror the source file's\n  relative directory and filename/,
  );
  assert.match(skill, /request to check, audit, or review tests as read-only/);
  assert.match(guidance, /public interface/);
  assert.match(guidance, /public\s+entry point/);
  assert.match(guidance, /user-visible entry point/);
  assert.match(doubles, /smallest scope containing every test that uses it/);
  assert.match(doubles, /nearest common test directory/);
  assert.match(tdd, /only when the user explicitly requests TDD/);
  assert.match(
    tdd,
    /\*\*Red\*\*:[\s\S]*\*\*Green\*\*:[\s\S]*\*\*Refactor\*\*:/,
  );
});

test("tool research uses current primary sources and the full compatibility rubric", async () => {
  // Given
  const [skill, workflow] = await Promise.all([
    readFile(new URL("SKILL.md", skillRoot), "utf8"),
    readFile(
      new URL("references/workflows/resolve-testing-environment.md", skillRoot),
      "utf8",
    ),
  ]);

  // When
  const research = workflow.match(
    /## Research a missing or unsuitable tool[\s\S]*?## Recommend and apply/,
  )?.[0];

  // Then
  assert.ok(research);
  assert.match(
    research,
    /verify every current\n   claim against official SDK documentation/,
  );
  assert.match(research, /primary package documentation/);
  assert.match(research, /required unit, integration, and end-to-end risks/);
  assert.match(research, /Given-When-Then support/);
  assert.match(
    research,
    /public-seam testing, async behavior, isolation, determinism, and cleanup/,
  );
  assert.match(research, /mocking and test-double needs/);
  assert.match(
    research,
    /runner, IDE, CI, reporting, and platform integration/,
  );
  assert.match(
    research,
    /maintenance status, release compatibility, documentation quality, license,\s+and repository dependency policy/,
  );
  assert.match(
    skill,
    /official tool guidance refine syntax[\s\S]*never silently replace/,
  );
  assert.match(
    workflow,
    /official tool guidance refine implementation mechanics only/,
  );
});

test("project testing profiles resolve independently from installation and cwd", async () => {
  // Given
  const [skill, profileWorkflow, environmentWorkflow] = await Promise.all([
    readFile(new URL("SKILL.md", skillRoot), "utf8"),
    readFile(
      new URL(
        "references/workflows/resolve-project-testing-profile.md",
        skillRoot,
      ),
      "utf8",
    ),
    readFile(
      new URL("references/workflows/resolve-testing-environment.md", skillRoot),
      "utf8",
    ),
  ]);

  // When
  const rootResolution = profileWorkflow.match(
    /## Resolve project roots[\s\S]*?## Load or initialize the profile/,
  )?.[0];

  // Then
  assert.ok(rootResolution);
  assert.match(skill, /Do not assume that the skill installation directory/);
  assert.match(skill, /resolve-project-testing-profile\.md/);
  assert.match(
    profileWorkflow,
    /<project-root>\/\.ptlam-skills\/skills\/engineering\/ptlam-testing\//,
  );
  assert.match(profileWorkflow, /installation\nlocation is irrelevant/);
  assert.match(rootResolution, /walk upward to the relevant Git or build/);
  assert.match(rootResolution, /bounded set of nearby candidate roots/);
  assert.match(rootResolution, /Never\n   recursively scan the entire home/);
  assert.match(rootResolution, /multiple roots remain plausible/);
  assert.match(rootResolution, /Keep profiles for multiple projects separate/);
  assert.match(environmentWorkflow, /profile, when one\n   exists/);
});

test("project profile lifecycle preserves audit and repository VCS policy", async () => {
  // Given
  const [skill, profileWorkflow, environmentWorkflow] = await Promise.all([
    readFile(new URL("SKILL.md", skillRoot), "utf8"),
    readFile(
      new URL(
        "references/workflows/resolve-project-testing-profile.md",
        skillRoot,
      ),
      "utf8",
    ),
    readFile(
      new URL("references/workflows/resolve-testing-environment.md", skillRoot),
      "utf8",
    ),
  ]);

  // When
  const vcsPolicy = profileWorkflow.match(
    /## Preserve mode and VCS policy[\s\S]*?## Feed environment resolution and report/,
  )?.[0];

  // Then
  assert.ok(vcsPolicy);
  assert.match(
    skill,
    /project testing profile:[\s\S]*without creating or updating/,
  );
  assert.match(
    profileWorkflow,
    /In audit mode, do not create or update the profile/,
  );
  assert.match(profileWorkflow, /write, fix, or explicit TDD mode/);
  assert.match(vcsPolicy, /already tracked, update it as normal project state/);
  assert.match(vcsPolicy, /If it is\n  ignored, keep it local/);
  assert.match(vcsPolicy, /untracked and not ignored, leave it untracked/);
  assert.match(
    vcsPolicy,
    /Never edit `\.gitignore`, stage files, or create a commit/,
  );
  assert.match(
    vcsPolicy,
    /Never store secrets, credentials, transient command logs/,
  );
  assert.match(vcsPolicy, /machine-specific\n  absolute paths/);
  assert.match(
    environmentWorkflow,
    /In audit mode, only report suggested profile/,
  );
});

test("project profile contract is progressive, capability-based, and freshness-aware", async () => {
  // Given
  const profileWorkflow = await readFile(
    new URL(
      "references/workflows/resolve-project-testing-profile.md",
      skillRoot,
    ),
    "utf8",
  );

  // When
  const structure = profileWorkflow.match(
    /## Use the canonical structure[\s\S]*?## Define testing contexts/,
  )?.[0];
  const contexts = profileWorkflow.match(
    /## Define testing contexts[\s\S]*?## Record durable knowledge/,
  )?.[0];

  // Then
  assert.ok(structure);
  assert.ok(contexts);
  assert.match(
    structure,
    /`profile\.md` is required only when a project profile exists/,
  );
  assert.match(
    structure,
    /Do\nnot create empty directories or placeholder files/,
  );
  assert.match(structure, /Do not add `SKILL\.md` or\n`README\.md`/);
  assert.match(structure, /schema_version: 1/);
  assert.match(structure, /canonical_path: skills\/engineering\/ptlam-testing/);
  assert.match(structure, /compact frontmatter in every linked Markdown file/);
  assert.match(
    structure,
    /map relative project paths to\nthe relevant testing contexts/,
  );
  assert.match(
    contexts,
    /independently testable execution environment or capability/,
  );
  assert.match(contexts, /test roots, commands, or CI jobs/);
  assert.match(
    contexts,
    /Do not split solely because[\s\S]*packages, languages,/,
  );
  assert.match(contexts, /stable capability-oriented identifiers/);
  assert.match(
    profileWorkflow,
    /research\/<YYYY-MM-DD>-<topic>\.md[\s\S]*sources were verified/,
  );
  assert.match(profileWorkflow, /decisions\/<YYYY-MM-DD>-<decision>\.md/);
  assert.match(profileWorkflow, /profile is a\s+verified cache/);
  assert.match(profileWorkflow, /Dates are freshness signals, not proof/);
  assert.match(profileWorkflow, /stable storage\ncontract/);
  assert.match(
    profileWorkflow,
    /retain a read fallback and provide an explicit migration/,
  );
  assert.match(
    profileWorkflow,
    /Remove the superseded snapshot unless its history/,
  );
});
