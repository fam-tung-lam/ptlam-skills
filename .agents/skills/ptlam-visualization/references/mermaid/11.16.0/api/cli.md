# Mermaid CLI contract

Authority: Mermaid CLI tag `11.16.0`, `README.md`, `src/index.js`, and its
published npm artifact.

Use the versioned `mmdc` executable from the exact capsule. Its supported image
outputs are SVG, PNG, and PDF. It also transforms Mermaid fences in Markdown to
generated images and rewritten links. Relevant options cover input/output,
theme, background, width, height, scale, config/CSS files, and PDF fit-to-chart.

The CLI Node API is not covered by semantic-versioning guarantees. Prefer the
locked executable contract unless an internal caller has exact-version tests.
Never use floating `npx` or a global CLI as the normal renderer.

CLI `11.16.0` declares Mermaid as `^11.14.0`; therefore its package version is
not proof of the renderer version. Inspect the resolved graph and require
Mermaid core `11.16.0` before every validation or render.
