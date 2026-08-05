# App bars

Use an app bar for the page title and navigation or actions that apply to the
whole current view. Keep the document heading in the main content.

```html
<header class="app-bar">
  <a href="#main">Skip to content</a><span>System guide</span>
</header>
```

```css
.app-bar {
  position: sticky;
  inset-block-start: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  min-height: 4rem;
  padding-inline: var(--space-3);
  background: var(--color-surface-container);
}
```

Source:
[Material app bars](https://m3.material.io/components/app-bars/overview).
