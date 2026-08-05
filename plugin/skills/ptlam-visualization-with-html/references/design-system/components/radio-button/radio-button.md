# Radio button

Use native radio buttons when exactly one option must be selected from a named
set. Keep all options visible when comparison matters.

```html
<fieldset>
  <legend>Diagram depth</legend>
  <label><input type="radio" name="depth" checked /> Context</label>
</fieldset>
```

```css
input[type="radio"] {
  inline-size: 1.25rem;
  block-size: 1.25rem;
  accent-color: var(--color-primary);
}
```

Source:
[Material radio button](https://m3.material.io/components/radio-button/overview).
