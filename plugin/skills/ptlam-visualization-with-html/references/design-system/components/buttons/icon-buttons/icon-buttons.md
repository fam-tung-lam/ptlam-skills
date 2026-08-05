# Icon buttons

Icon buttons expose a single familiar action without a visible text label.
Always provide an accessible name. Choose a standard variant by emphasis:

- [Standard icon button](standard-icon-button.md)
- [Filled icon button](filled-icon-button.md)
- [Filled tonal icon button](filled-tonal-icon-button.md)
- [Outlined icon button](outlined-icon-button.md)

```css
.icon-button {
  --icon-button-size: 3rem;
  display: inline-grid;
  width: var(--icon-button-size);
  height: var(--icon-button-size);
  min-width: 44px;
  min-height: 44px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--shape-full);
  background: transparent;
  color: var(--color-on-surface);
  cursor: pointer;
}
.icon-button--xs {
  --icon-button-size: 2.75rem;
}
.icon-button--s {
  --icon-button-size: 3rem;
}
.icon-button--m {
  --icon-button-size: 3.5rem;
}
.icon-button--l {
  --icon-button-size: 4rem;
}
.icon-button--xl {
  --icon-button-size: 4.5rem;
}
```

M3 Expressive icon buttons use the same XS-through-XL semantic scale as label
and split buttons. A selected or expanded icon button may change shape, but it
must also expose `aria-pressed` or `aria-expanded`. Source:
[Material icon buttons](https://m3.material.io/components/icon-buttons/overview).
