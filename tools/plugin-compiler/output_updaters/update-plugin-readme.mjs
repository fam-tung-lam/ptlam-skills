import stringWidth from "string-width";

/** @type {"<!-- BEGIN GENERATED:PLUGIN-CATALOG:SKILLS -->"} Start of the managed root README catalog region. */
export const ROOT_README_START_MARKER =
  "<!-- BEGIN GENERATED:PLUGIN-CATALOG:SKILLS -->";
/** @type {"<!-- END GENERATED:PLUGIN-CATALOG:SKILLS -->"} End of the managed root README catalog region. */
export const ROOT_README_END_MARKER =
  "<!-- END GENERATED:PLUGIN-CATALOG:SKILLS -->";
/** @type {"<!-- BEGIN GENERATED:PLUGIN-CATALOG:CATEGORIES -->"} Start of the managed skills README category region. */
export const SKILLS_README_START_MARKER =
  "<!-- BEGIN GENERATED:PLUGIN-CATALOG:CATEGORIES -->";
/** @type {"<!-- END GENERATED:PLUGIN-CATALOG:CATEGORIES -->"} End of the managed skills README category region. */
export const SKILLS_README_END_MARKER =
  "<!-- END GENERATED:PLUGIN-CATALOG:CATEGORIES -->";

const MANAGED_MARKER_PATTERN =
  /<!-- (?:BEGIN|END) GENERATED:PLUGIN-CATALOG:[^>]+-->/;

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
  const categoryNames = new Map(
    plugin.categories.map((category) => [category.id, category.name]),
  );
  const publicSkills = plugin.skills.filter(
    (skill) =>
      skill.visibility === "public" &&
      (skill.status === "active" || skill.status === "deprecated"),
  );
  const rows = publicSkills.map((skill) => {
    const deprecated = skill.status === "deprecated";
    const status = deprecated
      ? `Deprecated — ${skill.deprecation.reason} ${skill.deprecation.instructions}`
      : "Active";
    const replacement = skill.deprecation?.replacement_skill_id
      ? `\`${skill.deprecation.replacement_skill_id}\``
      : "—";

    return [
      `\`${skill.id}\``,
      categoryNames.get(skill.category_id),
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

function renderCategorySection(plugin) {
  const rows = plugin.categories.map((category) => {
    const skills = plugin.skills
      .filter(
        (skill) =>
          skill.category_id === category.id &&
          skill.visibility === "public" &&
          (skill.status === "active" || skill.status === "deprecated"),
      )
      .map((skill) => `\`${skill.id}\``);

    return [`\`${category.id}\``, skills.length > 0 ? skills.join(", ") : "—"];
  });

  return [
    "## Categories",
    "",
    renderMarkdownTable(["Category", "Skills"], rows),
  ].join("\n");
}

/**
 * Update only the two marker-bounded README regions.
 * This updater is pure: bytes outside each region are preserved exactly.
 *
 * @param {object} request Render request.
 * @param {object} request.plugin Validated plugin model containing categories and skills.
 * @param {string} request.rootReadme Existing root README source with exactly one marker pair.
 * @param {string} request.skillsReadme Existing skills README source with exactly one marker pair.
 * @returns {{ rootReadme: string, skillsReadme: string }} Updated complete README sources ready to write.
 * @throws {Error} If marker pairs are missing, duplicated, reversed, nested, or generated table values contain unsupported characters.
 *
 * @example
 * const updated = updatePluginReadme({ plugin, rootReadme, skillsReadme });
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
