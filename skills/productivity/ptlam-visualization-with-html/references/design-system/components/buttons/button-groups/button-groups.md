# Button groups

Group related actions when proximity and coordinated shape help people compare
or invoke them. A group does not imply selection; use segmented buttons for a
selected value.

```html
<div class="button-group" role="group" aria-label="Diagram actions">
  <button class="button button--tonal" type="button">Fit</button>
  <button class="button button--tonal" type="button">Center</button>
</div>
```

```css
.button-group {
  display: inline-flex;
  gap: 0.25rem;
}
.button-group .button:active {
  border-radius: var(--shape-expressive-active);
}
```

M3 Expressive button groups may react through coordinated shape changes. Keep
labels and target positions stable. Source:
[Material button groups](https://m3.material.io/components/button-groups/overview).
