# Navigation drawer

Use a drawer for many top-level destinations on expanded layouts. Use a modal
drawer only when the closed state returns focus to its trigger.

```html
<nav class="nav-drawer" aria-label="Primary">
  <a href="#overview" aria-current="page">Overview</a>
</nav>
```

```css
.nav-drawer {
  inline-size: min(22rem, 90vw);
  padding: var(--space-3);
  background: var(--color-surface-container-low);
}
```

Source:
[Material navigation drawer](https://m3.material.io/components/navigation-drawer/overview).
