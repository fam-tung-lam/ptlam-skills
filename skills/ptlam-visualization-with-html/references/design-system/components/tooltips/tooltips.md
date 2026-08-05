# Tooltips

Use a tooltip for a brief supplemental label, never for essential instructions.
Show it on keyboard focus as well as pointer hover.

```html
<button aria-describedby="fit-tip" aria-label="Fit diagram">⌗</button
><span id="fit-tip" role="tooltip">Fit diagram</span>
```

```css
[role="tooltip"] {
  max-inline-size: 20rem;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--shape-extra-small);
  background: var(--color-surface-inverse);
  color: var(--color-on-surface-inverse);
}
```

Source:
[Material tooltips](https://m3.material.io/components/tooltips/overview).
