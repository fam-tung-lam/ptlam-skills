# Divider

Use a divider only when spacing or containment does not sufficiently express a
group boundary. Use `<hr>` for a thematic break.

```html
<hr class="divider" />
```

```css
.divider {
  border: 0;
  border-block-start: 1px solid var(--color-outline-variant);
  margin-block: var(--space-3);
}
```

Source: [Material divider](https://m3.material.io/components/divider/overview).
