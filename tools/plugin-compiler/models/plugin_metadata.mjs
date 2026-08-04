export class PluginMetadata {
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
