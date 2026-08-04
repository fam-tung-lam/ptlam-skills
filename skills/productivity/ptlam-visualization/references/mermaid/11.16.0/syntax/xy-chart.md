# XY chart

- Declaration: `xychart`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/xyChart.md` at
  `mermaid@11.16.0`

## Use

Bar and line series over a shared axis.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-xy-chart
---
xychart
  accTitle: Weekly requests
  accDescr: Requests rise from Monday through Wednesday and fall on Thursday.
  title "Weekly requests"
  x-axis [Mon, Tue, Wed, Thu]
  y-axis "Requests" 0 --> 20
  bar [8, 12, 16, 10]
  line [7, 11, 15, 9]
```
