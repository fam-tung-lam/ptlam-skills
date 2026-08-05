import { stringify } from "yaml";

export const REQUIRED_SKILLS_MARKER =
  "<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->";

function renderFrontmatter(skill) {
  return `---\n${stringify(
    { name: skill.id, description: skill.description },
    { lineWidth: 0 },
  ).trimEnd()}\n---`;
}

function renderRequiredSkills(skill) {
  if (skill.required_skills.length === 0) return "";

  const sections = ["## Required skills"];
  for (const requirement of skill.required_skills) {
    sections.push(
      `### \`${requirement.skill_id}\``,
      `**Reason:** ${requirement.reason}`,
      `**Instructions:** ${requirement.instructions}`,
      `Read [${requirement.skill_id}](references/required-skills/${requirement.skill_id}/SKILL.md).`,
    );
  }
  return sections.join("\n\n");
}

function renderSkillManifest(skill) {
  const requiredSkills = renderRequiredSkills(skill);
  let body;
  if (requiredSkills) {
    body = skill.source_body.replace(REQUIRED_SKILLS_MARKER, requiredSkills);
  } else {
    const markerIndex = skill.source_body.indexOf(REQUIRED_SKILLS_MARKER);
    const before = skill.source_body.slice(0, markerIndex);
    let after = skill.source_body.slice(
      markerIndex + REQUIRED_SKILLS_MARKER.length,
    );
    if (before.endsWith("\n\n") && after.startsWith("\n\n")) {
      after = after.slice(2);
    }
    body = `${before}${after}`;
  }
  return `${renderFrontmatter(skill)}\n\n${body}`;
}

function addEntry(entries, relativePath, content) {
  if (entries.has(relativePath)) {
    throw new Error(`Duplicate composed skill path: ${relativePath}`);
  }
  entries.set(relativePath, content);
}

function composeSkillTree({ skill, skillsById, outputRoot, entries }) {
  addEntry(entries, `${outputRoot}/SKILL.md`, renderSkillManifest(skill));

  for (const resource of [...skill.resources].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    addEntry(entries, `${outputRoot}/${resource.path}`, resource.content);
  }

  for (const requirement of skill.required_skills) {
    const requiredSkill = skillsById.get(requirement.skill_id);
    if (!requiredSkill) {
      throw new Error(
        `Validated skill ${skill.id} references missing skill ${requirement.skill_id}`,
      );
    }
    composeSkillTree({
      skill: requiredSkill,
      skillsById,
      outputRoot: `${outputRoot}/references/required-skills/${requiredSkill.id}`,
      entries,
    });
  }
}

/**
 * Materialize every public active or deprecated skill as a standalone tree.
 * Required skills are nested recursively so each copied skill preserves its
 * own relative links and dependency instructions.
 *
 * @param {{ plugin: { skills: readonly object[] } }} request Validated plugin.
 * @returns {{ entries: Array<{ path: string, content: string|Buffer }>, publishedSkillIds: string[] }}
 */
export function composePublishedSkills({ plugin }) {
  const skillsById = new Map(plugin.skills.map((skill) => [skill.id, skill]));
  const publishedSkills = plugin.skills.filter(
    (skill) =>
      skill.visibility === "public" &&
      (skill.status === "active" || skill.status === "deprecated"),
  );
  const entries = new Map();

  for (const skill of publishedSkills) {
    composeSkillTree({
      skill,
      skillsById,
      outputRoot: `skills/${skill.id}`,
      entries,
    });
  }

  return {
    entries: [...entries].map(([entryPath, content]) => ({
      path: entryPath,
      content,
    })),
    publishedSkillIds: publishedSkills.map((skill) => skill.id),
  };
}
