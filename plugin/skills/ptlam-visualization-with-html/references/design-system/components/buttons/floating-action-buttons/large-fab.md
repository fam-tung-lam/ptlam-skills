# Large FAB

Use when a spacious layout and unusually strong action prominence justify the
larger target. Do not use it inside a dense control panel.

```html
<button class="fab fab--large" type="button" aria-label="Open fullscreen">
  <span aria-hidden="true">⛶</span>
</button>
```

```css
.fab--large {
  min-width: 96px;
  min-height: 96px;
  border-radius: var(--shape-large);
}
```
