# Navigation bar

Use a navigation bar for three to five top-level destinations on compact
screens. It changes destinations, not steps in one learning flow.

```html
<nav class="nav-bar" aria-label="Primary">
  <a href="#overview" aria-current="page">Overview</a
  ><a href="#details">Details</a>
</nav>
```

```css
.nav-bar {
  display: flex;
  justify-content: space-around;
  padding: var(--space-2);
  background: var(--color-surface-container);
}
```

Source:
[Material navigation bar](https://m3.material.io/components/navigation-bar/overview).
