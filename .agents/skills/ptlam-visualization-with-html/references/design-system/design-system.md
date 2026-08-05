# HTML visualization design system

Use this index as the entry point. The taxonomy follows the current Material 3
separation of foundations, styles, and named component families, while retaining
a separate token layer for portable HTML implementation and a pattern layer for
learning-specific compositions. M3 Expressive is the only visual system: every
output uses expressive color, flexible type, contrasting shape, motion physics,
size, and containment with task-appropriate intensity.

Read in this order:

1. [Foundations](foundations/foundations.md) define universal behavior and
   accessibility rules.
2. [Tokens](tokens/tokens.md) provide the semantic CSS custom properties.
3. [Styles](styles/styles.md) explain how tokens become typography, color,
   shape, elevation, and motion.
4. [Components](components/components.md) define reusable UI primitives with
   standard family and variant names.
5. [Patterns](patterns/patterns.md) compose primitives into case-specific
   interactive learning experiences.

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
labels. Google's research across 46 studies with more than 18,000 participants
also warns that expression must not disrupt core functionality. Follow the full
[Expressive design research](https://design.google/library/expressive-material-design-google-research).
