# Typography

Read [typography tokens](../../tokens/typography.md).

```css
body {
  margin: 0;
  background: var(--color-canvas);
  color: var(--color-on-surface);
  font: 400 var(--type-body-large)/1.65 var(--typeface-body);
}
h1,
h2,
h3 {
  margin: 0;
  font-family: var(--typeface-display);
  line-height: 1.08;
  text-wrap: balance;
}
h1 {
  font-size: var(--type-display-large);
}
h2 {
  font-size: var(--type-display-medium);
}
h3 {
  font-size: var(--type-title-medium);
}
p {
  max-width: 68ch;
}
code,
.mono {
  font-family: var(--typeface-label);
}
.eyebrow {
  color: var(--color-primary);
  font: 700 var(--type-label-small)/1.4 var(--typeface-label);
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
```

Keep paragraphs short. Let the visual carry structure; use prose for intent,
caveats, and interpretation.

The expressive type system uses weight, width, and scale to make hierarchy
clearer while preserving the display, headline, title, body, and label roles and
responsive text. See Material's
[typography overview](https://m3.material.io/styles/typography/overview) and
[editorial treatments](https://m3.material.io/styles/typography/editorial-treatments).
