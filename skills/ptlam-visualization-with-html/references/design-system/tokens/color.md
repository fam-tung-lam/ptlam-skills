# Color tokens

The scaffold owns the exact baseline values. Consume semantic roles instead of
raw palette values: canvas and surface roles establish depth, `on-*` roles own
readable foregrounds, outline roles separate regions, and primary, secondary,
tertiary, success, warning, and error roles communicate meaning.

Use `--color-primary` for the current learning step or primary action,
`--color-secondary` for relationships, and `--color-error` only for failure. Use
color together with label, outline, weight, or shape. Keep body text at 4.5:1
contrast or higher.

These are system roles, not a fixed brand palette. Preserve all `on-*` pairings
when substituting a dynamic or branded scheme. See Material's
[color roles](https://m3.material.io/styles/color/roles).
