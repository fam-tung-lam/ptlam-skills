# Railroad

- Declaration: `railroad-beta`, `railroad-ebnf-beta`, `railroad-abnf-beta`,
  `railroad-peg-beta`
- Maturity: `beta`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/railroad.md` at
  `mermaid@11.16.0`

## Use

Grammar productions rendered as syntax railroad diagrams.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-railroad
---
railroad-ebnf-beta
  accTitle: Digit grammar
  accDescr: A digit is one of the characters zero, one, or two.
  title "Digit grammar"
  digit = "0" | "1" | "2" ;
```
