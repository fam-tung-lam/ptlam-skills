# Design tokens

Declare every visual decision as a semantic custom property. Copy the following
token block into the document's single `<style>` element, then adjust only when
the subject has an explicit design system.

```css
:root {
  color-scheme: dark;
  --ink-0: #090e15;
  --ink-1: #0f1622;
  --ink-2: #151f2d;
  --ink-3: #1b2838;
  --ink-panel: #0c131d;
  --line: #2a3a4f;
  --line-strong: #63748c;
  --text: #e7edf5;
  --muted: #9caabe;
  --signal: #e8b84c;
  --signal-soft: #372d19;
  --signal-ink: #17130a;
  --cyan: #65c7d9;
  --green: #69c69a;
  --orange: #e6874f;
  --violet: #a997e8;
  --danger: #ef6b69;
  --radius-sm: 0.5rem;
  --radius-md: 0.75rem;
  --radius-lg: 1rem;
  --shadow-focus: 0 0 0 0.2rem rgba(101, 199, 217, 0.28);
  --shadow-panel: 0 1.25rem 4rem rgba(0, 0, 0, 0.2);
  --content: 76rem;
  --gap-1: 0.375rem;
  --gap-2: 0.625rem;
  --gap-3: 1rem;
  --gap-4: 1.5rem;
  --gap-5: 2.25rem;
}
```

Semantic use:

- `--signal`: current step, current C4 level, or primary action.
- `--cyan`: relationships, secondary focus, and keyboard focus.
- `--green`: durable or successful state.
- `--orange`: volatile, risky, or changing state.
- `--violet`: secondary system channels.
- `--danger`: failure only; never generic emphasis.
- `--ink-*`: depth and containment, not alternating decoration.

Keep body text on `--ink-0` or darker panels at 4.5:1 contrast or higher. Do not
encode meaning with color alone.
