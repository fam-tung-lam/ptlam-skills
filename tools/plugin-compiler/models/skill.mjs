import { SkillFrontmatter } from "./skill-frontmatter.mjs";

/**
 * Immutable normalized skill entry used by output updaters.
 * Construct it from validated catalog fields and parsed skill frontmatter.
 *
 * @property {string} id Stable skill identifier.
 * @property {string} category_id Identifier of the owning category.
 * @property {"product"|"test"} kind Whether the skill is user-facing or test-only.
 * @property {string} summary Short catalog description.
 * @property {readonly string[]} required_skill_ids Frozen direct dependency identifiers.
 * @property {string} path Repository-relative directory containing the skill.
 * @property {SkillFrontmatter} frontmatter Normalized immutable frontmatter.
 */
export class Skill {
  /**
   * @param {object} skill Validated and normalized skill fields.
   * @param {string} skill.id Stable skill identifier.
   * @param {string} skill.category_id Owning category identifier.
   * @param {"product"|"test"} skill.kind Skill collection kind.
   * @param {string} skill.summary Short catalog description.
   * @param {Iterable<string>} skill.required_skill_ids Direct dependency identifiers.
   * @param {string} skill.path Repository-relative skill directory.
   * @param {SkillFrontmatter|{ name: string, description: string }} skill.frontmatter
   *   Existing frontmatter model or validated fields used to create one.
   * @throws {TypeError} If the skill is omitted, dependency identifiers are not iterable, or frontmatter cannot be constructed.
   */
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
