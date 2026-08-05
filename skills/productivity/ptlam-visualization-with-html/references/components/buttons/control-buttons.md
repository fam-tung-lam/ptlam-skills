# Control buttons

Use a stable action order: primary Next/Replay, Back, Play/Pause, Reset. Disable
actions that cannot succeed. Keep all controls in the DOM so the panel does not
jump between steps.

```html
<div class="button-row" aria-label="Flow controls">
  <button class="button button--primary" type="button" data-action="next">
    Next <span aria-hidden="true">→</span>
  </button>
  <button class="button" type="button" data-action="back">← Back</button>
  <button class="button" type="button" data-action="play" aria-pressed="false">
    Play
  </button>
  <button class="button button--quiet" type="button" data-action="reset">
    Reset
  </button>
</div>
```

```css
.button-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  min-width: 0;
}
.button {
  min-height: 44px;
  min-width: 44px;
  padding: 0.65rem 0.9rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--ink-2);
  color: var(--text);
  font:
    700 0.82rem/1 ui-sans-serif,
    system-ui,
    sans-serif;
  cursor: pointer;
}
.button:hover:not(:disabled) {
  border-color: var(--line-strong);
  background: var(--ink-3);
}
.button--primary {
  border-color: var(--signal);
  background: var(--signal);
  color: var(--signal-ink);
}
.button--quiet {
  background: transparent;
}
.button[aria-pressed="true"] {
  border-color: var(--cyan);
  box-shadow: inset 0 0 0 1px var(--cyan);
}
.button:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
```

Change the Play label to Pause while running. At the final step, change Next to
Replay or disable it and expose Reset; never leave a button that appears usable
but does nothing.
