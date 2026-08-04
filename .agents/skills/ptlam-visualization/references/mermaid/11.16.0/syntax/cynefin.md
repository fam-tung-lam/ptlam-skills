# Cynefin

- Declaration: `cynefin-beta`
- Maturity: `beta`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/cynefin.md` at
  `mermaid@11.16.0`

## Use

Situations classified by complexity domain.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-cynefin
---
cynefin-beta
  accTitle: Incident response
  accDescr: Incident actions are classified as complex, complicated, clear, chaotic, or unknown.
  title Incident response
  complex
    "Investigate causes"
  complicated
    "Expert review"
  clear
    "Apply known fix"
  chaotic
    "Stabilize now"
  confusion
    "Classify incident"
```
