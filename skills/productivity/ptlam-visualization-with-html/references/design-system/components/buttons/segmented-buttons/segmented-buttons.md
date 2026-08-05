# Segmented buttons

Use segmented buttons for a small set of related view, sort, or selection
options. Use `aria-pressed` for independent multi-select segments and a native
radio group for exactly one selected value.

```html
<div class="segments" role="group" aria-label="Diagram level">
  <button class="button" type="button" aria-pressed="true">Context</button>
  <button class="button" type="button" aria-pressed="false">Containers</button>
</div>
```

```css
.segments {
  display: inline-flex;
}
.segments .button {
  border-color: var(--color-outline);
  border-radius: 0;
}
.segments .button:first-child {
  border-radius: var(--shape-full) 0 0 var(--shape-full);
}
.segments .button:last-child {
  border-radius: 0 var(--shape-full) var(--shape-full) 0;
}
```

Source:
[Material segmented buttons](https://m3.material.io/components/segmented-buttons/overview).
