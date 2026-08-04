# Treemap

- Declaration: `treemap-beta`
- Maturity: `beta`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/treemap.md` at
  `mermaid@11.16.0`

## Use

Hierarchical part-to-whole quantities.

## Configuration and limits

Use frontmatter for per-diagram configuration. Keep site configuration at
`securityLevel: strict`, reject unknown schema keys, keep remote icon/resource
loading disabled, and respect the runtime text/edge/time bounds.

This family is beta in the pinned release; disclose maturity and expect syntax
evolution.

## Minimal accessible example

```mermaid
---
config:
  deterministicIds: true
  deterministicIDSeed: ptlam-mermaid-11.16.0-treemap
---
treemap-beta
  accTitle: Storage usage
  accDescr: Storage is divided between application and data categories.
  "Application"
    "Code": 30
    "Assets": 20
  "Data"
    "Database": 40
    "Logs": 10
```
