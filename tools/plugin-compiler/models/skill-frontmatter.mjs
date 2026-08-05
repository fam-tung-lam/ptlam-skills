/**
 * Immutable public metadata generated from canonical manifest fields.
 *
 * @property {string} name Skill identifier declared by the skill.
 * @property {string} description Invocation guidance exposed to agents.
 */
export class SkillFrontmatter {
  /**
   * @param {{ name: string, description: string }} frontmatter Compiler-owned generated frontmatter.
   * @throws {TypeError} If the frontmatter argument is omitted or is not an object.
   */
  constructor({ name, description }) {
    this.name = name;
    this.description = description;
    Object.freeze(this);
  }
}
