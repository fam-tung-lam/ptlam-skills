# Flowchart

- Declaration: `flowchart`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/flowchart.md` at
  `mermaid@11.16.0`

## Use

Processes, decisions, and directed dependencies.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-flowchart
---
flowchart LR
  accTitle: Request flow
  accDescr: A request moves from intake through validation to completion.
  intake[Intake] --> validate{Valid?}
  validate -->|Yes| complete[Complete]
  validate -->|No| revise[Revise]
  revise --> validate
```
