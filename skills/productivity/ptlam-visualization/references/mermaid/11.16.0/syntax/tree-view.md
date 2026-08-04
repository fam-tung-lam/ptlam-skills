# TreeView

- Declaration: `treeView-beta`
- Maturity: `beta`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/treeView.md` at
  `mermaid@11.16.0`

## Use

Filesystem-like hierarchical trees.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-tree-view
---
treeView-beta
  accTitle: Project tree
  accDescr: The project contains source files, tests, and a package manifest.
  ├── src/
  │   ├── index.ts
  │   └── runtime.ts
  ├── tests/
  └── package.json
```
