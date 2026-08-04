# Mermaid public API

Authority: `packages/mermaid/src/mermaid.ts` and
`packages/mermaid/src/docs/config/usage.md` at `mermaid@11.16.0`.

The supported browser API surface used by this skill is:

- `initialize(config)` to set trusted site configuration;
- `parse(text, parseOptions?)` to validate and return the detected diagram type;
- `detectType(text, config?)` to identify a registered diagram family; and
- `render(id, text, container?)` to produce SVG and optional bind functions.

`parse` does not promise a generic Mermaid AST or JSON model. Treat Mermaid text
as canonical source and rendered SVG as a derived output.

Use the full Mermaid build. Mermaid Tiny omits diagram/layout capabilities
needed by this capsule's 31-family catalog.
