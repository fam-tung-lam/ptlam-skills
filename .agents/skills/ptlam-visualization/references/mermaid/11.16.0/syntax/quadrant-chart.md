# Quadrant chart

- Declaration: `quadrantChart`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/quadrantChart.md` at
  `mermaid@11.16.0`

## Use

Items positioned against two quantitative dimensions.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-quadrant-chart
---
quadrantChart
  accTitle: Initiative matrix
  accDescr: Initiatives are compared by effort and impact.
  title Initiative matrix
  x-axis Low effort --> High effort
  y-axis Low impact --> High impact
  quadrant-1 Plan carefully
  quadrant-2 Prioritize
  quadrant-3 Defer
  quadrant-4 Quick wins
  Search: [0.25, 0.80]
  Migration: [0.75, 0.70]
```
