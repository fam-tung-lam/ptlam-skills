# Choosing a Visual Treatment

Use this reference to turn the user's goal and the content's natural structure
into the smallest visual treatment that makes the answer easier to understand.
The examples below are prompts for reasoning, not an allowlist of artifact
types.

## Selection algorithm

1. State the job the artifact must help with: understand, compare, decide,
   inspect, locate, or explore. Identify the conclusion that must be visible
   first.
2. Describe the information without naming a chart or component. Note its
   relationships, order, nesting, measures, records, code, spatial coordinates,
   or other meaningful structure.
3. Identify the reader operation that exposes the answer: follow, contrast,
   rank, trace, scan, search, filter, or inspect detail.
4. Choose the least elaborate semantic HTML treatment that supports that
   operation. A heading and short list can be the right result.
5. Add another treatment only when it answers a distinct necessary question.
   Keep one clear reading order and avoid presenting the same fact twice.
6. Ask the user only when a choice would materially change meaning or scope.
   Otherwise, make the smallest reversible presentation choice.

If the content does not match a named example, repeat the algorithm from its
actual structure. Never force it into the nearest familiar family.

## Structural examples

| Natural structure              | Reader operation                   | Possible treatment                             |
| ------------------------------ | ---------------------------------- | ---------------------------------------------- |
| Relationships or dependencies  | Trace connection and impact        | Labeled graph, matrix, or linked cards         |
| Sequence or change over time   | Follow order and turning points    | Steps, timeline, or state flow                 |
| Hierarchy or containment       | Find ownership and depth           | Nested outline or tree                         |
| Comparable quantities          | Compare magnitude or composition   | Aligned values, bars, or table                 |
| Dense records                  | Scan, sort, filter, and inspect    | Responsive table or list-detail view           |
| Source code or structured text | Locate and explain exact parts     | Annotated excerpt or synchronized outline      |
| Spatial layout                 | Understand position or proximity   | Specialized map or spatial visualization       |
| Many optional perspectives     | Explore without losing the summary | Search, filter, highlight, or controlled views |

Derive other treatments the same way. For example, a constraint system may need
a compact rule table plus a dependency view because those answer different
questions; it does not need a new fixed content category.

## Composition

- Put the outcome and interpretation before controls or supporting detail.
- Give each view one purpose. State what a reader should learn from it.
- Keep labels, units, scales, legends, time ranges, and transformations beside
  the values they explain.
- Prefer progressive disclosure for secondary evidence, not for the main
  conclusion or a material caveat.
- Keep a coherent document order when styles and scripts are unavailable.
- Use interaction only for read-only exploration, such as revealing, sorting,
  filtering, highlighting, navigating, copying, or changing an explanatory view.
  Do not collect or persist a decision.

## Progressive enhancement

Place core content, conclusions, and caveats in the HTML before JavaScript runs.
Prefer native elements such as links, buttons, tables, and `details` where they
fit. Isolate enhancements so one failed controller does not break other content.

For Canvas, a chart, or a complex interactive diagram, include a nearby text
description or data table that communicates its values and conclusion. Make the
alternative available without interaction and keep it accurate when the visual
view changes. Optional controls may improve exploration, but must not be the
only way to reach an essential fact.

## Combined HTML and Mermaid

When routing selects HTML containing Mermaid-derived diagrams, also read
[combined-mermaid.md](combined-mermaid.md) and the selected Mermaid references.
Use the pinned renderer first, then assemble its accessible inline SVG and inert
canonical source record through the combined contract. HTML remains the complete
primary artifact and final browser-QA owner. Do not add a source sidecar unless
the user explicitly requests it as a co-primary output.

## Specialized visualization composition

HTML does not take ownership of a plot, statistical chart, map, floor plan, or
other specialized visualization merely because the result will appear on a web
page. Route that visualization through its specialized capability first. That
capability owns the data transformations, visual encoding, scales or projection,
accessibility, and validation of its output.

Use HTML only when the user also needs a richer page around that validated
output, such as narrative, evidence, comparison, or coordinated read-only
exploration. HTML then owns page structure, safe embedding, surrounding text,
portability, and final browser QA; it may not replace or weaken the specialized
capability's proof. If the richer page adds no value, return the specialized
artifact directly. This flow is external composition, not combined Mermaid,
unless an actual Mermaid diagram also satisfies the complete combined contract.

Apply the presentation priority and assembly contracts in
[design-system.md](design-system.md). Apply evidence labeling, accessibility,
privacy, and verification rules in
[quality-and-safety.md](quality-and-safety.md).
