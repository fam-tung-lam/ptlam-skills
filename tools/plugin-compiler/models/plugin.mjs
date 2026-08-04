import { Category } from "./category.mjs";
import { PluginMetadata } from "./plugin_metadata.mjs";
import { Skill } from "./skill.mjs";

export class Plugin {
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
