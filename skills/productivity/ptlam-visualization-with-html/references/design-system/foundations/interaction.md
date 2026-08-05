# Interaction

Support consistent enabled, disabled, hover, focused, pressed, and selected
states. Combine state indicators when necessary; never make one state erase the
meaning of another.

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 3px;
  box-shadow: var(--elevation-focus);
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
```

Never auto-play. Preserve the current step across viewport changes. Back must
restore the exact previous state, and Reset must restore the first state.
