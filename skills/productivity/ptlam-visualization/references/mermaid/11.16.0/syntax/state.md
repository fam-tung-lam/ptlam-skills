# State

- Declaration: `stateDiagram`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/stateDiagram.md` at
  `mermaid@11.16.0`

## Use

States and allowed transitions.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-state
---
stateDiagram
  accTitle: Order states
  accDescr: An order moves from pending to paid and then shipped.
  [*] --> Pending
  Pending --> Paid
  Paid --> Shipped
  Shipped --> [*]
```
