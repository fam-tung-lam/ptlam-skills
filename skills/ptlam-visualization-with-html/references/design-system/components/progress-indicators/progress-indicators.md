# Progress indicators

Use a determinate indicator when measurable progress exists and an indeterminate
loading indicator otherwise.

```html
<label>Rendering <progress value="3" max="8">3 of 8</progress></label>
```

```css
progress {
  accent-color: var(--color-primary);
  inline-size: min(24rem, 100%);
}
```

The expressive indicator uses waveform, thickness, shape, and role color to make
progress easier to notice. Do not distort the underlying value or hide the
textual status. Source:
[Material progress indicators](https://m3.material.io/components/progress-indicators/overview).
