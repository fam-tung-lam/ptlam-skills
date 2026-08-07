# Design tokens

Use reference, system, and component roles conceptually: raw values feed
semantic system roles, and components consume those roles. The scaffold owns
their exact baseline CSS values; the token references selected in `SKILL.md`
own customization and application rules.

Do not hard-code a raw color, radius, duration, or type size inside a pattern
when a semantic token exists. Follow Material's official
[token overview](https://m3.material.io/foundations/design-tokens/overview) and
[usage guidance](https://m3.material.io/foundations/design-tokens/how-to-use-tokens).
