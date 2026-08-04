# Wardley

- Declaration: `wardley-beta`
- Maturity: `beta`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/wardley.md` at
  `mermaid@11.16.0`

## Use

Value-chain visibility and evolution.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-wardley
---
wardley-beta
  accTitle: Service value chain
  accDescr: Customer value depends on a portal, identity, and compute components.
  title Service value chain
  anchor Customer [0.95, 0.50]
  component Portal [0.75, 0.55]
  component Identity [0.50, 0.70]
  component Compute [0.25, 0.85]
  Customer -> Portal
  Portal -> Identity
  Identity -> Compute
```
