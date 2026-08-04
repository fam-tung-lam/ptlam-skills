import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  SKILLS_README_END_MARKER,
  SKILLS_README_START_MARKER,
} from "../../../tools/plugin-compiler/output_updaters/update_plugin_readme.mjs";
import { MANAGED_OUTPUT_PATHS } from "../../../tools/plugin-compiler/plugin_generator.mjs";

export const staleRootReadme =
  `# Fixture catalog\n\nHuman introduction.\n\n${ROOT_README_START_MARKER}\n` +
  `stale root content\n${ROOT_README_END_MARKER}\n\nHuman ending.\n`;

export const staleSkillsReadme =
  `# Skills\n\n${SKILLS_README_START_MARKER}\n` +
  `stale category content\n${SKILLS_README_END_MARKER}\n\nHuman ending.\n`;

export function makeOutputPlugin() {
  return {
    schema_version: 1,
    metadata: {
      name: "fixture-skills",
      version: "1.2.3",
      description: "Fixture plugin description.",
      author: {
        name: "Fixture Owner",
        email: "owner@example.test",
        url: "https://example.test",
      },
      homepage: "https://example.test/readme",
      repository: "https://example.test/repository",
      license: "MIT",
      keywords: ["agent-skills", "fixtures"],
    },
    marketplace: {
      name: "fixture",
      description: "Fixture marketplace.",
      plugin_description: "Installable fixture skills.",
      category: "development",
      keywords: ["agent-skills", "testing"],
    },
    categories: [
      {
        id: "engineering",
        title: "Engineering",
        description: "Engineering skills.",
      },
      {
        id: "productivity",
        title: "Productivity",
        description: "Productivity skills.",
      },
      { id: "empty", title: "Empty", description: "Reserved category." },
    ],
    skills: [
      {
        id: "test-review-change",
        category_id: "engineering",
        kind: "test",
        summary: "Review a small change.",
        required_skill_ids: [],
        path: "skills/engineering/test-review-change",
        frontmatter: {
          name: "test-review-change",
          description: "Review changes safely.",
        },
      },
      {
        id: "plan-task",
        category_id: "productivity",
        kind: "test",
        summary: "Turn one goal into a plan.",
        required_skill_ids: [],
        path: "skills/productivity/plan-task",
        frontmatter: {
          name: "plan-task",
          description: "Plan work.",
        },
      },
      {
        id: "visualize-html",
        category_id: "productivity",
        kind: "product",
        summary: "Create a polished HTML artifact.",
        required_skill_ids: ["test-review-change"],
        path: "skills/productivity/visualize-html",
        frontmatter: {
          name: "visualize-html",
          description: "Create HTML artifacts.",
        },
      },
    ],
  };
}

export function makeValidator(plugin = makeOutputPlugin()) {
  const calls = [];

  return {
    calls,
    async validatePlugin(request) {
      calls.push(request);
      return { plugin, diagnostics: [] };
    },
  };
}

export async function createOutputRoot(t, options = {}) {
  const rootDir = await mkdtemp(path.join(tmpdir(), "plugin-output-test-"));
  t.after(() => rm(rootDir, { force: true, recursive: true }));
  await mkdir(path.join(rootDir, "skills"), { recursive: true });

  if (!options.missingRootReadme) {
    await writeFile(
      path.join(rootDir, "README.md"),
      options.rootReadme ?? staleRootReadme,
      "utf8",
    );
  }
  if (!options.missingSkillsReadme) {
    await writeFile(
      path.join(rootDir, "skills", "README.md"),
      options.skillsReadme ?? staleSkillsReadme,
      "utf8",
    );
  }

  return rootDir;
}

export async function readManagedState(rootDir) {
  return Object.fromEntries(
    await Promise.all(
      MANAGED_OUTPUT_PATHS.map(async (relativePath) => {
        try {
          return [
            relativePath,
            await readFile(path.join(rootDir, relativePath), "utf8"),
          ];
        } catch (error) {
          if (error.code === "ENOENT") return [relativePath, null];
          throw error;
        }
      }),
    ),
  );
}
