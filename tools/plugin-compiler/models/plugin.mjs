import { Category } from "./category.mjs";
import { PluginMetadata } from "./plugin-metadata.mjs";
import { Skill } from "./skill.mjs";

/**
 * Immutable normalized plugin catalog consumed by all output updaters.
 * Use {@link PluginValidator#validatePlugin} to create a fully validated model.
 *
 * @property {number} schema_version Manifest schema version.
 * @property {PluginMetadata} metadata Normalized plugin publication metadata.
 * @property {{ name: string, description: string, plugin_description: string, category: string, keywords: readonly string[] }} marketplace
 *   Frozen marketplace projection settings.
 * @property {readonly Category[]} categories Frozen normalized categories.
 * @property {readonly Skill[]} skills Frozen normalized skills.
 */
export class Plugin {
  /**
   * @param {object} plugin Validated plugin catalog fields.
   * @param {number} plugin.schema_version Manifest schema version.
   * @param {PluginMetadata|object} plugin.metadata Existing metadata model or validated fields.
   * @param {{ name: string, description: string, plugin_description: string, category: string, keywords: Iterable<string> }} plugin.marketplace
   *   Marketplace projection settings.
   * @param {Iterable<Category|object>} plugin.categories Category models or validated fields.
   * @param {Iterable<Skill|object>} plugin.skills Skill models or validated fields.
   * @throws {TypeError} If plugin data is omitted, iterable fields are invalid, or a nested model cannot be constructed.
   */
  constructor({ schema_version, metadata, marketplace, categories, skills }) {
    this.schema_version = schema_version;
    this.metadata =
      metadata instanceof PluginMetadata
        ? metadata
        : new PluginMetadata(metadata);
    this.marketplace = Object.freeze({
      ...marketplace,
      keywords: Object.freeze([...marketplace.keywords]),
    });
    this.categories = Object.freeze(
      categories.map((category) =>
        category instanceof Category ? category : new Category(category),
      ),
    );
    this.skills = Object.freeze(
      skills.map((skill) =>
        skill instanceof Skill ? skill : new Skill(skill),
      ),
    );
    Object.freeze(this);
  }
}
