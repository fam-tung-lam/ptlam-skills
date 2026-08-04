# Sequence

- Declaration: `sequenceDiagram`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/sequenceDiagram.md` at
  `mermaid@11.16.0`

## Use

Ordered messages between participants.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-sequence
---
sequenceDiagram
  accTitle: Sign-in exchange
  accDescr: A user asks the service to sign in and receives a successful response.
  actor User
  participant Service
  User->>Service: Sign in
  Service-->>User: Success
```
