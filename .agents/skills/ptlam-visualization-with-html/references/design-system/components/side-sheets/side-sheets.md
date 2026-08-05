# Side sheets

Use a side sheet for secondary content beside the main content on wide screens.
Stack it after the main content on narrow screens.

```html
<aside class="side-sheet" aria-labelledby="sheet-title">
  <h2 id="sheet-title">Details</h2>
</aside>
```

```css
.side-sheet {
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--shape-large) 0 0 var(--shape-large);
  background: var(--color-surface-container);
}
```

Source:
[Material side sheets](https://m3.material.io/components/side-sheets/overview).
