# HTML visualization foundations

Use this file for every artifact. Keep the design editorial, calm, and
diagram-led: a dark ink canvas, slightly lighter panels, warm signal accents,
cool relationship lines, serif display headings, and mono technical labels.

## Tokens

Read and embed the single canonical token block from [tokens.md](tokens.md).

Do not introduce arbitrary colors when a semantic token fits. Use `--signal` for
the current learning step, `--cyan` for relationships, `--green` for
successful/durable state, `--orange` for volatile or caution state, and
`--violet` for secondary system links.

## Type and rhythm

```css
* {
  box-sizing: border-box;
}
html {
  scroll-behavior: smooth;
  overflow-x: hidden;
}
body {
  margin: 0;
  overflow-x: hidden;
  background: var(--ink-0);
  color: var(--text);
  font:
    400 clamp(0.98rem, 0.94rem + 0.2vw, 1.08rem)/1.65 ui-sans-serif,
    system-ui,
    sans-serif;
}
h1,
h2,
h3 {
  margin: 0;
  font-family: ui-serif, Georgia, serif;
  line-height: 1.08;
  text-wrap: balance;
}
h1 {
  font-size: clamp(2.25rem, 7vw, 5.25rem);
}
h2 {
  font-size: clamp(1.8rem, 4vw, 3.25rem);
}
h3 {
  font-size: clamp(1.15rem, 2vw, 1.45rem);
}
p {
  max-width: 68ch;
}
code,
.mono {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}
.eyebrow {
  color: var(--signal);
  font:
    700 0.72rem/1.4 ui-monospace,
    SFMono-Regular,
    monospace;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
```

Keep paragraphs short. Let the visual carry structure; use prose for intent,
caveats, and interpretation.

## Containment

Apply `min-width: 0` to every nested grid/flex child. Use `minmax(0, 1fr)`
rather than `1fr`. Wrap technical text deliberately.

```css
img,
svg {
  display: block;
  max-width: 100%;
}
svg {
  width: 100%;
  height: auto;
}
pre,
code,
.mono {
  overflow-wrap: anywhere;
}
.cluster,
.split,
.panel,
.state-panel,
.controls {
  min-width: 0;
}
.split {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: var(--gap-3);
}
@media (max-width: 760px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Never solve overflow by clipping meaningful content. Reflow first; allow
contained code blocks to scroll only when wrapping would corrupt the content.

## Focus and motion

```css
:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
  box-shadow: var(--shadow-focus);
}
.flow-edge.is-active {
  stroke: var(--signal);
  stroke-width: 2.5;
  stroke-dasharray: 7 5;
  animation: edge-flow 1s linear infinite;
}
@keyframes edge-flow {
  to {
    stroke-dashoffset: -24;
  }
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

Never auto-play. Motion identifies the active relationship; it is not
decoration. Keep a non-motion cue such as color, thickness, or an explicit
“Active” label.

## Accessibility

- Give each SVG `role="img"` and `aria-labelledby` pointing to a `<title>` and
  optional `<desc>`.
- Use real `<button>` elements for actions and explicit `aria-pressed` for
  toggles.
- Put step captions in an `aria-live="polite"` region.
- Ensure touch targets are at least 44 by 44 CSS pixels.
- Preserve at least 4.5:1 contrast for body text.
- Never rely on hover to reveal required content.
- Keep document order identical to the intended reading order.
