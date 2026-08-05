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

Expressive feedback may use shape morph, spring-like motion, or color emphasis,
but the state must remain legible when motion is disabled. Follow Material's
[gesture](https://m3.material.io/foundations/interaction/gestures),
[input](https://m3.material.io/foundations/interaction/inputs), and
[state](https://m3.material.io/foundations/interaction/states/overview)
contracts.
