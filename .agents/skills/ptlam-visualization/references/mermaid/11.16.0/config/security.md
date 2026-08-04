# Security

Authority: `packages/mermaid/src/schemas/config.schema.yaml`,
`packages/mermaid/src/config.ts`, and
`packages/mermaid/src/docs/community/security.md` at `mermaid@11.16.0`.

Use `securityLevel: strict`. Do not allow diagram frontmatter to override secure
site settings. Reject unknown schema keys, keep configured maximum text and edge
limits, and do not fetch remote icon packs or other resources by default.

Render with an isolated unauthenticated browser profile, bounded timeouts,
isolated temporary storage, and guaranteed cleanup. Never treat `loose`,
`antiscript`, or a host's runtime as equivalent to the capsule's strict default.
