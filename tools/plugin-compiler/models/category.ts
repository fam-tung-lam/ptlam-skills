/**
 * One manifest-defined catalog category.
 *
 * Category identifiers are intentionally strings rather than enum members:
 * maintainers may add categories in `plugin/plugin.yml` without changing the
 * compiler's source code.
 */
export interface PluginCategory {
  /** Stable kebab-case identifier referenced by skills. */
  readonly id: string;
  /** Human-readable category name rendered in catalog documentation. */
  readonly name: string;
  /** Maintainer-facing explanation of the category's scope. */
  readonly description: string;
}
