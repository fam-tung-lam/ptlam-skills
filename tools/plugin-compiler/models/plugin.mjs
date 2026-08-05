import { Category } from "./category.mjs";
import { PluginMetadata } from "./plugin-metadata.mjs";
import { Skill } from "./skill.mjs";

/** Immutable normalized v2 plugin source model. */
export class Plugin {
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
  }) {
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
