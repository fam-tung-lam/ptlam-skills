# Date pickers

Use a native date input for simple portable selection. Build a dialog calendar
only when range selection or visible calendar context is essential.

```html
<label class="field">Start date <input type="date" name="start-date" /></label>
```

```css
.field input {
  min-height: 44px;
  border-radius: var(--shape-small);
}
```

Preserve keyboard entry, locale formatting, validation, and an explicit label.
Source:
[Material date pickers](https://m3.material.io/components/date-pickers/overview).
