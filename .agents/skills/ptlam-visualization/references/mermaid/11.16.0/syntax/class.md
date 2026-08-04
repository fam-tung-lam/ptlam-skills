# Class

- Declaration: `classDiagram`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/classDiagram.md` at
  `mermaid@11.16.0`

## Use

Types, members, inheritance, and associations.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-class
---
classDiagram
  accTitle: Account types
  accDescr: A savings account inherits from the base account class.
  Account <|-- SavingsAccount
  class Account {
    +String id
    +close()
  }
  class SavingsAccount {
    +Decimal rate
  }
```
