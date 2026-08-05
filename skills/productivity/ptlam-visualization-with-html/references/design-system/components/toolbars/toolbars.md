# Toolbars

Use a toolbar for frequently used actions relevant to the current page or
visual. Keep it close to the controlled content and group related actions.

```html
<div class="toolbar" role="toolbar" aria-label="Diagram tools">
  <button class="icon-button" type="button" aria-label="Fit diagram">⌗</button>
</div>
```

```css
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  inline-size: fit-content;
  padding: var(--space-1);
  border-radius: var(--shape-full);
  background: var(--color-surface-container-high);
}
```

M3 Expressive toolbars may combine buttons, FABs, and shape-led grouping. Keep
the DOM and focus order predictable. Source:
[Material toolbars](https://m3.material.io/components/toolbars/overview).
