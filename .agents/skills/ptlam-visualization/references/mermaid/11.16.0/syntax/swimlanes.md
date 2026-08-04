# Swimlanes

- Declaration: `swimlane-beta`
- Maturity: `beta`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/swimlanes.md` at
  `mermaid@11.16.0`

## Use

Processes split across responsible actors or teams.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-swimlanes
---
swimlane-beta LR
  accTitle: Support escalation
  accDescr: A customer request is triaged by support and may move to engineering.
  subgraph Customer
    request[Request help]
  end
  subgraph Support
    triage[Triage]
    answer[Answer]
  end
  subgraph Engineering
    fix[Prepare fix]
  end
  request --> triage
  triage --> answer
  triage --> fix --> answer
```
