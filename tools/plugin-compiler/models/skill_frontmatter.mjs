export class SkillFrontmatter {
  constructor({ name, description }) {
    this.name = name;
    this.description = description;
    Object.freeze(this);
  }
}
