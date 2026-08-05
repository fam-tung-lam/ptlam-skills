# Color tokens

```css
:root {
  color-scheme: dark;
  --color-canvas: #090e15;
  --color-surface: #0f1622;
  --color-surface-dim: #090e15;
  --color-surface-bright: #253142;
  --color-surface-container-low: #0c131d;
  --color-surface-container: #151f2d;
  --color-surface-container-high: #1b2838;
  --color-surface-container-highest: #253142;
  --color-surface-inverse: #e7edf5;
  --color-on-surface-inverse: #17202c;
  --color-outline: #2a3a4f;
  --color-outline-variant: #3d4d63;
  --color-outline-strong: #63748c;
  --color-on-surface: #e7edf5;
  --color-on-surface-variant: #9caabe;
  --color-primary: #e8b84c;
  --color-primary-container: #372d19;
  --color-on-primary: #17130a;
  --color-on-primary-container: #ffe2a2;
  --color-secondary: #65c7d9;
  --color-secondary-container: #15343a;
  --color-on-secondary: #071416;
  --color-on-secondary-container: #b9f4ff;
  --color-tertiary: #a997e8;
  --color-tertiary-container: #2b2544;
  --color-on-tertiary: #140f27;
  --color-on-tertiary-container: #e7ddff;
  --color-success: #69c69a;
  --color-warning: #e6874f;
  --color-error: #ef6b69;
  --color-error-container: #4b1f20;
  --color-on-error: #1f0707;
  --color-on-error-container: #ffdad7;
  --color-focus: #65c7d9;
  --color-scrim: rgba(0, 0, 0, 0.56);
}
```

Use `--color-primary` for the current learning step or primary action,
`--color-secondary` for relationships, and `--color-error` only for failure. Use
color together with label, outline, weight, or shape.

These are system roles, not a fixed brand palette. Preserve all `on-*` pairings
when substituting a dynamic or branded scheme. See Material's
[color roles](https://m3.material.io/styles/color/roles).
