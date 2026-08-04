# Configuration

Authority: `packages/mermaid/src/docs/config/configuration.md` and
`packages/mermaid/src/schemas/config.schema.yaml` at `mermaid@11.16.0`.

Mermaid combines defaults, site configuration passed to `initialize`, and
per-diagram frontmatter. Prefer YAML frontmatter for diagram-specific settings;
legacy `%%{init: ...}%%` directives are deprecated.

The vendored schema is the allowed configuration contract and declares
`additionalProperties: false`. Reject unknown keys. Site configuration owns
secure values including `secure`, `securityLevel`, `startOnLoad`, `maxTextSize`,
`suppressErrorRendering`, and `maxEdges`; diagram frontmatter must not weaken
those values.

For repeatable output, set `deterministicIds: true` and a stable
`deterministicIDSeed`. Use fixed diagram-specific seeds where the schema exposes
them. Reproducible settings reduce drift but do not replace visual inspection.
