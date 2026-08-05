# Elevated button

Use for a medium-emphasis action that needs separation from a patterned or
visually busy surface. Apply `--elevation-1`; do not use elevation merely to
make a secondary action look primary.

```html
<button class="button button--elevated" type="button">Open details</button>
```

```css
.button--elevated {
  background: var(--color-surface-container);
  box-shadow: var(--elevation-1);
}
```
