import assert from "node:assert/strict";
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, onTestFinished } from "vitest";
import {
  SkillStatus,
  SkillVisibility,
} from "../../../../tools/plugin-compiler/models/skill.ts";
import {
  checkPluginPublication,
  generatePluginPublication,
  MANAGED_OUTPUT_PATHS,
  PluginPublicationDriftReason,
} from "../../../../tools/plugin-compiler/publication/plugin-publication.ts";
import { installStagedSkillsDirectory } from "../../../../tools/plugin-compiler/publication/publication-filesystem.ts";
import {
  createOutputRoot,
  makeUnsafeMutablePluginSnapshotForPublicationTest,
  readManagedState,
  staleRootReadme,
} from "./test-fixtures/output-repository-fixture.ts";

describe("plugin publication", () => {
  it("generation writes changed outputs and becomes idempotent", async () => {
    // GIVEN: A stale output repository and one validated plugin snapshot exist.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();

    // WHEN: The publication is generated twice.
    const first = await generatePluginPublication({ rootDir, plugin });
    const firstState = await readManagedState(rootDir);
    const second = await generatePluginPublication({ rootDir, plugin });

    // THEN: The first call replaces every output and the second writes nothing.
    assert.deepEqual(first.changedPaths, MANAGED_OUTPUT_PATHS);
    assert.deepEqual(first.unchangedPaths, []);
    assert.deepEqual(second.changedPaths, []);
    assert.deepEqual(second.unchangedPaths, MANAGED_OUTPUT_PATHS);
    assert.deepEqual(await readManagedState(rootDir), firstState);
    const generatedSkills = firstState["skills"];
    assert.ok(generatedSkills && typeof generatedSkills === "object");
    assert.ok(generatedSkills["review-code-change/SKILL.md"]);
    assert.equal(generatedSkills["README.md"], undefined);
  });

  it("check reports deterministic drift without repairing files", async () => {
    // GIVEN: A stale output repository is snapshotted before checking.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    const before = await readManagedState(rootDir);

    // WHEN: Publication freshness is checked twice.
    const first = await checkPluginPublication({ rootDir, plugin });
    const second = await checkPluginPublication({ rootDir, plugin });

    // THEN: Drift is ordered, repeatable, and the repository is untouched.
    assert.deepEqual(first, second);
    assert.deepEqual(first.drift, [
      {
        path: ".claude-plugin/marketplace.json",
        reason: PluginPublicationDriftReason.MissingFile,
      },
      {
        path: ".claude-plugin/plugin.json",
        reason: PluginPublicationDriftReason.MissingFile,
      },
      {
        path: "README.md",
        reason: PluginPublicationDriftReason.ContentDiffers,
      },
      {
        path: "skills/review-code-change",
        reason: PluginPublicationDriftReason.MissingDirectory,
      },
      {
        path: "skills/review-code-change/SKILL.md",
        reason: PluginPublicationDriftReason.MissingFile,
      },
    ]);
    assert.deepEqual(await readManagedState(rootDir), before);
  });

  it("check is current after generation", async () => {
    // GIVEN: Publication outputs were generated from a validated snapshot.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    await generatePluginPublication({ rootDir, plugin });
    const before = await readManagedState(rootDir);

    // WHEN: Freshness is checked.
    const result = await checkPluginPublication({ rootDir, plugin });

    // THEN: The publication is current and remains byte-for-byte unchanged.
    assert.deepEqual(result, { isCurrent: true, drift: [] });
    assert.deepEqual(await readManagedState(rootDir), before);
  });

  it("check reports missing, stale, and unexpected outputs together", async () => {
    // GIVEN: Generated outputs acquire three independent forms of drift.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    await generatePluginPublication({ rootDir, plugin });
    await rm(path.join(rootDir, "README.md"));
    await writeFile(
      path.join(rootDir, ".claude-plugin", "plugin.json"),
      '{"stale":true}\n',
      "utf8",
    );
    const staleSkillPath = path.join(rootDir, "skills", "stale.txt");
    await writeFile(staleSkillPath, "stale\n", "utf8");
    const before = await readManagedState(rootDir);

    // WHEN: Freshness is checked and then generation repairs the publication.
    const stale = await checkPluginPublication({ rootDir, plugin });
    const afterCheck = await readManagedState(rootDir);
    await writeFile(path.join(rootDir, "README.md"), staleRootReadme, "utf8");
    const generated = await generatePluginPublication({ rootDir, plugin });

    // THEN: Check remains read-only and generation owns complete repair.
    assert.deepEqual(stale.drift, [
      {
        path: ".claude-plugin/plugin.json",
        reason: PluginPublicationDriftReason.ContentDiffers,
      },
      { path: "README.md", reason: PluginPublicationDriftReason.MissingFile },
      {
        path: "skills/stale.txt",
        reason: PluginPublicationDriftReason.UnexpectedFile,
      },
    ]);
    assert.deepEqual(afterCheck, before);
    assert.deepEqual(generated.changedPaths, [
      ".claude-plugin/plugin.json",
      "README.md",
      "skills",
    ]);
    await assert.rejects(readFile(staleSkillPath), { code: "ENOENT" });
  });

  it("missing README or rendering failure writes nothing", async () => {
    // GIVEN: One repository lacks README and another lacks managed markers.
    const missingRoot = await createOutputRoot({ missingRootReadme: true });
    const missingBefore = await readManagedState(missingRoot);
    const invalidRoot = await createOutputRoot({
      rootReadme: "# Plugin without managed markers\n",
    });
    const invalidBefore = await readManagedState(invalidRoot);
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();

    // WHEN: Both invalid publications are generated.
    // THEN: Both fail before changing any managed output.
    await assert.rejects(
      generatePluginPublication({ rootDir: missingRoot, plugin }),
      /README\.md: README source file is missing/u,
    );
    await assert.rejects(
      generatePluginPublication({ rootDir: invalidRoot, plugin }),
      /README\.md: missing start marker/u,
    );
    assert.deepEqual(await readManagedState(missingRoot), missingBefore);
    assert.deepEqual(await readManagedState(invalidRoot), invalidBefore);
  });

  it("unsafe output parent and repository-root links are rejected", async () => {
    // GIVEN: One output parent and one repository root are symbolic links.
    const rootDir = await createOutputRoot();
    const externalRoot = await mkdtemp(
      path.join(tmpdir(), "plugin-publication-external-"),
    );
    onTestFinished(() => rm(externalRoot, { force: true, recursive: true }));
    await symlink(externalRoot, path.join(rootDir, ".claude-plugin"), "dir");
    const linkedParent = await mkdtemp(
      path.join(tmpdir(), "plugin-publication-link-"),
    );
    onTestFinished(() => rm(linkedParent, { force: true, recursive: true }));
    const realRoot = await createOutputRoot();
    const linkedRoot = path.join(linkedParent, "repository");
    await symlink(realRoot, linkedRoot, "dir");
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    const rootBefore = await readManagedState(rootDir);
    const linkedBefore = await readManagedState(realRoot);

    // WHEN: Generation targets both unsafe paths.
    // THEN: Both fail before writing inside or outside the repositories.
    await assert.rejects(
      generatePluginPublication({ rootDir, plugin }),
      /managed output path contains symbolic link/u,
    );
    await assert.rejects(
      generatePluginPublication({ rootDir: linkedRoot, plugin }),
      /Repository root must be a real directory/u,
    );
    assert.deepEqual(await readdir(externalRoot), []);
    assert.deepEqual(await readManagedState(rootDir), rootBefore);
    assert.deepEqual(await readManagedState(realRoot), linkedBefore);
  });

  it("generation atomically replaces a stale regular output", async () => {
    // GIVEN: A generated JSON output becomes stale.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    await generatePluginPublication({ rootDir, plugin });
    const pluginPath = path.join(rootDir, ".claude-plugin", "plugin.json");
    await writeFile(pluginPath, '{"stale":true}\n', "utf8");

    // WHEN: Publication is regenerated.
    const result = await generatePluginPublication({ rootDir, plugin });

    // THEN: Only that file changes and no temporary file remains.
    assert.deepEqual(result.changedPaths, [".claude-plugin/plugin.json"]);
    assert.equal(
      JSON.parse(await readFile(pluginPath, "utf8")).name,
      "fixture-skills",
    );
    assert.deepEqual(
      (await readdir(path.dirname(pluginPath))).filter((name) =>
        name.endsWith(".tmp"),
      ),
      [],
    );
  });

  it("a skills staging failure leaves every managed output unchanged", async () => {
    // GIVEN: A later publication contains an unstorable resource path.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    await generatePluginPublication({ rootDir, plugin });
    const before = await readManagedState(rootDir);
    plugin.version = "1.2.4";
    const publishedSkill = plugin.skills[0];
    assert.ok(publishedSkill);
    publishedSkill.resources = [
      {
        path: `references/${"x".repeat(300)}`,
        content: Buffer.from("cannot stage"),
      },
    ];

    // WHEN: Publication generation attempts to stage the invalid path.
    const generation = generatePluginPublication({ rootDir, plugin });

    // THEN: The transaction fails without partial writes or staging residue.
    await assert.rejects(generation, /ENAMETOOLONG|name too long/iu);
    assert.deepEqual(await readManagedState(rootDir), before);
    assert.deepEqual(
      (await readdir(rootDir)).filter((name) =>
        name.startsWith(".plugin-compiler-skills-"),
      ),
      [],
    );
  });

  it("generation preserves dependency context and validates generated links", async () => {
    // GIVEN: One dependency has multiline instructions and a valid resource link.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    plugin.skills.unshift({
      id: "base-skill",
      category_id: "engineering",
      description: "Base rules.",
      visibility: SkillVisibility.Internal,
      status: SkillStatus.Active,
      required_skills: [],
      source_path: "plugin/skills/base-skill",
      source_body: "# Base skill\n\n<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->\n",
      resources: [],
    });
    const publishedSkill = plugin.skills[1];
    assert.ok(publishedSkill);
    publishedSkill.required_skills = [
      {
        skill_id: "base-skill",
        reason: "Provides base rules.",
        instructions: "Apply step one.\nApply step two.",
      },
    ];

    // WHEN: The valid publication is generated, then a broken link is introduced.
    await generatePluginPublication({ rootDir, plugin });
    const generated = await readFile(
      path.join(rootDir, "skills", "review-code-change", "SKILL.md"),
      "utf8",
    );
    const beforeBroken = await readManagedState(rootDir);
    plugin.version = "1.2.4";
    publishedSkill.source_body =
      "# Review\n\n<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->\n\nRead [missing](references/missing.md).\n";
    const broken = generatePluginPublication({ rootDir, plugin });

    // THEN: Context is preserved and broken output never reaches the repository.
    assert.match(
      generated,
      /\*\*Instructions:\*\* Apply step one\.\nApply step two\./u,
    );
    await assert.rejects(
      broken,
      /Generated skills validation failed[\s\S]*local link target does not exist/u,
    );
    assert.deepEqual(await readManagedState(rootDir), beforeBroken);
  });

  it("check detects a missing empty skills directory", async () => {
    // GIVEN: A current publication has no public roots, then its empty skills directory is removed.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    const skill = plugin.skills[0];
    assert.ok(skill);
    skill.visibility = SkillVisibility.Internal;
    await generatePluginPublication({ rootDir, plugin });
    await rm(path.join(rootDir, "skills"), { recursive: true });

    // WHEN: Publication freshness is checked and then repaired.
    const checked = await checkPluginPublication({ rootDir, plugin });
    const generated = await generatePluginPublication({ rootDir, plugin });

    // THEN: Directory existence is drift even when no skill files are expected.
    assert.deepEqual(checked.drift, [
      {
        path: "skills",
        reason: PluginPublicationDriftReason.MissingDirectory,
      },
    ]);
    assert.deepEqual(generated.changedPaths, ["skills"]);
    assert.deepEqual(await readdir(path.join(rootDir, "skills")), []);
  });

  it("check detects and generation removes unexpected empty directories", async () => {
    // GIVEN: A current publication gains an empty directory in its managed tree.
    const rootDir = await createOutputRoot();
    const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
    await generatePluginPublication({ rootDir, plugin });
    const unexpectedPath = path.join(rootDir, "skills", "unexpected", "empty");
    await mkdir(unexpectedPath, { recursive: true });

    // WHEN: Publication freshness is checked and then repaired.
    const checked = await checkPluginPublication({ rootDir, plugin });
    const generated = await generatePluginPublication({ rootDir, plugin });

    // THEN: Empty unmanaged structure creates drift and is removed with the tree.
    assert.deepEqual(checked.drift, [
      {
        path: "skills/unexpected",
        reason: PluginPublicationDriftReason.UnexpectedDirectory,
      },
      {
        path: "skills/unexpected/empty",
        reason: PluginPublicationDriftReason.UnexpectedDirectory,
      },
    ]);
    assert.deepEqual(generated.changedPaths, ["skills"]);
    await assert.rejects(readdir(unexpectedPath), { code: "ENOENT" });
  });

  it("a failed staged-tree install restores the prior managed tree", async () => {
    // GIVEN: The managed tree has prior bytes and the staged tree vanished before install.
    const rootDir = await createOutputRoot();
    const priorPath = path.join(rootDir, "skills", "prior.txt");
    await writeFile(priorPath, "prior bytes\n", "utf8");
    const missingStagedPath = path.join(rootDir, "missing-staged-tree.tmp");

    // WHEN: Installation fails after moving the current tree aside.
    const installation = installStagedSkillsDirectory(
      rootDir,
      missingStagedPath,
    );

    // THEN: The original tree is restored and no backup residue remains.
    await assert.rejects(installation, { code: "ENOENT" });
    assert.equal(await readFile(priorPath, "utf8"), "prior bytes\n");
    assert.deepEqual(
      (await readdir(rootDir)).filter((name) => name.endsWith(".bak")),
      [],
    );
  });

  it.skipIf(process.platform === "win32")(
    "backup cleanup failure remains observable and preserves the prior tree",
    async () => {
      // GIVEN: A current skills tree cannot be recursively removed after replacement.
      const rootDir = await createOutputRoot();
      const plugin = makeUnsafeMutablePluginSnapshotForPublicationTest();
      await generatePluginPublication({ rootDir, plugin });
      const skill = plugin.skills[0];
      assert.ok(skill);
      skill.source_body = `${skill.source_body}\nChanged publication bytes.\n`;
      await chmod(path.join(rootDir, "skills"), 0o500);

      // WHEN: The new tree installs but preserved-backup cleanup is denied.
      const generation = generatePluginPublication({ rootDir, plugin });

      // THEN: The failure is reported and the prior tree remains in a backup.
      await assert.rejects(generation, /failed to remove preserved backup/u);
      const backupName = (await readdir(rootDir)).find((name) =>
        name.endsWith(".bak"),
      );
      assert.ok(backupName);
      const backupPath = path.join(rootDir, backupName);
      await chmod(backupPath, 0o700);
      assert.match(
        await readFile(
          path.join(backupPath, "review-code-change", "SKILL.md"),
          "utf8",
        ),
        /# Review code change/u,
      );
      assert.match(
        await readFile(
          path.join(rootDir, "skills", "review-code-change", "SKILL.md"),
          "utf8",
        ),
        /Changed publication bytes/u,
      );
    },
  );
});
