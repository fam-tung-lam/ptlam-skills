# Pie

- Declaration: `pie`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/pie.md` at
  `mermaid@11.16.0`

## Use

Simple part-to-whole comparisons with few categories.

## Configuration and limits

Use frontmatter for per-diagram configuration. Keep site configuration at
`securityLevel: strict`, reject unknown schema keys, keep remote icon/resource
loading disabled, and respect the runtime text/edge/time bounds.

Use the pinned 11.16.0 behavior; verify the target host version before source
delivery.

## Minimal accessible example

```mermaid
---
config:
  deterministicIds: true
  deterministicIDSeed: ptlam-mermaid-11.16.0-pie
---
pie title Issue distribution
  accTitle: Issue distribution
  accDescr: Most issues are resolved, with smaller open and blocked groups.
  "Resolved" : 70
  "Open" : 20
  "Blocked" : 10
```
