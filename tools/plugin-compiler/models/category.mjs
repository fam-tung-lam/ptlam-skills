/**
 * Immutable category metadata used to group skills in generated catalog views.
 * Construct instances from already validated manifest data.
 *
 * @property {string} id Stable category identifier.
 * @property {string} title Human-readable category title.
 * @property {string} description Human-readable category description.
 *
 * @example
 * const category = new Category({
 *   id: "visualization",
 *   title: "Visualization",
 *   description: "Skills for presenting structured information.",
 * });
 */
export class Category {
  /**
   * @param {{ id: string, title: string, description: string }} category
   *   Validated category fields from the plugin manifest.
   * @throws {TypeError} If the category argument is omitted or is not an object.
   */
  constructor({ id, title, description }) {
    this.id = id;
    this.title = title;
    this.description = description;
    Object.freeze(this);
  }
}
