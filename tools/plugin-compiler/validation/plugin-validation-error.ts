/** Reports all independent source errors discovered during validation. */
export class PluginValidationError extends Error {
  readonly errors: readonly string[];

  constructor(errors: Iterable<string>) {
    const normalizedErrors = Object.freeze(
      [...new Set(errors)].filter(Boolean),
    );
    super(
      `Plugin validation failed with ${normalizedErrors.length} error${normalizedErrors.length === 1 ? "" : "s"}:\n${normalizedErrors
        .map((error) => `- ${error}`)
        .join("\n")}`,
    );
    this.name = "PluginValidationError";
    this.errors = normalizedErrors;
  }
}
