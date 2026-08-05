# Carousel

Use a carousel for a browsable collection, not for the required top-to-bottom
learning sequence. Keep every item reachable without drag-only interaction.

```html
<section class="carousel" aria-label="Examples">
  <article>Example 1</article>
  <article>Example 2</article>
</section>
```

```css
.carousel {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(16rem, 75%);
  gap: var(--space-3);
  overflow-x: auto;
  scroll-snap-type: x proximity;
}
.carousel > * {
  scroll-snap-align: start;
}
```

Source:
[Material carousel](https://m3.material.io/components/carousel/overview).
