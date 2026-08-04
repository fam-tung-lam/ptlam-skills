# Configuration API

Authority: `packages/mermaid/src/config.type.ts`,
`packages/mermaid/src/schemas/config.schema.yaml`, and
`packages/mermaid/src/docs/config/configuration.md` at `mermaid@11.16.0`.

Validate configuration against the vendored schema before calling `initialize`.
The schema, generated configuration type, defaults, and generated documentation
are one versioned contract. Do not accept keys that only exist in a newer
Mermaid release.

Call `initialize` once with trusted site configuration. Frontmatter may supply
non-secure per-diagram options, but the runtime must sanitize it and preserve
the site-owned secure keys.
