/**
 * Immutable category metadata used to group skills in generated catalog views.
 * Construct instances from already validated manifest data.
 *
 * @property {string} id Stable category identifier.
 * @property {string} name Human-readable category name.
 * @property {string} description Human-readable category description.
 *
 * @example
 * const category = new Category({
 *   id: "visualization",
 *   name: "Visualization",
 *   description: "Skills for presenting structured information.",
 * });
 */
export interface CategoryInput {
  id: string;
  name: string;
  description: string;
}

export class Category {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;

  /**
   * @param {{ id: string, name: string, description: string }} category
   *   Validated category fields from the plugin manifest.
   * @throws {TypeError} If the category argument is omitted or is not an object.
   */
  constructor({ id, name, description }: CategoryInput) {
    this.id = id;
    this.name = name;
    // Transitional projection for existing README updaters. `name` is the v2
    // canonical field and this alias can disappear once every updater migrates.
    this.title = name;
    this.description = description;
    Object.freeze(this);
  }
}
