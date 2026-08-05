# Menus

Use a menu for a temporary list of actions or choices. Use ordinary navigation
links rather than ARIA menu roles for site navigation.

```html
<div class="menu" role="menu" aria-label="Export format">
  <button role="menuitem" type="button">SVG</button>
</div>
```

```css
.menu {
  inline-size: max-content;
  min-inline-size: 12rem;
  padding: var(--space-1);
  border-radius: var(--shape-small);
  background: var(--color-surface-container-high);
  box-shadow: var(--elevation-2);
}
```

Manage arrow-key navigation and restore focus to the trigger. Source:
[Material menus](https://m3.material.io/components/menus/overview).
