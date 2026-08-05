# Small FAB

Use only when the default FAB would crowd a compact viewport and the 44 CSS
pixel minimum target remains satisfied.

```html
<button class="fab fab--small" type="button" aria-label="Open fullscreen">
  <span aria-hidden="true">⛶</span>
</button>
```

```css
.fab--small {
  min-width: 44px;
  min-height: 44px;
  border-radius: var(--shape-medium);
}
```
