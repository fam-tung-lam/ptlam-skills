# Time pickers

Use a native time input for portable HTML. Offer a dial or custom modal only
when direct manipulation materially helps the task.

```html
<label class="field">Start time <input type="time" name="start-time" /></label>
```

```css
.field input {
  min-height: 44px;
  border-radius: var(--shape-small);
}
```

Do not remove keyboard entry. Source:
[Material time pickers](https://m3.material.io/components/time-pickers/overview).
