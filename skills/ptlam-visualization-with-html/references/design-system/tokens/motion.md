# Motion tokens

```css
:root {
  --motion-duration-short: 120ms;
  --motion-duration-medium: 320ms;
  --motion-duration-long: 520ms;
  --motion-easing-effects: cubic-bezier(0.2, 0, 0, 1);
  --motion-easing-spatial: cubic-bezier(0.2, 0, 0, 1.2);
  --motion-easing-decelerate: cubic-bezier(0, 0, 0, 1);
  --motion-easing-accelerate: cubic-bezier(0.3, 0, 1, 1);
}
```

These effect and spatial curves are portable CSS approximations of the M3
Expressive motion system, not physical simulations. Use effects for visual
property changes and spatial motion for position, size, and shape continuity.
See Material's current
[motion guidance](https://m3.material.io/styles/motion/overview/how-it-works).
