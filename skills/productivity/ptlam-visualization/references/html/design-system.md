# Applying a Design System

Use this reference after choosing the information treatment. It defines how to
select a visual direction, customize it, and assemble only the fallback pieces
the artifact needs.

Design-system version 2 adds connected-diagram, arbitrary semantic-zoom, and
synchronized live-flow primitives. Version 1 artifacts remain valid; emit
version 2 for newly scaffolded or newly composed artifacts.

## Resolve presentation preferences

Apply this order exactly:

1. Explicit instructions in the current request
2. Explicit decisions in the active conversation
3. Stable user preferences available in context
4. The subject project's design and content conventions
5. The bundled `ptlam-visualization` fallback

Prefer a specific or recent choice over a general or older one. Never let an
inferred preference override an explicit instruction.

For the visual direction, first follow a user-requested style or named design
system. Otherwise inspect and match the subject project's established system or
brand. Use the bundled fallback only when neither supplies the direction. The
fallback is an original neutral system; do not reshape it to imitate another
product.

When matching a project, inspect its tokens, typography, components, content
voice, icons, spacing, themes, and responsive conventions. Reuse compatible
local resources when permitted. Do not invent brand rules from a logo alone.

## Customize by responsibility

1. Set tokens for color, typography, spacing, radius, elevation, motion, and
   breakpoints. Prefer changing tokens over overriding individual components.
2. Select foundations that establish the reset, semantic document defaults,
   responsive layout, focus treatment, reduced motion, print, and light/dark
   themes.
3. Select only the structural and content components required by the chosen
   treatment.
4. Select only behaviors that add useful read-only exploration. Ensure the
   unenhanced document remains complete.
5. Inline the selected CSS, JavaScript, icons, and data into the portable HTML
   unless justified large media needs sibling files.

Follow system light or dark preference by default. Add a visible theme toggle
only when useful, and do not persist its selection in v1. Preserve readable
contrast, focus, print, and responsive behavior after every token override; use
the checks in [quality-and-safety.md](quality-and-safety.md).

## Namespace and assembly contracts

| Responsibility        | Contract                              |
| --------------------- | ------------------------------------- |
| Design tokens         | CSS custom properties named `--ptv-*` |
| Reusable presentation | Composable classes named `.ptv-*`     |
| Behavior activation   | JavaScript hooks named `data-ptv-*`   |
| Reusable pattern IDs  | Unique document IDs named `ptv-*`     |

Do not style an element solely through a behavior-only `data-ptv-*` attribute.
Use semantic HTML as the base, composable classes for presentation, and small
controllers for enhancement. The fallback does not use Shadow DOM or custom
elements.

Assemble CSS in this order:

1. Tokens
2. Foundations
3. Components

Place behaviors after document content. Keep the starter template's replacement
slots presentation-only; the scaffold owns replacement and resource inlining. Do
not duplicate component or controller source in authoring guidance.

For interactive system explanations, compose only the matching v2 resources:

| Reader operation                              | Presentation asset        | Optional behavior asset      |
| --------------------------------------------- | ------------------------- | ---------------------------- |
| Trace connected topology and group boundaries | `components/diagrams.css` | none for a static map        |
| Move between semantic abstraction levels      | `components/diagrams.css` | `behaviors/semantic-zoom.js` |
| Advance a process while observing state       | `components/flows.css`    | `behaviors/flow-stepper.js`  |

Inline the selected sources into the final portable document. Treat the
standalone behavior files as additive controllers: the readable panels,
captions, state, and conclusions must already exist in source HTML.

Read
[`examples/diagram-learning.html`](../../assets/html/design-system/examples/diagram-learning.html)
when a concrete authoring shape is useful. It demonstrates both v2 patterns on
one vertical page. Reuse its contracts and hooks, not its example domain or
layout coordinates.

## Selection discipline

- Start with the minimum components needed for the content selected through
  [workflow.md](workflow.md).
- Add a component because it improves a reader operation, not because it is
  available.
- Keep content semantics independent of layout classes and scripts.
- Avoid one-off overrides that weaken token behavior at narrow widths, 200%
  zoom, print, high contrast, or reduced motion.
- Preserve the embedded design-system version when continuing an existing
  artifact. Upgrade it only when the user explicitly requests that change.
