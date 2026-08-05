# Cards

Use a card for content and actions about one subject. Do not make the entire
card clickable when it contains multiple independent actions.

```html
<article class="card">
  <h3>Docker image</h3>
  <p>Reusable read-only layers.</p>
</article>
```

```css
.card {
  padding: var(--space-3);
  border: 1px solid var(--color-outline-variant);
  border-radius: var(--shape-large);
  background: var(--color-surface-container);
}
```

Source: [Material cards](https://m3.material.io/components/cards/overview).
