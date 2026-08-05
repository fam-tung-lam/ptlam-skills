import stringWidth from "string-width";

import type { PluginSnapshot } from "../models/plugin.ts";
import { type ManifestSkill, SkillStatus } from "../models/skill.ts";
import { selectPublishedSkills } from "./select-published-skills.ts";

export const ROOT_README_START_MARKER =
  "<!-- BEGIN GENERATED:PLUGIN-CATALOG:SKILLS -->";
export const ROOT_README_END_MARKER =
  "<!-- END GENERATED:PLUGIN-CATALOG:SKILLS -->";

const MANAGED_CATALOG_MARKER_PATTERN =
  /<!-- (?:BEGIN|END) GENERATED:PLUGIN-CATALOG:[^>]+-->/;

function markdownCell(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(normalized)) {
    throw new Error(
      "Markdown table cells must not contain control, format, or surrogate characters",
    );
  }

  return normalized.replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}

function renderMarkdownTable(headers: string[], rows: string[][]): string {
  const cells = [headers, ...rows].map((row) => row.map(markdownCell));
  const widths = headers.map((_, column) =>
    Math.max(3, ...cells.map((row) => stringWidth(row[column] ?? ""))),
  );
  const renderRow = (row: string[]): string =>
    `| ${row
      .map(
        (cell, column) =>
          `${cell}${" ".repeat((widths[column] ?? 0) - stringWidth(cell))}`,
      )
      .join(" | ")} |`;

  const headerRow = cells[0];
  if (headerRow === undefined) throw new Error("Markdown table needs headers");

  return [
    renderRow(headerRow),
    `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`,
    ...cells.slice(1).map(renderRow),
  ].join("\n");
}

function countOccurrences(text: string, marker: string): number {
  let count = 0;
  let cursor = 0;

  while (true) {
    const index = text.indexOf(marker, cursor);
    if (index === -1) return count;
    count += 1;
    cursor = index + marker.length;
  }
}

function replaceManagedRegion(
  text: string,
  startMarker: string,
  endMarker: string,
  content: string,
  label: string,
): string {
  const startCount = countOccurrences(text, startMarker);
  const endCount = countOccurrences(text, endMarker);

  if (startCount === 0) {
    throw new Error(`${label}: missing start marker ${startMarker}`);
  }
  if (endCount === 0) {
    throw new Error(`${label}: missing end marker ${endMarker}`);
  }
  if (startCount !== 1) {
    throw new Error(`${label}: duplicate start marker ${startMarker}`);
  }
  if (endCount !== 1) {
    throw new Error(`${label}: duplicate end marker ${endMarker}`);
  }

  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker);
  if (endIndex < startIndex) {
    throw new Error(`${label}: managed markers are reversed`);
  }

  const contentStart = startIndex + startMarker.length;
  const existingContent = text.slice(contentStart, endIndex);
  if (MANAGED_CATALOG_MARKER_PATTERN.test(existingContent)) {
    throw new Error(`${label}: managed markers must not be nested`);
  }
  if (MANAGED_CATALOG_MARKER_PATTERN.test(content)) {
    throw new Error(`${label}: generated content contains a reserved marker`);
  }

  return `${text.slice(0, contentStart)}\n\n${content}\n\n${text.slice(endIndex)}`;
}

function requireCategoryName(
  categoryNames: ReadonlyMap<string, string>,
  skill: ManifestSkill,
): string {
  const categoryName = categoryNames.get(skill.category_id);
  if (categoryName === undefined) {
    throw new Error(`Skill ${skill.id} references an unknown category`);
  }
  return categoryName;
}

function renderRootCatalogSection(
  plugin: PluginSnapshot,
  publishedSkills: readonly ManifestSkill[],
): string {
  const categoryNames = new Map(
    plugin.categories.map((category) => [category.id, category.name]),
  );
  const rows = publishedSkills.map((skill) => {
    const deprecated = skill.status === SkillStatus.Deprecated;
    if (deprecated && skill.deprecation === undefined) {
      throw new Error(
        `Deprecated skill ${skill.id} has no deprecation metadata`,
      );
    }
    const status = deprecated
      ? `Deprecated — ${skill.deprecation?.reason} ${skill.deprecation?.instructions}`
      : "Active";
    const replacement = skill.deprecation?.replacement_skill_id
      ? `\`${skill.deprecation.replacement_skill_id}\``
      : "—";

    return [
      `\`${skill.id}\``,
      requireCategoryName(categoryNames, skill),
      skill.description,
      status,
      replacement,
    ];
  });

  return [
    "## Available skills",
    "",
    renderMarkdownTable(
      ["Skill", "Category", "Description", "Status", "Replacement"],
      rows,
    ),
  ].join("\n");
}

/** Render the complete README while preserving bytes outside its managed region. */
export function renderPluginReadme({
  plugin,
  rootReadme,
}: {
  readonly plugin: PluginSnapshot;
  readonly rootReadme: string;
}): string {
  return replaceManagedRegion(
    rootReadme,
    ROOT_README_START_MARKER,
    ROOT_README_END_MARKER,
    renderRootCatalogSection(plugin, selectPublishedSkills(plugin.skills)),
    "README.md",
  );
}
