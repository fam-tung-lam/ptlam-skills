import { format } from "prettier";

import type { PluginSnapshot } from "../models/plugin.ts";
import {
  type ComposedSkillEntry,
  composePublishedSkills,
} from "./compose-published-skills.ts";
import { renderClaudePluginArtifacts } from "./render-claude-plugin.ts";
import {
  ROOT_README_END_MARKER,
  ROOT_README_START_MARKER,
  renderPluginReadme,
} from "./render-plugin-readme.ts";

export const MANAGED_OUTPUT_PATHS = Object.freeze([
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  "README.md",
  "skills",
]);

const OUTSIDE_SKILLS_PATHS = MANAGED_OUTPUT_PATHS.slice(0, 3);
const EMPTY_ROOT_README = `${ROOT_README_START_MARKER}\n${ROOT_README_END_MARKER}`;

export interface ExpectedPublication {
  readonly files: ReadonlyMap<string, Buffer>;
  readonly directories: ReadonlySet<string>;
}

async function formatComposedSkill(content: string): Promise<string> {
  const closing = "\n---\n";
  const closingIndex = content.indexOf(closing, 4);
  if (!content.startsWith("---\n") || closingIndex === -1) {
    throw new Error("Composed SKILL.md is missing generated frontmatter");
  }
  const formattedFrontmatter = await format(content.slice(4, closingIndex), {
    parser: "yaml",
    proseWrap: "always",
  });
  return `---\n${formattedFrontmatter}---\n${content.slice(
    closingIndex + closing.length,
  )}`;
}

async function normalizeComposedEntry(
  entry: ComposedSkillEntry,
): Promise<readonly [string, Buffer]> {
  const content =
    entry.path.endsWith("/SKILL.md") && typeof entry.content === "string"
      ? await formatComposedSkill(entry.content)
      : entry.content;
  return [entry.path, Buffer.from(content)] as const;
}

function collectPublicationDirectories(
  filePaths: Iterable<string>,
): ReadonlySet<string> {
  const directories = new Set<string>(["skills"]);
  for (const filePath of filePaths) {
    if (!filePath.startsWith("skills/")) continue;
    let directory = filePath.slice(0, filePath.lastIndexOf("/"));
    while (directory.startsWith("skills/")) {
      directories.add(directory);
      directory = directory.slice(0, directory.lastIndexOf("/"));
    }
  }
  return new Set(
    [...directories].sort((left, right) =>
      left < right ? -1 : left > right ? 1 : 0,
    ),
  );
}

/** Build the canonical bytes and required directories for one publication. */
export async function createExpectedPublication({
  plugin,
  rootReadme,
}: {
  readonly plugin: PluginSnapshot;
  readonly rootReadme: Buffer | null;
}): Promise<ExpectedPublication> {
  const composed = composePublishedSkills({ plugin });
  const composedFiles = await Promise.all(
    composed.entries.map(normalizeComposedEntry),
  );
  const claude = renderClaudePluginArtifacts({ plugin });
  const renderedReadme = renderPluginReadme({
    plugin,
    rootReadme: (rootReadme ?? Buffer.from(EMPTY_ROOT_README)).toString("utf8"),
  });
  const files = new Map<string, Buffer>([
    [".claude-plugin/plugin.json", Buffer.from(claude.pluginJson, "utf8")],
    [
      ".claude-plugin/marketplace.json",
      Buffer.from(claude.marketplaceJson, "utf8"),
    ],
    ["README.md", Buffer.from(renderedReadme, "utf8")],
    ...composedFiles,
  ]);

  return {
    files,
    directories: collectPublicationDirectories(files.keys()),
  };
}

export { OUTSIDE_SKILLS_PATHS };
