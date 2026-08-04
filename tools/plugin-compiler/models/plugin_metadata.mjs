/**
 * Immutable plugin identity and publication metadata.
 * The constructor snapshots the author and keywords so later source mutations do
 * not affect generated artifacts.
 *
 * @property {string} name Plugin identifier.
 * @property {string} version Semantic version string.
 * @property {string} description Human-readable plugin description.
 * @property {{ name: string, email?: string, url?: string }} author Frozen author metadata.
 * @property {string} homepage Plugin homepage URL.
 * @property {string} repository Source repository URL.
 * @property {string} license SPDX license identifier or license name.
 * @property {readonly string[]} keywords Frozen discovery keywords.
 */
export class PluginMetadata {
  /**
   * @param {object} metadata Validated plugin metadata from the manifest.
   * @param {string} metadata.name Plugin identifier.
   * @param {string} metadata.version Semantic version string.
   * @param {string} metadata.description Plugin description.
   * @param {{ name: string, email?: string, url?: string }} metadata.author Author metadata.
   * @param {string} metadata.homepage Plugin homepage URL.
   * @param {string} metadata.repository Source repository URL.
   * @param {string} metadata.license License identifier or name.
   * @param {Iterable<string>} metadata.keywords Discovery keywords to snapshot.
   * @throws {TypeError} If metadata is omitted, author cannot be copied, or keywords are not iterable.
   */
  constructor({
    name,
    version,
    description,
    author,
    homepage,
    repository,
    license,
    keywords,
  }) {
    this.name = name;
    this.version = version;
    this.description = description;
    this.author = Object.freeze({ ...author });
    this.homepage = homepage;
    this.repository = repository;
    this.license = license;
    this.keywords = Object.freeze([...keywords]);
    Object.freeze(this);
  }
}
