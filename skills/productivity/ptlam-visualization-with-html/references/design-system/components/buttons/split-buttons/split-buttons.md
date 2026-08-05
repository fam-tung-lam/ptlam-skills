# Split buttons

Use a split button when one primary action has a menu of closely related
alternatives. Keep the primary action and menu trigger as two distinct buttons.

```html
<div class="split-button">
  <button class="button button--filled" type="button">Export</button>
  <button
    class="icon-button icon-button--filled"
    type="button"
    aria-label="More export formats"
    aria-haspopup="menu"
    aria-expanded="false"
  >
    ⌄
  </button>
</div>
```

```css
.split-button {
  display: inline-flex;
  gap: 0.125rem;
}
.split-button > :first-child {
  border-radius: var(--shape-full) var(--shape-small) var(--shape-small)
    var(--shape-full);
}
.split-button > :last-child {
  border-radius: var(--shape-small) var(--shape-full) var(--shape-full)
    var(--shape-small);
}
```

M3 Expressive split buttons support XS through XL and use shape and icon motion
when the menu opens. Preserve `aria-expanded` and reduced motion. Source:
[Material split buttons](https://m3.material.io/components/split-button).
