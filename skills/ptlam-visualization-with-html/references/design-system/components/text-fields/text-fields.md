# Text fields

Use a visible label, optional supporting text, and an error message tied with
`aria-describedby`. Use native input types and autocomplete attributes.

```html
<label class="text-field" for="concept">Concept</label
><input id="concept" type="text" aria-describedby="concept-help" /><small
  id="concept-help"
  >Use one concise term.</small
>
```

```css
.text-field + input {
  min-height: 3.5rem;
  inline-size: 100%;
  border: 1px solid var(--color-outline);
  border-radius: var(--shape-small);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
}
```

Source:
[Material text fields](https://m3.material.io/components/text-fields/overview).
