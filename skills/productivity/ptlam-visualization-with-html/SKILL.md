---
name: ptlam-visualization-with-html
description:
  Create portable, polished, interactive HTML explainers and learning artifacts
  with native HTML, CSS, JavaScript, and SVG. Use when Codex needs to visualize
  architecture, workflows, state changes, sequences, entity relationships,
  semantic zoom, real-life analogy twins, or step-by-step system behavior in an
  HTML file; when a learner should manipulate or observe a diagram rather than
  read long prose; or when a top-to-bottom visual field guide, simulator, or
  validation artifact is requested.
---

# PTLam Visualization with HTML

Build one self-contained HTML document. Use native HTML, CSS, JavaScript, and
inline SVG; do not require a framework, build step, CDN, web server, sibling
skill, or external asset at runtime.

## Workflow

1. Identify the learner's question, the smallest complete system that answers
   it, and the important relationships, states, and transitions.
2. Choose the minimum component and pattern set from the catalog below. Prefer
   one strong interactive visual over repeated prose.
3. Read the [design-system index](references/design-system/design-system.md),
   the complete
   [foundations index](references/design-system/foundations/foundations.md),
   every file it requires, and the
   [document shell](references/design-system/patterns/layouts/document-shell.md).
   Load the selected token, style, component, and pattern files through their
   folder indexes.
4. Read every selected token, style, component, and pattern file completely
   before writing HTML. Treat its DOM attributes and interaction states as a
   contract, not decoration.
5. Compose a top-to-bottom document. Keep later sections progressively deeper;
   never hide the main learning sequence behind tabs.
6. Make every changing visual operable with Back, Next, Play/Pause, and Reset
   when time or state is part of the idea. Keep diagram, state panel, caption,
   counter, and paired analogy/literal views synchronized.
7. Test at narrow and wide widths, keyboard-only, and reduced-motion settings.
   Ensure no nested grid, flex item, label, SVG, code block, or badge can create
   horizontal overflow.
8. Resolve `<skill-directory>` to the directory containing this `SKILL.md`. Run
   `python3 "<skill-directory>/scripts/validate_html.py" <artifact.html>` from
   any working directory and fix every error. Visually inspect all steps and
   zoom levels in a browser.

For a new artifact, optionally run:

```bash
python3 "<skill-directory>/scripts/scaffold_html.py" output.html --title "How the system works"
```

Use
[interactive-system-field-guide.html](assets/examples/interactive-system-field-guide.html)
as a behavior and quality reference, not as a content template.

## Non-negotiable output contract

- Produce one portable `.html` file with embedded CSS and JavaScript.
- Start with a visible skip link, descriptive `<title>`, `lang`, viewport
  metadata, a single `<main>`, and a clear `<h1>`.
- Use semantic buttons. Show focus states. Announce changing captions or state
  with `aria-live`.
- Use SVG `viewBox` coordinates so diagrams scale. Give each SVG a concise
  accessible name.
- Show direction with visible arrowheads and labels. Animate only the active
  path; use color plus outline/weight, never color alone.
- Never auto-play on load. Honor `prefers-reduced-motion`; Play may advance
  discretely without continuous motion.
- Preserve the user's current step when the viewport changes.
- Keep a readable document without JavaScript. JavaScript may reveal depth and
  synchronize state, but must not contain the only explanation.
- Use concise literal labels. Put qualifications near the visual they constrain.
- Do not add quizzes, checks, or scoring unless explicitly requested.

## Design-system catalog

The organization follows Material 3's distinction between foundations, visual
styles, and named component families. Learning-specific assemblies are patterns,
not components. Read only the selected files plus every required foundation
file.

### Foundations, tokens, and styles

- [foundations.md](references/design-system/foundations/foundations.md):
  accessibility, interaction states, and responsive containment.
- [tokens.md](references/design-system/tokens/tokens.md): semantic color,
  typography, spacing, shape, and elevation values.
- [styles.md](references/design-system/styles/styles.md): color, typography,
  shape, elevation, and motion application.

### Components

- [components.md](references/design-system/components/components.md): standard
  reusable component families.
- [buttons.md](references/design-system/components/buttons/buttons.md):
  elevated, filled, filled tonal, outlined, and text buttons.
- [icon-buttons.md](references/design-system/components/buttons/icon-buttons/icon-buttons.md):
  standard, filled, filled tonal, and outlined icon buttons.
- [floating-action-buttons.md](references/design-system/components/buttons/floating-action-buttons/floating-action-buttons.md):
  default, small, large, and extended FABs.
- [state-panel.md](references/design-system/components/state-panel/state-panel.md):
  observable state, frames, counters, and change emphasis.
- [control-plane.md](references/design-system/components/control-plane/control-plane.md):
  synchronized controls, step counter, caption, and keyboard behavior.
- [flowchart.md](references/design-system/components/diagrams/flowchart.md):
  pure directed flow.
- [c4-diagram.md](references/design-system/components/diagrams/c4-diagram.md):
  separate connected maps for semantic zoom levels.
- [state-diagram.md](references/design-system/components/diagrams/state-diagram.md):
  states, transitions, guards, and terminal states.
- [sequence-diagram.md](references/design-system/components/diagrams/sequence-diagram.md):
  participants, messages, and interactive frames.
- [erd.md](references/design-system/components/diagrams/erd.md): entities,
  fields, keys, cardinality, and relationship paths.
- [analogy-twin.md](references/design-system/components/diagrams/analogy-twin.md):
  synchronized real-life and literal diagrams with one topology.

### Patterns

- [document-shell.md](references/design-system/patterns/layouts/document-shell.md):
  page skeleton and top-to-bottom section flow.
- [section-layout.md](references/design-system/patterns/layouts/section-layout.md):
  progressive sections, split panels, and responsive containment.
- [field-guide-navigation.md](references/design-system/patterns/navigation/field-guide-navigation.md):
  anchor navigation and progress without tabs.
- [callout.md](references/design-system/patterns/content/callout.md): concise
  insight, caveat, and implementation callouts.
- [analogy-mapping.md](references/design-system/patterns/content/analogy-mapping.md):
  visible everyday-to-literal mapping without a dense table.
- [layered-lifetimes.md](references/design-system/patterns/content/layered-lifetimes.md):
  stable, contextual, and volatile layers paired with an everyday system.
- [flowchart-with-state.md](references/design-system/patterns/interactive-flows/flowchart-with-state.md):
  flow on the left, synchronized state on the right.
- [flowchart-with-state-and-control-plane.md](references/design-system/patterns/interactive-flows/flowchart-with-state-and-control-plane.md):
  flow plus state plus controls below.

## Selection rules

- Use a **flowchart** when order, branching, or responsibility is the lesson.
- Add a **state panel** when the learner needs to see what changed after a step.
- Add a **control plane** when observation or replay is part of learning.
- Use a **state diagram** when allowed transitions matter more than work order.
- Use a **sequence diagram** when timing and messages between participants
  matter.
- Use an **ERD** when durable structure, ownership, cardinality, or keys matter.
- Use a **C4 diagram** when the system has meaningful abstraction levels. Render
  each level as a distinct map; zooming changes the map, not merely its scale.
- Use an **analogy twin** only when a single everyday system preserves the
  literal system's important actors, boundaries, relationships, and flow. Keep
  both maps synchronized and add one compact caveat where the analogy stops.
- Use **layered lifetimes** when change cadence or memory scope is the lesson;
  align everyday and literal layers by lifetime rather than by visual
  resemblance.

If multiple views teach one mechanism, place the primary view on the left,
observable state or frames on the right, and one shared control plane below. On
narrow screens, stack in that same order.

## Visual acceptance gate

Before delivery, confirm:

- The document teaches from overview to mechanism by scrolling down.
- Every relationship is visible as a line, arrow, containment boundary, or
  ordered message.
- The active node, active edge, state change, caption, and step counter agree at
  every step.
- Back after Next restores the exact earlier state; Reset returns to step 1;
  Play reaches the end and becomes replayable.
- C4 zoom offers an explicit way back and preserves orientation with a
  breadcrumb or level label.
- Analogy and literal twins use the same semantic IDs and change together.
- Static content remains comprehensible with scripts disabled.
- At 320 px width and at 200% text zoom, nothing important is clipped or
  horizontally scrolls.
- Keyboard focus is always visible, controls have accessible names, and reduced
  motion removes decorative movement.
