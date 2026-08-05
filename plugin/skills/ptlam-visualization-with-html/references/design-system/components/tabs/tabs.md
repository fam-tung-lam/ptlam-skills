# Tabs

Use tabs only for local peer views where one visible panel is sufficient. Never
hide the primary top-to-bottom learning sequence behind tabs.

```html
<div role="tablist" aria-label="Code view">
  <button role="tab" aria-selected="true" aria-controls="html-panel">
    HTML
  </button>
</div>
<section id="html-panel" role="tabpanel">...</section>
```

```css
[role="tab"] {
  min-height: 44px;
  border: 0;
  border-block-end: 3px solid transparent;
}
[role="tab"][aria-selected="true"] {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
```

Implement arrow-key movement and focus management. Source:
[Material tabs](https://m3.material.io/components/tabs/overview).
