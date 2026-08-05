import { Category, type CategoryInput } from "./category.ts";
import { type PluginAuthor, PluginMetadata } from "./plugin-metadata.ts";
import {
  type CompilerSkill,
  type ManifestSkill,
  Skill,
  type SkillInput,
} from "./skill.ts";

export interface PluginMarketplace {
  name: string;
  description: string;
  plugin_description: string;
  category: string;
  keywords: readonly string[];
}

export interface PluginManifest {
  schema_version: 2;
  name: string;
  description: string;
  version: string;
  author: PluginAuthor;
  homepage: string;
  repository: string;
  license: string;
  keywords: readonly string[];
  marketplace: PluginMarketplace;
  categories: readonly CategoryInput[];
  skills: readonly ManifestSkill[];
}

export interface PluginInput
  extends Omit<PluginManifest, "categories" | "skills"> {
  categories: Iterable<Category | CategoryInput>;
  skills: Iterable<Skill | SkillInput>;
}

export interface PluginModel
  extends Omit<PluginManifest, "categories" | "skills"> {
  categories: readonly CategoryInput[];
  skills: readonly ManifestSkill[];
}

export interface CompilerPlugin extends Omit<PluginModel, "skills"> {
  skills: readonly CompilerSkill[];
}

/** Immutable normalized v2 plugin source model. */
export class Plugin implements CompilerPlugin {
  readonly schema_version: 2;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly author: Readonly<PluginAuthor>;
  readonly homepage: string;
  readonly repository: string;
  readonly license: string;
  readonly keywords: readonly string[];
  readonly marketplace: Readonly<
    Omit<PluginMarketplace, "keywords"> & { keywords: readonly string[] }
  >;
  readonly categories: readonly Category[];
  readonly skills: readonly Skill[];
  readonly metadata: PluginMetadata;

  /**
   * @param {object} plugin Validated manifest and source snapshot.
   * @param {number} plugin.schema_version Manifest schema version.
   * @param {string} plugin.name Stable plugin identifier.
   * @param {string} plugin.description Human-readable plugin description.
   * @param {string} plugin.version Plugin release version.
   * @param {{ name: string, email?: string, url?: string }} plugin.author Publication author.
   * @param {string} plugin.homepage Publication homepage.
   * @param {string} plugin.repository Source repository URL.
   * @param {string} plugin.license License name.
   * @param {Iterable<string>} plugin.keywords Discovery keywords.
   * @param {object} plugin.marketplace Marketplace projection settings.
   * @param {Iterable<Category|object>} plugin.categories Ordered categories.
   * @param {Iterable<Skill|object>} plugin.skills Ordered authored skills.
   */
  constructor({
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
  }: PluginInput) {
    this.schema_version = schema_version;
    this.name = name;
    this.description = description;
    this.version = version;
    this.author = Object.freeze({ ...author });
    this.homepage = homepage;
    this.repository = repository;
    this.license = license;
    this.keywords = Object.freeze([...keywords]);
    this.marketplace = Object.freeze({
      ...marketplace,
      keywords: Object.freeze([...marketplace.keywords]),
    });
    this.categories = Object.freeze(
      [...categories].map((category) =>
        category instanceof Category ? category : new Category(category),
      ),
    );
    this.skills = Object.freeze(
      [...skills].map((skill) =>
        skill instanceof Skill ? skill : new Skill(skill),
      ),
    );

    // Transitional projection for existing host-manifest updaters. Top-level
    // v2 identity and publication fields above remain canonical.
    this.metadata = new PluginMetadata({
      name,
      description,
      version,
      author,
      homepage,
      repository,
      license,
      keywords,
    });
    Object.freeze(this);
  }
}
