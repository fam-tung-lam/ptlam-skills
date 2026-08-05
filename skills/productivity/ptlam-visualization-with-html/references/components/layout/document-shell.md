# Document shell

Use one long-form field guide. The learner scrolls from orientation to deeper
mechanisms. Anchor links may jump between sections, but must not hide content
like tabs.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>How the system works</title>
    <style>
      /* Embed foundation and selected component CSS here. */
    </style>
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to the field guide</a>
    <header class="hero">
      <p class="eyebrow">Interactive field guide</p>
      <h1>See the system move</h1>
      <p class="lede">
        One sentence naming the learner's goal and the complete system.
      </p>
    </header>
    <nav class="field-nav" aria-label="Field guide sections">...</nav>
    <main id="main">
      <section id="overview" aria-labelledby="overview-title">...</section>
      <section id="mechanism" aria-labelledby="mechanism-title">...</section>
      <section id="structure" aria-labelledby="structure-title">...</section>
    </main>
    <footer>Scope and source note.</footer>
    <script>
      /* Embed behavior here. */
    </script>
  </body>
</html>
```

```css
.skip-link {
  position: fixed;
  left: 1rem;
  top: -5rem;
  z-index: 100;
  padding: 0.7rem 1rem;
  background: var(--signal);
  color: var(--signal-ink);
}
.skip-link:focus {
  top: 1rem;
}
.hero,
.field-nav,
main,
footer {
  width: min(calc(100% - 2rem), var(--content));
  margin-inline: auto;
}
.hero {
  padding-block: clamp(4rem, 10vw, 8rem) clamp(2rem, 6vw, 4rem);
}
.lede {
  color: var(--muted);
  font-size: clamp(1.05rem, 2vw, 1.3rem);
}
main {
  display: grid;
  gap: clamp(4rem, 10vw, 9rem);
  padding-block: 3rem 8rem;
}
section {
  scroll-margin-top: 1rem;
  min-width: 0;
}
footer {
  border-top: 1px solid var(--line);
  padding-block: 2rem 4rem;
  color: var(--muted);
}
```

Write a useful static default state into the HTML. JavaScript enhances it after
load.
