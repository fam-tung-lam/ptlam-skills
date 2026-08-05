import { SkillFrontmatter } from "./skill-frontmatter.ts";
import {
  SkillRequirement,
  type SkillRequirementInput,
} from "./skill-requirement.ts";
import { SkillResource, type SkillResourceInput } from "./skill-resource.ts";

export type SkillVisibility = "internal" | "public";
export type SkillStatus = "draft" | "active" | "deprecated" | "archived";

export interface SkillDeprecation {
  reason: string;
  instructions: string;
  replacement_skill_id?: string;
}

export interface SkillArchive {
  reason: string;
  replacement_skill_id?: string;
}

export interface ManifestSkill {
  id: string;
  description: string;
  category_id: string;
  visibility: SkillVisibility;
  status: SkillStatus;
  required_skills: readonly SkillRequirementInput[];
  deprecation?: SkillDeprecation;
  archive?: SkillArchive;
}

export interface SkillInput extends Omit<ManifestSkill, "required_skills"> {
  required_skills: Iterable<SkillRequirement | SkillRequirementInput>;
  source_path: string;
  source_body: string;
  resources: Iterable<SkillResource | SkillResourceInput>;
}

export interface CompilerSkill extends ManifestSkill {
  source_body: string;
  resources: readonly {
    path: string;
    content: Buffer;
  }[];
}

/**
 * Immutable authored-skill snapshot consumed by the composer and catalog
 * updaters. Instances are created only after manifest, graph, and filesystem
 * validation completes.
 */
export class Skill implements CompilerSkill {
  readonly id: string;
  readonly description: string;
  readonly category_id: string;
  readonly visibility: SkillVisibility;
  readonly status: SkillStatus;
  readonly required_skills: readonly SkillRequirement[];
  readonly source_path: string;
  readonly source_body: string;
  readonly resources: readonly SkillResource[];
  readonly resource_paths: readonly string[];
  readonly deprecation?: Readonly<SkillDeprecation>;
  readonly archive?: Readonly<SkillArchive>;
  readonly path: string;
  readonly frontmatter: SkillFrontmatter;
  readonly required_skill_ids: readonly string[];

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
  }: SkillInput) {
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
    if (deprecation) this.deprecation = Object.freeze({ ...deprecation });
    if (archive) this.archive = Object.freeze({ ...archive });

    // Transitional read projections for output code being migrated to v2.
    this.path = `skills/${id}`;
    this.frontmatter = new SkillFrontmatter({ name: id, description });
    this.required_skill_ids = Object.freeze(
      this.required_skills.map(({ skill_id }) => skill_id),
    );

    Object.freeze(this);
  }
}
