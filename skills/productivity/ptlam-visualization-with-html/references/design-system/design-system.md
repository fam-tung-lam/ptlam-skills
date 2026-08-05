# HTML visualization design system

Use this index as the entry point. The taxonomy follows Material 3's separation
of foundations, styles, and named component families, while retaining a separate
token layer for portable HTML implementation and a pattern layer for
learning-specific compositions.

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
