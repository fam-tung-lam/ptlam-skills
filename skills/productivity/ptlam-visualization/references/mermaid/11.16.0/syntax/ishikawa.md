# Ishikawa

- Declaration: `ishikawa-beta`
- Maturity: `beta`
- External registration: `false`
- Catalog accessibility mode: `native-postprocess`
- Tagged authority: `packages/mermaid/src/docs/syntax/ishikawa.md` at
  `mermaid@11.16.0`

## Use

Potential causes grouped under a single effect.

## Configuration and limits

Use frontmatter for per-diagram configuration. Keep site configuration at
`securityLevel: strict`, reject unknown schema keys, keep remote icon/resource
loading disabled, and respect the runtime text/edge/time bounds.

This family is beta in the pinned release; disclose maturity and expect syntax
evolution.

Mermaid 11.16.0 accepts the native accessibility directives below but omits
their title, description, and ARIA relationships from the rendered SVG. The
pinned renderer post-processes SVG to restore them. Prefer that static output
over source delivery unless the target host has equivalent behavior.

## Minimal accessible example

```mermaid
---
config:
  deterministicIds: true
  deterministicIDSeed: ptlam-mermaid-11.16.0-ishikawa
---
ishikawa-beta
  accTitle: Slow delivery causes
  accDescr: Slow delivery may result from process, tooling, or environment causes.
  Slow delivery
  Process
    Large batches
    Unclear ownership
  Tooling
    Slow builds
  Environment
    Unstable tests
```
