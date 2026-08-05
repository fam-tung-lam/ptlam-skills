# Buttons

Buttons initiate actions. Choose the variant by emphasis, not by one artifact's
workflow name:

- [Elevated button](elevated-button.md)
- [Filled button](filled-button.md)
- [Filled tonal button](filled-tonal-button.md)
- [Outlined button](outlined-button.md)
- [Text button](text-button.md)
- [Icon buttons](icon-buttons/icon-buttons.md)
- [Floating action buttons](floating-action-buttons/floating-action-buttons.md)
- [Button groups](button-groups/button-groups.md)
- [Segmented buttons](segmented-buttons/segmented-buttons.md)
- [Split buttons](split-buttons/split-buttons.md)

The base contract below is shared by every labelled button variant. Keep
variant-specific containers, colors, outlines, and elevation in the selected
variant file.

```css
.button {
  --button-block-size: 3rem;
  min-height: 44px;
  min-width: 44px;
  height: var(--button-block-size);
  padding: 0.65rem 0.9rem;
  border: 1px solid transparent;
  border-radius: var(--shape-full);
  background: transparent;
  color: var(--color-on-surface);
  font: 700 0.82rem/1 var(--typeface-body);
  cursor: pointer;
}
.button--xs {
  --button-block-size: 2.75rem;
}
.button--s {
  --button-block-size: 3rem;
}
.button--m {
  --button-block-size: 3.5rem;
}
.button--l {
  --button-block-size: 4rem;
}
.button--xl {
  --button-block-size: 4.5rem;
}
.button:hover:not(:disabled) {
  filter: brightness(1.08);
}
.button[aria-pressed="true"] {
  outline: 2px solid var(--color-secondary);
}
.button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
```

Disable an action that cannot succeed. Update its visible label when its meaning
changes; never leave a button that appears usable but does nothing.

M3 Expressive adds five semantic sizes from XS through XL. Keep a minimum 44 CSS
pixel target in this portable-web adaptation, use stronger shape or type only
for higher-emphasis actions, and never resize surrounding controls unexpectedly.
See Material's
[button overview](https://m3.material.io/components/buttons/overview).
