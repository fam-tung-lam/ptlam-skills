# Shape tokens

```css
:root {
  --shape-none: 0;
  --shape-extra-small: 0.25rem;
  --shape-small: 0.5rem;
  --shape-medium: 0.75rem;
  --shape-large: 1rem;
  --shape-extra-large: 1.75rem;
  --shape-full: 999rem;
  --shape-component-rest: 1.5rem 0.75rem 1.5rem 0.75rem;
  --shape-component-active: 0.75rem 1.5rem 0.75rem 1.5rem;
}
```

Use shape to clarify containment and component family. Do not vary radius only
for decoration.

The expressive baseline uses the expanded shape library and shape morphing. Keep
rest and active shapes semantically related and preserve the active end shape
under reduced motion. See Material's
[corner-radius scale](https://m3.material.io/styles/shape/corner-radius-scale)
and [shape morph](https://m3.material.io/styles/shape/shape-morph).
