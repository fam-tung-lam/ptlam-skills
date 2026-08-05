import type { PluginCategory } from "./category.ts";
import {
  createSkillSnapshot,
  type ManifestSkill,
  type SkillSnapshot,
  type SkillSnapshotInput,
} from "./skill.ts";

/** Manifest schema versions understood by this compiler. */
export enum PluginSchemaVersion {
  /** Current source contract described by `plugin-manifest-v1.schema.json`. */
  V1 = 1,
}

/** Publication identity of the plugin owner. */
export interface PluginAuthor {
  /** Display name written to generated host metadata. */
  readonly name: string;
  /** Optional contact email written to generated host metadata. */
  readonly email?: string;
  /** Optional public URL written to generated host metadata. */
  readonly url?: string;
}

/** Metadata used to render the marketplace listing. */
export interface PluginMarketplace {
  /** Stable marketplace identifier. */
  readonly name: string;
  /** Description of the marketplace collection. */
  readonly description: string;
  /** Description shown for this plugin inside the marketplace. */
  readonly plugin_description: string;
  /** Marketplace-defined category identifier. */
  readonly category: string;
  /** Discovery keywords written in manifest order. */
  readonly keywords: readonly string[];
}

/** Structurally validated values read from `plugin/plugin.yml`. */
export interface PluginManifest {
  /** Version of the source contract interpreted by the compiler. */
  readonly schema_version: PluginSchemaVersion;
  /** Stable plugin identifier. */
  readonly name: string;
  /** Human-readable plugin description. */
  readonly description: string;
  /** Quoted semantic release version. */
  readonly version: string;
  /** Plugin owner written to generated host metadata. */
  readonly author: PluginAuthor;
  /** Public plugin documentation URL. */
  readonly homepage: string;
  /** Public source repository URL. */
  readonly repository: string;
  /** License identifier written to generated host metadata. */
  readonly license: string;
  /** Plugin discovery keywords in manifest order. */
  readonly keywords: readonly string[];
  /** Marketplace-specific projection settings. */
  readonly marketplace: PluginMarketplace;
  /** Ordered catalog categories declared by maintainers. */
  readonly categories: readonly PluginCategory[];
  /** Ordered skill declarations declared by maintainers. */
  readonly skills: readonly ManifestSkill[];
}

/** Canonical immutable source graph returned after complete validation. */
export interface PluginSnapshot
  extends Omit<PluginManifest, "categories" | "skills"> {
  /** Defensively copied categories in manifest order. */
  readonly categories: readonly PluginCategory[];
  /** Fully inspected skills in manifest order. */
  readonly skills: readonly SkillSnapshot[];
}

/** Complete validated values needed to construct a plugin snapshot. */
export interface PluginSnapshotInput
  extends Omit<PluginManifest, "categories" | "skills"> {
  /** Validated categories to copy into the snapshot. */
  readonly categories: Iterable<PluginCategory>;
  /** Validated skill sources to convert into immutable snapshots. */
  readonly skills: Iterable<SkillSnapshotInput>;
}

/**
 * Create the canonical immutable source graph consumed by the compiler.
 *
 * @param input - Completely validated manifest values and inspected skill sources.
 * @returns A deeply frozen plugin snapshot with defensively copied collections.
 *
 * @example
 * const plugin = createPluginSnapshot(validatedInput);
 * console.log(plugin.skills.length);
 */
export function createPluginSnapshot({
  schema_version,
  name,
  description,
  version,
  author,
  homepage,
  repository,
  license,
  keywords,
  marketplace,
  categories,
  skills,
}: PluginSnapshotInput): PluginSnapshot {
  return Object.freeze({
    schema_version,
    name,
    description,
    version,
    author: Object.freeze({ ...author }),
    homepage,
    repository,
    license,
    keywords: Object.freeze([...keywords]),
    marketplace: Object.freeze({
      ...marketplace,
      keywords: Object.freeze([...marketplace.keywords]),
    }),
    categories: Object.freeze(
      [...categories].map((category) => Object.freeze({ ...category })),
    ),
    skills: Object.freeze([...skills].map(createSkillSnapshot)),
  });
}
