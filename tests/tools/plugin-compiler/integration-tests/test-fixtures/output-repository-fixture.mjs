import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  SKILLS_README_END_MARKER,
  SKILLS_README_START_MARKER,
} from "../../../../../tools/plugin-compiler/helpers/update-plugin-readme.mjs";
import { MANAGED_OUTPUT_PATHS } from "../../../../../tools/plugin-compiler/plugin-generator.mjs";

export const staleRootReadme =
  `# Fixture catalog\n\nHuman introduction.\n\n${ROOT_README_START_MARKER}\n` +
  `stale root content\n${ROOT_README_END_MARKER}\n\nHuman ending.\n`;

export const staleSkillsReadme =
  `# Skills\n\n${SKILLS_README_START_MARKER}\n` +
  `stale category content\n${SKILLS_README_END_MARKER}\n\nHuman ending.\n`;

export function makeOutputPlugin() {
  return {
    schema_version: 2,
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
        name: "Engineering",
        description: "Engineering skills.",
      },
      {
        id: "productivity",
        name: "Productivity",
        description: "Productivity skills.",
      },
      { id: "empty", name: "Empty", description: "Reserved category." },
    ],
    skills: [
      {
        id: "review-code-change",
        category_id: "engineering",
        description: "Review changes safely.",
        visibility: "public",
        status: "active",
        required_skills: [],
        source_body:
          "# Review code change\n\n<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->\n",
        resources: [],
      },
    ],
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
          if (relativePath !== "skills") {
            return [
              relativePath,
              await readFile(path.join(rootDir, relativePath), "utf8"),
            ];
          }
          const files = {};
          async function visit(directory, prefix = "") {
            const entries = await readdir(directory, { withFileTypes: true });
            entries.sort((left, right) => left.name.localeCompare(right.name));
            for (const entry of entries) {
              const entryPath = path.join(directory, entry.name);
              const relativeEntry = prefix
                ? `${prefix}/${entry.name}`
                : entry.name;
              if (entry.isDirectory()) await visit(entryPath, relativeEntry);
              else files[relativeEntry] = await readFile(entryPath, "base64");
            }
          }
          await visit(path.join(rootDir, relativePath));
          return [relativePath, files];
        } catch (error) {
          if (error.code === "ENOENT") return [relativePath, null];
          throw error;
        }
      }),
    ),
  );
}
