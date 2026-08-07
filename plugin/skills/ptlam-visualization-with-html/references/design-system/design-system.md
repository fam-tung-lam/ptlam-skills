# HTML visualization design system

Use one Material 3 Expressive system for every artifact. Apply expressive color,
flexible type, contrasting shape, purposeful size, motion, and containment with
task-appropriate intensity. Preserve Material roles, anatomy, states,
accessibility, and hierarchy while expressing the subject's visual identity.

## Ownership

The scaffold renderer owns the exact baseline token values, document shell, and
global CSS. Run the scaffolder for a new artifact; do not reconstruct that
baseline from prose. Token references own semantic use and customization rules.
Component references own reusable anatomy and states. Pattern references own
learning-specific compositions.

Do not name a base component after one artifact's workflow. Put a reusable UI
primitive under `components/`; put a goal-specific assembly under `patterns/`.

Material is adaptable rather than a requirement to imitate one Google product.
Preserve Material roles, anatomy, states, accessibility, and hierarchy while
expressing the subject's own visual identity.

Do not create classic, standard, and expressive versions. Reduced-motion,
high-contrast, narrow-screen, and no-JavaScript behavior are accessibility and
capability adaptations of the same expressive system, not alternate themes.

The governing expressive dimensions are color, shape, size, motion, and
containment. Use them to make key actions faster to find and related elements
easier to group while preserving familiar interaction patterns and visible text
labels.

## Source freshness

This local contract was reviewed on 2026-08-07 against the official
[Material 3](https://m3.material.io/),
[foundations](https://m3.material.io/foundations),
[styles](https://m3.material.io/styles),
[components](https://m3.material.io/components), and
[Expressive design research](https://design.google/library/expressive-material-design-google-research).
Revalidate the affected taxonomy and behavior before changing this design
system, when a linked source disappears or contradicts the local contract, or
when Material publishes a relevant component or guidance update. Record the new
review date here only after that comparison.
