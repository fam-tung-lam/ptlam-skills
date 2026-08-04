# Radar

- Declaration: `radar-beta`
- Maturity: `beta`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/radar.md` at
  `mermaid@11.16.0`

## Use

Several entities compared across common dimensions.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-radar
---
radar-beta
  accTitle: Capability comparison
  accDescr: Option A and Option B are compared on speed, quality, and cost.
  axis s["Speed"], q["Quality"], c["Cost"]
  curve a["Option A"]{80, 70, 60}
  curve b["Option B"]{60, 85, 75}
  max 100
  min 0
```
