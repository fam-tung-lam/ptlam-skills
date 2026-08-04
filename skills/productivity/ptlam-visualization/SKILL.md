---
name: ptlam-visualization
description:
  Create and validate useful visual artifacts with portable HTML, pinned Mermaid
  source or renders, or a combined HTML and Mermaid flow. Use for explicit HTML
  visualizations, Mermaid diagrams, diagram code, PNG/SVG/PDF diagrams, Markdown
  diagrams, visual reports, explainers, comparisons, plans, and review surfaces,
  and when visual structure materially improves complex content. Keep simple
  answers in chat, honor explicit requests not to visualize, and defer maps,
  plots, illustrations, or other outputs to a better specialized capability.
---

# PTLam Visualization

Choose the smallest useful visualization from the user's outcome and content.
Treat HTML and Mermaid as internal capabilities, not separate public skills.

## Workflow

1. Capture the exact requested format, path, destination or named host,
   interaction, language, privacy, and delivery constraints. If the user says
   not to visualize, abstain before reading capability references or touching a
   runtime.
2. Read [capability routing](references/capability-routing.md) and
   [shared quality and safety](references/quality-and-safety.md). Select a
   capability from content fitness before applying the preserved format. Ask a
   question only when the choice materially changes meaning, scope, or external
   cost.
3. Load only the selected route:

   - **HTML:** Read the [HTML workflow](references/html/workflow.md),
     [HTML design system](references/html/design-system.md), and
     [HTML quality and safety](references/html/quality-and-safety.md). Use
     `scripts/html/scaffold.mjs` and `scripts/html/validate.mjs`. Never read
     Mermaid version references, inspect its cache, or run its setup for an
     HTML-only request.
   - **Mermaid:** Read the [Mermaid workflow](references/mermaid/workflow.md),
     [Mermaid output routing](references/mermaid/output-routing.md),
     [Mermaid quality and safety](references/mermaid/quality-and-safety.md), and
     the [active 11.16.0 reference index](references/mermaid/11.16.0/index.md).
     Keep Mermaid source canonical. Use `scripts/mermaid/validate.mjs` and
     `scripts/mermaid/render.mjs`; they invoke visible locked setup only when
     Mermaid execution needs the active capsule.
   - **Combined HTML and Mermaid:** Load both routes. Mermaid owns diagram
     selection, canonical source, pinned validation, static rendering, and
     diagram accessibility. HTML owns the complete page, embedded asset policy,
     interaction, portability, final validation, and browser QA. Prefer
     pre-rendered accessible SVG; use `scripts/html/extract-mermaid.mjs` only to
     round-trip the versioned inert source record.
   - **External composition:** Let the specialized outer capability own a rich
     non-HTML artifact such as a multi-page PDF, presentation, map, or plot.
     Supply validated Mermaid source or temporary SVG only when useful; do not
     claim the combined-HTML contract or turn internal inputs into deliverables.
   - **Neither:** Use the better specialized capability or ordinary chat. Do not
     force a photograph, illustration, plot, map, or rich report through Mermaid
     because its requested extension is PNG, SVG, or PDF.

4. Use the exact user path first, an existing subject-project convention second,
   or `.ptlam/ptlam-visualization/<descriptive-name>.<extension>` otherwise.
   Continue only the same artifact and never overwrite an unrelated file.
5. Return one requested primary artifact. If the user explicitly requests
   several outputs, preserve that exact co-primary set, validate every member,
   and add no unrequested companion or evidence sidecar.
6. Run every route-owned deterministic check and required visual/browser QA.
   Treat an unexecuted check as unverified, never passed.
7. Deliver a concise handoff with the requested artifacts, tested capability and
   version evidence, material warnings, fallbacks, and unverified checks. Keep
   artifacts local unless the user explicitly requests another lifecycle action.
