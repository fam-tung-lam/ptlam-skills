# Mermaid Quality and Safety

Apply this reference with the shared quality contract and the active versioned
catalog.

## Version and configuration

- Use only the exact active capsule. Never resolve floating `latest`, use
  floating `npx`, or trust the CLI package version as proof of Mermaid core.
- Verify resolved core, CLI, lock, browser, manifest, and capsule identity
  before every validation or render.
- Validate frontmatter and configuration against the pinned schema. Reject
  unknown keys and prevent diagram configuration from overriding secure site
  settings.
- Keep `securityLevel: strict`, deterministic IDs/seeds, full-build coverage,
  and no remote resources by default.

## Accessibility and visual QA

- Generate and preserve concise `accTitle` and meaningful `accDescr`.
- Preserve SVG title, description, and ARIA relationships.
- Provide a destination-supported text alternative for PNG and PDF without
  inventing an unrequested sidecar.
- Inspect the delivered size for clipping, overlap, unreadable labels, contrast,
  backgrounds, layout, and non-Latin text. Simplify, split, or route a large
  diagram to HTML when comprehension would fail.
- Disclose beta/experimental maturity and known or unknown host-version drift.

## Execution safety

- Render in an isolated browser profile without authenticated user data.
- Enforce bounded text, edge, input-size, output-size, and execution-time
  limits.
- Use isolated temporary storage and guaranteed cleanup on success or failure.
- Do not fetch remote icon packs, fonts, scripts, images, or other resources by
  default.
- Install no package globally or in the user's subject project. Lazy setup uses
  an isolated per-user cache and must be visible, idempotent, locked,
  integrity-checked, atomic, concurrent-safe, and reusable offline.
- If setup or validation fails, report the exact missing capability. Do not
  substitute source for a requested render without consent.
