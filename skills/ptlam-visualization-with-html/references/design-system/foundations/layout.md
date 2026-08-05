# Layout

Use a top-to-bottom document. Anchor links may change scroll position but must
not hide the primary learning sequence behind tabs.

Apply `min-width: 0` to every nested grid and flex child. Use `minmax(0, 1fr)`
rather than `1fr`. Wrap technical text deliberately.

```css
* {
  box-sizing: border-box;
}
html,
body {
  overflow-x: hidden;
}
img,
svg {
  display: block;
  max-width: 100%;
}
svg {
  width: 100%;
  height: auto;
}
.split {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: var(--space-4);
}
.split > * {
  min-width: 0;
}
@media (max-width: 47.5rem) {
  .split {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Never clip meaningful content to hide overflow. Reflow first; allow a contained
code block to scroll only when wrapping would corrupt its meaning.

Use Material's compact, medium, expanded, large, and extra-large breakpoints as
decision inputs, not as device labels. Prefer feed, list-detail, or supporting
pane structures before inventing a custom layout. See the official
[layout overview](https://m3.material.io/foundations/layout/layout-overview/overview)
and
[canonical examples](https://m3.material.io/foundations/layout/canonical-examples/overview).
