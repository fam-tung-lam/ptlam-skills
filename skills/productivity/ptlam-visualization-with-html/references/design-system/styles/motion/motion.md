# Motion

Read [motion tokens](../../tokens/motion.md). Motion identifies the active
relationship or transition; it is not decoration. Keep a non-motion cue such as
color, thickness, shape, or an explicit label.

```css
.flow-edge.is-active {
  stroke: var(--color-primary);
  stroke-width: 2.5;
  stroke-dasharray: 7 5;
  animation: edge-flow 1s linear infinite;
}
@keyframes edge-flow {
  to {
    stroke-dashoffset: -24;
  }
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }
}
```

Never auto-play. Play may advance discretely when reduced motion is requested.

For M3 Expressive, use the expressive motion scheme only for meaningful
transitions, spatial continuity, or an active relationship. Use the standard
scheme for utility feedback. See Material's
[motion system](https://m3.material.io/styles/motion/overview/how-it-works) and
[transition patterns](https://m3.material.io/styles/motion/transitions/transition-patterns).
