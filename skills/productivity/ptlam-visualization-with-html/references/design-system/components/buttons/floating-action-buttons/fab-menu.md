# FAB menu

Use a FAB menu when one prominent floating action expands into a short set of
closely related actions. Do not replace ordinary page navigation with it.

```html
<div class="fab-menu">
  <button
    class="fab fab--default"
    type="button"
    aria-label="Create"
    aria-expanded="false"
    aria-controls="create-actions"
  >
    ＋
  </button>
  <div id="create-actions" role="menu" hidden>...</div>
</div>
```

```css
.fab-menu {
  position: fixed;
  inset: auto var(--space-4) var(--space-4) auto;
}
.fab-menu [role="menu"] {
  margin-block-end: var(--space-2);
}
```

M3 Expressive uses coordinated shape and motion between the FAB and menu. Return
focus to the FAB when the menu closes. Source:
[Material FAB menu](https://m3.material.io/components/fab-menu/overview).
