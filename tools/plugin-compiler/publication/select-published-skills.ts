import {
  type ManifestSkill,
  SkillStatus,
  SkillVisibility,
} from "../models/skill.ts";

/** Select public skills whose lifecycle permits publication as root skills. */
export function selectPublishedSkills<T extends ManifestSkill>(
  skills: readonly T[],
): readonly T[] {
  return skills.filter(
    (skill) =>
      skill.visibility === SkillVisibility.Public &&
      (skill.status === SkillStatus.Active ||
        skill.status === SkillStatus.Deprecated),
  );
}
