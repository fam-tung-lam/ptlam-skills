# Icon buttons

Icon buttons expose a single familiar action without a visible text label.
Always provide an accessible name. Choose a standard variant by emphasis:

- [Standard icon button](standard-icon-button.md)
- [Filled icon button](filled-icon-button.md)
- [Filled tonal icon button](filled-tonal-icon-button.md)
- [Outlined icon button](outlined-icon-button.md)

```css
.icon-button {
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--shape-full);
  background: transparent;
  color: var(--color-on-surface);
  cursor: pointer;
}
```
