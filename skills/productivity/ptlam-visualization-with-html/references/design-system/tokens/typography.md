# Typography tokens

```css
:root {
  --typeface-display: ui-serif, Georgia, serif;
  --typeface-body: ui-sans-serif, system-ui, sans-serif;
  --typeface-label: ui-monospace, SFMono-Regular, Consolas, monospace;
  --type-display-large: clamp(2.25rem, 7vw, 5.25rem);
  --type-display-medium: clamp(1.8rem, 4vw, 3.25rem);
  --type-headline-large: clamp(1.65rem, 3vw, 2.5rem);
  --type-headline-medium: clamp(1.4rem, 2.5vw, 2rem);
  --type-title-large: clamp(1.3rem, 2vw, 1.6rem);
  --type-title-medium: clamp(1.15rem, 2vw, 1.45rem);
  --type-body-large: clamp(0.98rem, 0.94rem + 0.2vw, 1.08rem);
  --type-body-medium: 0.94rem;
  --type-label-large: 0.875rem;
  --type-label-small: 0.72rem;
  --type-weight-regular: 400;
  --type-weight-medium: 550;
  --type-weight-bold: 700;
  --type-width-standard: 100%;
}
```

Use variable weight or width only when the selected font supports it. Preserve
the Material role families: display, headline, title, body, and label. See the
official
[type-scale tokens](https://m3.material.io/styles/typography/type-scale-tokens).
