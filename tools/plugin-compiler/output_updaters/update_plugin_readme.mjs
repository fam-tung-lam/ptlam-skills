import stringWidth from "string-width";

export const ROOT_README_START_MARKER =
  "<!-- BEGIN GENERATED:PLUGIN-CATALOG:SKILLS -->";
export const ROOT_README_END_MARKER =
  "<!-- END GENERATED:PLUGIN-CATALOG:SKILLS -->";
export const SKILLS_README_START_MARKER =
  "<!-- BEGIN GENERATED:PLUGIN-CATALOG:CATEGORIES -->";
export const SKILLS_README_END_MARKER =
  "<!-- END GENERATED:PLUGIN-CATALOG:CATEGORIES -->";

const MANAGED_MARKER_PATTERN =
  /<!-- (?:BEGIN|END) GENERATED:PLUGIN-CATALOG:[^>]+-->/;

const TEST_COLLECTION_EXPLANATION =
  "The test skills are intentionally simple. They verify collection discovery,\n" +
  "installation, metadata, and invocation independently from the available skills.";

function markdownCell(value) {
  const normalized = String(value).replace(/\s+/gu, " ").trim();
  if (/[\p{Cc}\p{Cf}\p{Cs}]/u.test(normalized)) {
    throw new Error(
      "Markdown table cells must not contain control, format, or surrogate characters",
    );
  }

  return normalized.replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}

function renderMarkdownTable(headers, rows) {
  const cells = [headers, ...rows].map((row) => row.map(markdownCell));
  const widths = headers.map((_, column) =>
    Math.max(3, ...cells.map((row) => stringWidth(row[column]))),
  );
  const renderRow = (row) =>
    `| ${row
      .map(
        (cell, column) =>
          `${cell}${" ".repeat(widths[column] - stringWidth(cell))}`,
      )
      .join(" | ")} |`;

  return [
    renderRow(cells[0]),
    `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`,
    ...cells.slice(1).map(renderRow),
  ].join("\n");
}

function countOccurrences(text, marker) {
  let count = 0;
  let cursor = 0;

  while (true) {
    const index = text.indexOf(marker, cursor);
    if (index === -1) return count;
    count += 1;
    cursor = index + marker.length;
  }
}

function replaceManagedRegion(text, startMarker, endMarker, content, label) {
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
  if (MANAGED_MARKER_PATTERN.test(existingContent)) {
    throw new Error(`${label}: managed markers must not be nested`);
  }
  if (MANAGED_MARKER_PATTERN.test(content)) {
    throw new Error(`${label}: generated content contains a reserved marker`);
  }

  return `${text.slice(0, contentStart)}\n\n${content}\n\n${text.slice(endIndex)}`;
}

function renderRootCatalogSection(plugin) {
  const categoryTitles = new Map(
    plugin.categories.map((category) => [category.id, category.title]),
  );
  const skillRows = (kind) =>
    plugin.skills
      .filter((skill) => skill.kind === kind)
      .map((skill) => [
        `\`${skill.id}\``,
        categoryTitles.get(skill.category_id),
        skill.summary,
      ]);

  return [
    "## Available skills",
    "",
    renderMarkdownTable(["Skill", "Category", "Purpose"], skillRows("product")),
    "",
    "## Test collection",
    "",
    renderMarkdownTable(["Skill", "Category", "Purpose"], skillRows("test")),
    "",
    TEST_COLLECTION_EXPLANATION,
  ].join("\n");
}

function renderCategorySection(plugin) {
  const rows = plugin.categories.map((category) => {
    const skills = plugin.skills
      .filter((skill) => skill.category_id === category.id)
      .toSorted((left, right) => {
        if (left.kind === right.kind) return 0;
        return left.kind === "product" ? -1 : 1;
      })
      .map((skill) => `\`${skill.id}\``);

    return [`\`${category.id}\``, skills.length > 0 ? skills.join(", ") : "—"];
  });

  return [
    "## Initial categories",
    "",
    renderMarkdownTable(["Category", "Skills"], rows),
  ].join("\n");
}

/**
 * Update only the two marker-bounded README regions.
 * This updater is pure: bytes outside each region are preserved exactly.
 *
 * @param {{ plugin: object, rootReadme: string, skillsReadme: string }} request
 * @returns {{ rootReadme: string, skillsReadme: string }}
 */
export function updatePluginReadme({ plugin, rootReadme, skillsReadme }) {
  return {
    rootReadme: replaceManagedRegion(
      rootReadme,
      ROOT_README_START_MARKER,
      ROOT_README_END_MARKER,
      renderRootCatalogSection(plugin),
      "README.md",
    ),
    skillsReadme: replaceManagedRegion(
      skillsReadme,
      SKILLS_README_START_MARKER,
      SKILLS_README_END_MARKER,
      renderCategorySection(plugin),
      "skills/README.md",
    ),
  };
}
