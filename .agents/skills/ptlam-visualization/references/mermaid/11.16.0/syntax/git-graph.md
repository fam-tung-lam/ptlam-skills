# Git graph

- Declaration: `gitGraph`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/gitgraph.md` at
  `mermaid@11.16.0`

## Use

Branches, commits, merges, and release history.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-git-graph
---
gitGraph
  accTitle: Feature merge
  accDescr: A feature branch is created, committed, and merged into main.
  commit id: "base"
  branch feature
  checkout feature
  commit id: "change"
  checkout main
  merge feature
```
