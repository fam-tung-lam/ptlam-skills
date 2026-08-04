# User journey

- Declaration: `journey`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/userJourney.md` at
  `mermaid@11.16.0`

## Use

Experience steps with satisfaction scores and actors.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-user-journey
---
journey
  accTitle: Purchase journey
  accDescr: A shopper searches for a product, checks out, and receives confirmation.
  title Purchase journey
  section Shop
    Search: 4: Shopper
    Checkout: 3: Shopper
  section Confirm
    Receive confirmation: 5: Shopper, Store
```
