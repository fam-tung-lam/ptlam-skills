# Navigation rail

Use a rail for three to seven top-level destinations on medium or expanded
layouts. Keep labels visible when icons are not universally understood.

```html
<nav class="nav-rail" aria-label="Primary">
  <a href="#overview" aria-current="page">Overview</a>
</nav>
```

```css
.nav-rail {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  inline-size: 6rem;
}
```

Source:
[Material navigation rail](https://m3.material.io/components/navigation-rail/overview).
