# Entity relationship

- Declaration: `erDiagram`
- Maturity: `stable`
- External registration: `false`
- Tagged authority:
  `packages/mermaid/src/docs/syntax/entityRelationshipDiagram.md` at
  `mermaid@11.16.0`

## Use

Entities, cardinalities, and data relationships.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-entity-relationship
---
erDiagram
  accTitle: Customer orders
  accDescr: One customer can place many orders and each order contains line items.
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
```
