# Event modeling

- Declaration: `eventmodeling`
- Maturity: `stable`
- External registration: `false`
- Catalog accessibility mode: `native-postprocess`
- Tagged authority: `packages/mermaid/src/docs/syntax/eventmodeling.md` at
  `mermaid@11.16.0`

## Use

Commands, events, views, and UI arranged on a timeline.

## Configuration and limits

Use frontmatter for per-diagram configuration. Keep site configuration at
`securityLevel: strict`, reject unknown schema keys, keep remote icon/resource
loading disabled, and respect the runtime text/edge/time bounds.

Use the pinned 11.16.0 behavior; verify the target host version before source
delivery.

Mermaid 11.16.0 accepts the native accessibility directives below but omits
their title, description, and label relationships from the rendered SVG. It also
emits the misleading `aria-roledescription="error"`. The pinned renderer removes
that value, normalizes the SVG role, and restores the source title, description,
and label relationships. Prefer that static output over source delivery unless
the target host has equivalent behavior.

## Minimal accessible example

```mermaid
---
config:
  deterministicIds: true
  deterministicIDSeed: ptlam-mermaid-11.16.0-event-modeling
---
eventmodeling
  accTitle: Cart event model
  accDescr: A cart interface sends an add-item command that produces an item-added event.
  tf 01 ui CartUI
  tf 02 cmd AddItem
  tf 03 evt ItemAdded
```
