# Lists

Use a semantic list for a continuous vertical index. Keep each row's primary
label, supporting text, metadata, and actions in a predictable order.

```html
<ul class="list">
  <li><strong>Image</strong><span>Reusable layers</span></li>
</ul>
```

```css
.list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.list > li {
  display: grid;
  gap: 0.25rem;
  min-height: 3.5rem;
  padding: var(--space-2);
  border-block-end: 1px solid var(--color-outline-variant);
}
```

Source: [Material lists](https://m3.material.io/components/lists/overview).
