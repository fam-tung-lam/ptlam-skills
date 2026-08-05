# Floating action buttons

Use a floating action button only for one prominent action that benefits from
remaining available above scrolling content. Do not use it as a generic Next
button in a control group.

- [FAB](fab.md)
- [Small FAB](small-fab.md)
- [Large FAB](large-fab.md)
- [Extended FAB](extended-fab.md)
- [FAB menu](fab-menu.md)

Every icon-only FAB requires an accessible name. Keep it out of the diagram's
reading path and ensure it never obscures content at narrow widths.

The expressive FAB changes size and shape as its related menu opens. Preserve
the primary action, expose menu state with `aria-expanded`, and keep every menu
action independently named.

Use expressive shape and motion to connect the FAB to its revealed actions, not
to make an unrelated floating decoration. Source:
[Material floating action buttons](https://m3.material.io/components/floating-action-button/overview).

```css
.fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--color-primary-container);
  color: var(--color-on-surface);
  box-shadow: var(--elevation-1);
  cursor: pointer;
}
```
