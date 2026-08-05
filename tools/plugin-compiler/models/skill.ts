/** Controls whether a skill is eligible to become a published root skill. */
export enum SkillVisibility {
  /** Keep the skill available only as an embedded dependency. */
  Internal = "internal",
  /** Allow the skill to be published when its lifecycle status permits it. */
  Public = "public",
}

/** Describes the authored lifecycle stage of a skill. */
export enum SkillStatus {
  /** The skill is still being authored and cannot be published or required. */
  Draft = "draft",
  /** The skill is supported and may be published or required. */
  Active = "active",
  /** The skill remains usable but should direct maintainers to a replacement. */
  Deprecated = "deprecated",
  /** The skill is retained as history and cannot participate in active output. */
  Archived = "archived",
}

/** Required insertion point in every authored body-only `SKILL.md`. */
export const REQUIRED_SKILLS_MARKER =
  "<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->";

/** Explains one directed dependency between authored skills. */
export interface SkillRequirement {
  /** Manifest-defined identifier of the required skill. */
  readonly skill_id: string;
  /** Reason the depending skill needs this requirement. */
  readonly reason: string;
  /** Instructions shown to an agent when applying the requirement. */
  readonly instructions: string;
}

/** Migration guidance required for a deprecated skill. */
export interface SkillDeprecation {
  /** Reason maintainers should stop choosing the skill for new work. */
  readonly reason: string;
  /** Instructions for existing users of the deprecated skill. */
  readonly instructions: string;
  /** Optional manifest-defined identifier of the active replacement. */
  readonly replacement_skill_id?: string;
}

/** Historical metadata retained for an archived skill. */
export interface SkillArchive {
  /** Reason the skill was removed from active use. */
  readonly reason: string;
  /** Optional manifest-defined identifier of the active replacement. */
  readonly replacement_skill_id?: string;
}

/**
 * One skill declaration read from `plugin/plugin.yml`.
 *
 * Skill and category identifiers remain strings because both collections are
 * authored catalog data, not compiler-defined closed sets.
 */
export interface ManifestSkill {
  /** Stable kebab-case skill identifier and generated skill name. */
  readonly id: string;
  /** Description used in generated frontmatter and catalog documentation. */
  readonly description: string;
  /** Manifest-defined category identifier that owns this skill. */
  readonly category_id: string;
  /** Publication visibility interpreted with {@link status}. */
  readonly visibility: SkillVisibility;
  /** Lifecycle status interpreted with {@link visibility}. */
  readonly status: SkillStatus;
  /** Ordered direct dependencies embedded into generated output. */
  readonly required_skills: readonly SkillRequirement[];
  /** Required migration guidance when {@link status} is deprecated. */
  readonly deprecation?: SkillDeprecation;
  /** Required historical metadata when {@link status} is archived. */
  readonly archive?: SkillArchive;
}

/** Mutable resource bytes accepted while constructing a validated snapshot. */
export interface SkillResourceInput {
  /** Skill-relative POSIX path preserved in generated output. */
  readonly path: string;
  /** Source bytes copied defensively by the snapshot factory. */
  readonly content: Uint8Array;
}

/** Immutable resource descriptor exposed by a validated skill snapshot. */
export interface SkillResourceSnapshot {
  /** Skill-relative POSIX path preserved in generated output. */
  readonly path: string;
  /** Fresh byte copy; mutating it never changes the stored snapshot. */
  readonly content: Buffer;
}

/** Complete validated values needed to construct one skill snapshot. */
export interface SkillSnapshotInput
  extends Omit<ManifestSkill, "required_skills"> {
  /** Ordered direct requirements to copy into the snapshot. */
  readonly required_skills: Iterable<SkillRequirement>;
  /** Repository-relative path of the authored skill directory. */
  readonly source_path: string;
  /** Validated body-only `SKILL.md` source. */
  readonly source_body: string;
  /** Validated source resources in deterministic path order. */
  readonly resources: Iterable<SkillResourceInput>;
}

/** One immutable validated skill consumed by publication modules. */
export interface SkillSnapshot extends ManifestSkill {
  /** Repository-relative path of the authored skill directory. */
  readonly source_path: string;
  /** Validated body-only `SKILL.md` source. */
  readonly source_body: string;
  /** Defensively copied resources in deterministic path order. */
  readonly resources: readonly SkillResourceSnapshot[];
}

function createResourceSnapshot({
  path,
  content,
}: SkillResourceInput): SkillResourceSnapshot {
  // A closure owns the bytes so freezing the descriptor cannot be bypassed by
  // mutating either the input buffer or a buffer returned to a caller.
  const bytes = Buffer.from(content);
  return Object.freeze({
    path,
    get content(): Buffer {
      return Buffer.from(bytes);
    },
  });
}

/**
 * Create one immutable validated skill snapshot.
 *
 * @param input - Validated manifest fields, source body, and resource bytes.
 * @returns A deeply frozen skill whose resource getter returns defensive copies.
 *
 * @example
 * const skill = createSkillSnapshot({
 *   id: "review-code",
 *   description: "Review a code change.",
 *   category_id: "engineering",
 *   visibility: SkillVisibility.Public,
 *   status: SkillStatus.Active,
 *   required_skills: [],
 *   source_path: "plugin/skills/review-code",
 *   source_body: "# Review code\n",
 *   resources: [],
 * });
 */
export function createSkillSnapshot({
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
}: SkillSnapshotInput): SkillSnapshot {
  return Object.freeze({
    id,
    description,
    category_id,
    visibility,
    status,
    required_skills: Object.freeze(
      [...required_skills].map((requirement) =>
        Object.freeze({ ...requirement }),
      ),
    ),
    source_path,
    source_body,
    resources: Object.freeze([...resources].map(createResourceSnapshot)),
    ...(deprecation === undefined
      ? {}
      : { deprecation: Object.freeze({ ...deprecation }) }),
    ...(archive === undefined
      ? {}
      : { archive: Object.freeze({ ...archive }) }),
  });
}
