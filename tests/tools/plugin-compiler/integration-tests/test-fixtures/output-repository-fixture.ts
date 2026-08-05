import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { onTestFinished } from "vitest";
import type { PluginSnapshot } from "../../../../../tools/plugin-compiler/models/plugin.ts";
import { PluginSchemaVersion } from "../../../../../tools/plugin-compiler/models/plugin.ts";
import {
  type SkillRequirement,
  type SkillSnapshot,
  SkillStatus,
  SkillVisibility,
} from "../../../../../tools/plugin-compiler/models/skill.ts";
import { MANAGED_OUTPUT_PATHS } from "../../../../../tools/plugin-compiler/publication/plugin-publication.ts";
import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
} from "../../../../../tools/plugin-compiler/publication/render-plugin-readme.ts";

type Mutable<T> = { -readonly [Property in keyof T]: T[Property] };

export interface UnsafeMutableSkillSnapshot
  extends Omit<Mutable<SkillSnapshot>, "required_skills" | "resources"> {
  required_skills: SkillRequirement[];
  resources: { path: string; content: Buffer }[];
}

export interface UnsafeMutablePluginSnapshot
  extends Omit<Mutable<PluginSnapshot>, "skills"> {
  skills: UnsafeMutableSkillSnapshot[];
}

export interface OutputRootOptions {
  missingRootReadme?: boolean;
  missingSkillsDirectory?: boolean;
  rootReadme?: string;
}

export type ManagedState = Record<
  string,
  string | Record<string, string> | null
>;

export const staleRootReadme =
  `# Fixture catalog\n\nHuman introduction.\n\n${ROOT_README_START_MARKER}\n` +
  `stale root content\n${ROOT_README_END_MARKER}\n\nHuman ending.\n`;

/** Mutable validated-looking input reserved for publication defense tests. */
export function makeUnsafeMutablePluginSnapshotForPublicationTest(): UnsafeMutablePluginSnapshot {
  return {
    schema_version: PluginSchemaVersion.V1,
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
        visibility: SkillVisibility.Public,
        status: SkillStatus.Active,
        required_skills: [],
        source_path: "plugin/skills/review-code-change",
        source_body:
          "# Review code change\n\n<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->\n",
        resources: [],
      },
    ],
  };
}

export async function createOutputRoot(
  options: OutputRootOptions = {},
): Promise<string> {
  const rootDir = await mkdtemp(path.join(tmpdir(), "plugin-output-test-"));
  onTestFinished(() => rm(rootDir, { force: true, recursive: true }));
  if (!options.missingSkillsDirectory) {
    await mkdir(path.join(rootDir, "skills"), { recursive: true });
  }

  if (!options.missingRootReadme) {
    await writeFile(
      path.join(rootDir, "README.md"),
      options.rootReadme ?? staleRootReadme,
      "utf8",
    );
  }
  return rootDir;
}

export async function readManagedState(rootDir: string): Promise<ManagedState> {
  return Object.fromEntries(
    await Promise.all(
      MANAGED_OUTPUT_PATHS.map(async (relativePath) => {
        try {
          if (relativePath !== "skills") {
            return [
              relativePath,
              await readFile(path.join(rootDir, relativePath), "utf8"),
            ] as const;
          }
          const files: Record<string, string> = {};
          async function visit(directory: string, prefix = ""): Promise<void> {
            const entries = await readdir(directory, { withFileTypes: true });
            entries.sort((left, right) =>
              left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
            );
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
          return [relativePath, files] as const;
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            return [relativePath, null] as const;
          }
          throw error;
        }
      }),
    ),
  );
}
