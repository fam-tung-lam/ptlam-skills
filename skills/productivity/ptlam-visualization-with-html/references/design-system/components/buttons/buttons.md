# Buttons

Buttons initiate actions. Choose the variant by emphasis, not by one artifact's
workflow name:

- [Elevated button](elevated-button.md)
- [Filled button](filled-button.md)
- [Filled tonal button](filled-tonal-button.md)
- [Outlined button](outlined-button.md)
- [Text button](text-button.md)

Use [icon buttons](../icon-buttons/icon-buttons.md) for icon-only actions and
[floating action buttons](../floating-action-buttons/floating-action-buttons.md)
for a prominent floating action.

```html
<div class="button-row" aria-label="Flow controls">
  <button class="button button--filled" type="button" data-action="next">
    Next <span aria-hidden="true">→</span>
  </button>
  <button class="button button--outlined" type="button" data-action="back">
    ← Back
  </button>
  <button
    class="button button--tonal"
    type="button"
    data-action="play"
    aria-pressed="false"
  >
    Play
  </button>
  <button class="button button--text" type="button" data-action="reset">
    Reset
  </button>
</div>
```

```css
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-width: 0;
}
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.65rem 0.9rem;
  border: 1px solid transparent;
  border-radius: var(--shape-full);
  background: transparent;
  color: var(--color-on-surface);
  font: 700 0.82rem/1 var(--typeface-body);
  cursor: pointer;
}
.button:hover:not(:disabled) {
  filter: brightness(1.08);
}
.button--elevated {
  background: var(--color-surface-container);
  box-shadow: var(--elevation-1);
}
.button--filled {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
.button--tonal {
  background: var(--color-primary-container);
  color: var(--color-on-surface);
}
.button--outlined {
  border-color: var(--color-outline-strong);
}
.button--text {
  color: var(--color-primary);
}
.button[aria-pressed="true"] {
  outline: 2px solid var(--color-secondary);
}
.button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
```

Keep all controls in the DOM so layout does not jump between states. Disable an
action that cannot succeed. Update an action label when its meaning changes;
never leave a button that appears usable but does nothing.
