# Dialogs

Use a dialog for an important interrupting decision or focused task. Prefer the
native `<dialog>` element and return focus to the invoking control.

```html
<dialog aria-labelledby="dialog-title">
  <h2 id="dialog-title">Reset progress?</h2>
  <form method="dialog">...</form>
</dialog>
```

```css
dialog {
  max-inline-size: min(35rem, calc(100vw - 2rem));
  border: 0;
  border-radius: var(--shape-extra-large);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
}
dialog::backdrop {
  background: var(--color-scrim);
}
```

Source: [Material dialogs](https://m3.material.io/components/dialogs/overview).
