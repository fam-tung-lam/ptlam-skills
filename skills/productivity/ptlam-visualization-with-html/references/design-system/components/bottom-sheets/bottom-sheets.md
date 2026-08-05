# Bottom sheets

Use a bottom sheet for secondary content anchored to a compact viewport. Prefer
a non-modal sheet when the main content remains useful.

```html
<dialog class="bottom-sheet" aria-labelledby="sheet-title">
  <h2 id="sheet-title">Details</h2>
</dialog>
```

```css
.bottom-sheet {
  inline-size: min(44rem, 100%);
  margin: auto auto 0;
  border-radius: var(--shape-extra-large) var(--shape-extra-large) 0 0;
}
```

Source:
[Material bottom sheets](https://m3.material.io/components/bottom-sheets/overview).
