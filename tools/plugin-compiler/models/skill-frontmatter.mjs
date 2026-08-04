/**
 * Immutable public metadata parsed from a skill's `SKILL.md` frontmatter.
 *
 * @property {string} name Skill identifier declared by the skill.
 * @property {string} description Invocation guidance exposed to agents.
 */
export class SkillFrontmatter {
  /**
   * @param {{ name: string, description: string }} frontmatter Validated skill frontmatter.
   * @throws {TypeError} If the frontmatter argument is omitted or is not an object.
   */
  constructor({ name, description }) {
    this.name = name;
    this.description = description;
    Object.freeze(this);
  }
}
