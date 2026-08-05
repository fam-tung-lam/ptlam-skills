import { SkillFrontmatter } from "./skill-frontmatter.mjs";
import { SkillRequirement } from "./skill-requirement.mjs";
import { SkillResource } from "./skill-resource.mjs";

/**
 * Immutable authored-skill snapshot consumed by the composer and catalog
 * updaters. Instances are created only after manifest, graph, and filesystem
 * validation completes.
 */
export class Skill {
  /**
   * @param {object} skill Validated source skill.
   * @param {string} skill.id Stable skill identifier.
   * @param {string} skill.description Agent-facing description.
   * @param {string} skill.category_id Owning category identifier.
   * @param {"internal"|"public"} skill.visibility Distribution boundary.
   * @param {"draft"|"active"|"deprecated"|"archived"} skill.status Lifecycle state.
   * @param {Iterable<SkillRequirement|object>} skill.required_skills Ordered direct dependencies.
   * @param {string} skill.source_path Repository-relative authored directory.
   * @param {string} skill.source_body Authored `SKILL.md` body without frontmatter.
   * @param {Iterable<SkillResource|object>} skill.resources Byte-for-byte resource snapshots.
   * @param {{ reason: string, instructions: string, replacement_skill_id?: string }} [skill.deprecation]
   * @param {{ reason: string, replacement_skill_id?: string }} [skill.archive]
   */
  constructor({
    id,
    description,
    category_id,
    visibility,
    status,
    required_skills,
    source_path,
    source_body,
    resources,
    deprecation,
    archive,
  }) {
    this.id = id;
    this.description = description;
    this.category_id = category_id;
    this.visibility = visibility;
    this.status = status;
    this.required_skills = Object.freeze(
      [...required_skills].map((requirement) =>
        requirement instanceof SkillRequirement
          ? requirement
          : new SkillRequirement(requirement),
      ),
    );
    this.source_path = source_path;
    this.source_body = source_body;
    this.resources = Object.freeze(
      [...resources].map((resource) =>
        resource instanceof SkillResource
          ? resource
          : new SkillResource(resource),
      ),
    );
    this.resource_paths = Object.freeze(
      this.resources.map((resource) => resource.path),
    );
    this.deprecation = deprecation
      ? Object.freeze({ ...deprecation })
      : undefined;
    this.archive = archive ? Object.freeze({ ...archive }) : undefined;

    // Transitional read projections for output code being migrated to v2.
    this.path = `skills/${id}`;
    this.frontmatter = new SkillFrontmatter({ name: id, description });
    this.required_skill_ids = Object.freeze(
      this.required_skills.map(({ skill_id }) => skill_id),
    );

    Object.freeze(this);
  }
}
