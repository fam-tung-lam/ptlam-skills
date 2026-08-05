# Chips

Use chips for compact input, filters, selections, or actions. Match semantics to
behavior: button for an action, checkbox for a filter, removable token for
input.

```html
<button class="chip" type="button" aria-pressed="true">Active paths</button>
```

```css
.chip {
  min-height: 44px;
  padding-inline: var(--space-2);
  border: 1px solid var(--color-outline);
  border-radius: var(--shape-small);
  background: transparent;
  color: var(--color-on-surface);
}
.chip[aria-pressed="true"] {
  background: var(--color-secondary-container);
  color: var(--color-on-secondary-container);
}
```

Source: [Material chips](https://m3.material.io/components/chips/overview).
