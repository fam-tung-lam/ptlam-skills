# Accessibility

- Give each SVG `role="img"` and `aria-labelledby` pointing to a `<title>` and
  optional `<desc>` in that same SVG.
- Use native controls and explicit `aria-pressed` for toggles.
- Put changing captions in an `aria-live="polite"` region.
- Keep touch targets at least 44 by 44 CSS pixels.
- Maintain at least 4.5:1 contrast for body text.
- Never rely on hover, motion, or color alone to communicate required meaning.
- Keep DOM order identical to the intended visual and keyboard reading order.
- Show a visible keyboard focus indicator and a skip link to `<main>`.
