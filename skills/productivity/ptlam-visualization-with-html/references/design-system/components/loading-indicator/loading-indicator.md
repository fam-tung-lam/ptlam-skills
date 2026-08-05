# Loading indicator

Use for a short wait with unknown progress. Keep the current content visible
when possible and announce completion, not every animation frame.

```html
<div class="loading" role="status">
  <span aria-hidden="true"></span>Loading diagram…
</div>
```

```css
.loading span {
  display: inline-block;
  inline-size: 1.5rem;
  block-size: 1.5rem;
  border: 0.25rem solid var(--color-outline);
  border-block-start-color: var(--color-primary);
  border-radius: var(--shape-full);
  animation: spin var(--motion-duration-long) linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(1turn);
  }
}
```

The expressive loading indicator uses evolving shape and role color. Keep a
clear text status and render a stable expressive shape under reduced motion.
Source:
[Material loading indicator](https://m3.material.io/components/loading-indicator/overview).
