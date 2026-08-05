# Badges

Use a badge for a short count or status attached to another component. Give the
host component an accessible description containing the same meaning.

```html
<span class="badge" aria-hidden="true">3</span
><span class="sr-only">3 updates</span>
```

```css
.badge {
  min-inline-size: 1rem;
  padding-inline: 0.25rem;
  border-radius: var(--shape-full);
  background: var(--color-error);
  color: var(--color-on-error);
}
```

Source: [Material badges](https://m3.material.io/components/badges/overview).
