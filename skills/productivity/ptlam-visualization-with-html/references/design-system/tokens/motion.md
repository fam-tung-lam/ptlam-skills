# Motion tokens

```css
:root {
  --motion-duration-short: 120ms;
  --motion-duration-medium: 320ms;
  --motion-duration-long: 520ms;
  --motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1.2);
  --motion-easing-decelerate: cubic-bezier(0, 0, 0, 1);
  --motion-easing-accelerate: cubic-bezier(0.3, 0, 1, 1);
}
```

Treat the emphasized curve as an expressive approximation for portable CSS, not
a physical simulation. Use the standard scheme for utility changes and the
expressive scheme only when spatial continuity or cause and effect benefits. See
Material's current
[motion guidance](https://m3.material.io/styles/motion/overview/how-it-works).
