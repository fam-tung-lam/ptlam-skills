import { stringify } from "yaml";

import { REQUIRED_SKILLS_MARKER, type SkillSnapshot } from "../models/skill.ts";
import { selectPublishedSkills } from "./select-published-skills.ts";

export interface ComposedSkillEntry {
  readonly path: string;
  readonly content: string | Buffer;
}

export interface ComposedPublishedSkills {
  readonly entries: readonly ComposedSkillEntry[];
  readonly publishedSkillIds: readonly string[];
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function renderFrontmatter(skill: SkillSnapshot): string {
  return `---\n${stringify(
    { name: skill.id, description: skill.description },
    { lineWidth: 0 },
  ).trimEnd()}\n---`;
}

function renderRequiredSkills(skill: SkillSnapshot): string {
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

function renderSkillManifest(skill: SkillSnapshot): string {
  const requiredSkills = renderRequiredSkills(skill);
  if (requiredSkills) {
    return `${renderFrontmatter(skill)}\n\n${skill.source_body.replace(
      REQUIRED_SKILLS_MARKER,
      requiredSkills,
    )}`;
  }

  const markerIndex = skill.source_body.indexOf(REQUIRED_SKILLS_MARKER);
  const before = skill.source_body.slice(0, markerIndex);
  let after = skill.source_body.slice(
    markerIndex + REQUIRED_SKILLS_MARKER.length,
  );
  if (before.endsWith("\n\n") && after.startsWith("\n\n")) {
    after = after.slice(2);
  }
  return `${renderFrontmatter(skill)}\n\n${before}${after}`;
}

function addEntry(
  entries: Map<string, string | Buffer>,
  relativePath: string,
  content: string | Buffer,
): void {
  if (entries.has(relativePath)) {
    throw new Error(`Duplicate composed skill path: ${relativePath}`);
  }
  entries.set(relativePath, content);
}

function composeSkillTree({
  skill,
  skillsById,
  outputRoot,
  entries,
}: {
  readonly skill: SkillSnapshot;
  readonly skillsById: ReadonlyMap<string, SkillSnapshot>;
  readonly outputRoot: string;
  readonly entries: Map<string, string | Buffer>;
}): void {
  addEntry(entries, `${outputRoot}/SKILL.md`, renderSkillManifest(skill));

  for (const resource of [...skill.resources].sort((left, right) =>
    compareCodePoints(left.path, right.path),
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

/** Compose every publishable root into a deterministic standalone skill tree. */
export function composePublishedSkills({
  plugin,
}: {
  readonly plugin: { readonly skills: readonly SkillSnapshot[] };
}): ComposedPublishedSkills {
  const skillsById = new Map(plugin.skills.map((skill) => [skill.id, skill]));
  const publishedSkills = selectPublishedSkills(plugin.skills);
  const entries = new Map<string, string | Buffer>();

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
