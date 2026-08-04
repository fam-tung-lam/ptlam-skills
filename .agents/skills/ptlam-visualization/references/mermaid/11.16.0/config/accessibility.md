# Accessibility

Authority: `packages/mermaid/src/docs/config/accessibility.md` at
`mermaid@11.16.0`.

Mermaid 11.16.0 accessibility behavior differs by diagram family. The capsule
catalog records one of three exact modes:

- `native`: native `accTitle:` and `accDescr:` directives parse and the pinned
  renderer emits SVG title, description, and ARIA relationships.
- `native-postprocess`: native directives parse, but Mermaid 11.16.0 omits some
  SVG accessibility semantics. This applies to C4, event modeling, Ishikawa,
  Kanban, timeline, and ZenUML. The pinned adapter preserves the source text and
  injects the missing SVG semantics after rendering. C4 preserves the exact
  description and its `aria-describedby` link but omits title labelling; the
  adapter verifies and retains that description before adding the missing title
  relationship. Event modeling emits the misleading
  `aria-roledescription="error"`; the adapter removes it while restoring title,
  description, and label relationships.
- `adapter-comments`: native directives do not parse for block, mindmap, Sankey,
  and Venn. Use exactly one single-line `%% ptlam-acc-title: <single line>` and
  one single-line `%% ptlam-acc-description: <single line>`. The pinned adapter
  removes only those two metadata comments from its temporary Mermaid input,
  renders, and injects the text as SVG title, description, and ARIA
  relationships. Canonical source and hashes retain the comments.

Adapter comments are inert metadata, not portable Mermaid accessibility syntax.
Other Mermaid hosts may ignore them or, for the 11.16.0 block grammar, reject
them. Prefer PNG, PDF, or adapter-produced SVG for these four families unless
the target consumer explicitly implements the same adapter contract.

For native families, generate a single-line `accTitle:` and either a single-line
`accDescr:` or a braced multiline `accDescr` block. Preserve `<title>`,
`<desc>`, `aria-labelledby`, and `aria-describedby` in SVG. Use the description
as host/Markdown alt text. PNG and PDF need a separate text alternative in the
destination or handoff because they do not expose live SVG semantics.
