import { SkillFrontmatter } from "./skill_frontmatter.mjs";

export class Skill {
  constructor({
    id,
    category_id,
    kind,
    summary,
    required_skill_ids,
    path,
    frontmatter,
  }) {
    this.id = id;
    this.category_id = category_id;
    this.kind = kind;
    this.summary = summary;
    this.required_skill_ids = Object.freeze([...required_skill_ids]);
    this.path = path;
    this.frontmatter =
      frontmatter instanceof SkillFrontmatter
        ? frontmatter
        : new SkillFrontmatter(frontmatter);
    Object.freeze(this);
  }
}
