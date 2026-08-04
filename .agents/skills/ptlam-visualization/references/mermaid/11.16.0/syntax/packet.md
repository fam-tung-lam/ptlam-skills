# Packet

- Declaration: `packet`
- Maturity: `stable`
- External registration: `false`
- Tagged authority: `packages/mermaid/src/docs/syntax/packet.md` at
  `mermaid@11.16.0`

## Use

Bit ranges and protocol field layouts.

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
  deterministicIDSeed: ptlam-mermaid-11.16.0-packet
---
packet
  accTitle: Header fields
  accDescr: A 32-bit header contains version, flags, length, and identifier fields.
  0-3: "Version"
  4-7: "Flags"
  8-15: "Length"
  16-31: "Identifier"
```
