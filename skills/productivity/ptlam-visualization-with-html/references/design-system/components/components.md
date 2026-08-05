# Components

Components are reusable UI building blocks. Use native HTML semantics first,
then apply the shared M3 Expressive roles below. Shared rules belong here;
component-specific anatomy, states, HTML, and CSS belong in the selected
component file.

Every component must expose an accessible name or label, visible focus,
enabled/disabled/hover/focus/pressed states where applicable, a usable target,
and a reduced-motion end state. Do not copy Android-only behavior into HTML;
implement the documented interaction semantics with native web primitives.

## Expressive component contract

Every component is expressive by default; do not create a classic sibling or a
mode switch. Apply these shared rules through the component's own root selector:

- Use color, shape, size, motion, and containment to communicate function and
  emotional tone.
- Give the key action or selected state the strongest size, contrast, or shape;
  keep secondary elements visibly grouped.
- Use high-contrast containment and generous targets to reduce search and tap
  time.
- Preserve familiar anatomy, visible text labels, native semantics, and stable
  target positions.
- Morph between `--shape-component-rest` and `--shape-component-active` for a
  meaningful interactive state.
- Use the effects motion curve for visual properties and the spatial curve for
  position, size, or shape continuity.
- Under reduced motion, render the same expressive end state immediately.

```css
.component-root {
  border-radius: var(--shape-component-rest);
  transition:
    border-radius var(--motion-duration-medium) var(--motion-easing-spatial),
    transform var(--motion-duration-medium) var(--motion-easing-spatial),
    background-color var(--motion-duration-short) var(--motion-easing-effects);
}
.component-root:is(
  :hover,
  :focus-visible,
  [aria-pressed="true"],
  [aria-expanded="true"]
) {
  border-radius: var(--shape-component-active);
}
```

`component-root` names the shared contract, not a required literal class. Merge
these declarations into the specific component selector and keep its unique CSS
in that component file.

## Buttons

- [Buttons and button variants](buttons/buttons.md)
- [Button groups](buttons/button-groups/button-groups.md)
- [Icon buttons](buttons/icon-buttons/icon-buttons.md)
- [Floating action buttons and FAB menus](buttons/floating-action-buttons/floating-action-buttons.md)
- [Segmented buttons](buttons/segmented-buttons/segmented-buttons.md)
- [Split buttons](buttons/split-buttons/split-buttons.md)

## Date, time, loading, and progress

- [Date pickers](date-pickers/date-pickers.md)
- [Time pickers](time-pickers/time-pickers.md)
- [Loading indicator](loading-indicator/loading-indicator.md)
- [Progress indicators](progress-indicators/progress-indicators.md)

## Navigation and sheets

- [Navigation bar](navigation-bar/navigation-bar.md)
- [Navigation drawer](navigation-drawer/navigation-drawer.md)
- [Navigation rail](navigation-rail/navigation-rail.md)
- [Bottom sheets](bottom-sheets/bottom-sheets.md)
- [Side sheets](side-sheets/side-sheets.md)

## Content, communication, selection, and input

- [App bars](app-bars/app-bars.md)
- [Badges](badges/badges.md)
- [Cards](cards/cards.md)
- [Carousel](carousel/carousel.md)
- [Checkbox](checkbox/checkbox.md)
- [Chips](chips/chips.md)
- [Dialogs](dialogs/dialogs.md)
- [Divider](divider/divider.md)
- [Lists](lists/lists.md)
- [Menus](menus/menus.md)
- [Radio button](radio-button/radio-button.md)
- [Search](search/search.md)
- [Sliders](sliders/sliders.md)
- [Snackbar](snackbar/snackbar.md)
- [Switch](switch/switch.md)
- [Tabs](tabs/tabs.md)
- [Text fields](text-fields/text-fields.md)
- [Toolbars](toolbars/toolbars.md)
- [Tooltips](tooltips/tooltips.md)

## Visualization components

- [Diagrams](diagrams/diagrams.md)

This inventory follows the official
[Material 3 component catalog](https://m3.material.io/components). Every listed
family uses the expressive contract above. Keep case-specific combinations out
of this catalog; compose them under [patterns](../patterns/patterns.md).
