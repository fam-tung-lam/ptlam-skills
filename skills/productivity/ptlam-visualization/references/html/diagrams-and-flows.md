# Connected Diagrams, Semantic Zoom, and Live Flows

Use this reference when an HTML or combined artifact must explain relationships,
containment, abstraction levels, or a process whose system state changes. These
rules distill the useful interaction patterns from the `Inside Hermes` system
map and flow steppers; reuse the patterns, not its C4 taxonomy or visual theme.

## Contents

- [Choose the visual model](#choose-the-visual-model)
- [Build a connected topology](#build-a-connected-topology)
- [Implement arbitrary semantic zoom](#implement-arbitrary-semantic-zoom)
- [Synchronize a live flow](#synchronize-a-live-flow)
- [Compose the page](#compose-the-page)
- [Animate meaningfully](#animate-meaningfully)
- [Preserve route ownership](#preserve-route-ownership)
- [Pass the validation gates](#pass-the-validation-gates)

## Choose the visual model

Use a connected diagram when the reader must understand who acts on what, what
contains what, or how a change propagates. A grid of cards is not a relationship
view: it may describe entities, but it does not expose topology.

Choose among these models deliberately:

- Use one connected graph for a relationship or dependency question.
- Add visible group boundaries when ownership, category, lifecycle, or
  deployment boundary changes meaning.
- Use semantic zoom when one readable graph cannot show both the whole system
  and useful internal structure.
- Add a live flow when sequence, active responsibility, and changing state are
  necessary to understand the system.
- Keep a static diagram when interaction would reveal no new meaning.

Do not substitute camera pan or magnification for semantic zoom. Camera zoom
shows the same objects larger. Semantic zoom replaces a selected entity or group
with a new connected diagram at a deeper abstraction level.

## Build a connected topology

Model nodes, relationships, groups, and abstraction levels before styling.
Render from that model instead of positioning independent cards and drawing
decorative arrows afterwards.

For every level:

1. Define each node's role and owning group.
2. Define directed edges as `subject -> verb -> object`.
3. Draw every material relationship as a visible line or arrow.
4. Put a concise verb near the edge, outside nodes. Use small, plain, non-bold
   text without a pill or filled background.
5. Keep arrow direction and the sentence direction identical. For example,
   `daemon -> reads -> configuration`, not an arrow that contradicts the words.
6. Show meaningful group boundaries as labeled containers. Nest only when the
   domain actually contains or owns the child.
7. Route edges so they remain traceable and do not cross labels or node text.
8. Keep a node unconnected only when isolation is a truthful part of the model;
   explain that exception.

Use color and emphasis to reinforce node kind, group, state, or selection, not
as the only carrier of those meanings. Distinguish containment from runtime
flow: boundaries show structure; arrows show relationships or movement.

## Implement arbitrary semantic zoom

Allow any meaningful group or component to own a child level. Do not require a
fixed C4 sequence. A product may open into frontend and backend; backend may
open into service categories; a category into services; a service into its
components; and a component into database or code structure.

Represent each level as a complete view with at least:

- a stable level identifier, title, parent identifier, and short purpose;
- its own nodes, edges, and group boundaries;
- a child-level identifier on every zoomable node or group; and
- the state fields that can be shown or animated at that level.

When the reader activates a zoomable boundary:

1. Replace the current graph with the child graph; do not merely enlarge the
   selected box.
2. Update a visible path or breadcrumb that names every ancestor.
3. Provide an explicit Zoom out or Back action that returns to the parent.
4. Preserve the selected branch as context in the path and child title.
5. Announce the new level to assistive technology and move focus predictably.

Breadcrumb ancestors may be directly selectable. Empty-canvas click-to-zoom-out
may be an optional pointer shortcut, but never the only way back. Make zoomable
boundaries real buttons or keyboard-operable elements with an accessible name
that states the destination.

Do not put interactive zoom controls inside an ancestor with `role="img"`: that
role can flatten or hide the buttons from the accessibility tree. Name the
interactive diagram region as a group and give a separate text summary; reserve
`role="img"` for a static SVG or canvas with no interactive descendants.

An inward transition may scale and fade the child graph from the selected
boundary; an outward transition may reverse that direction. Treat this as
orientation, not proof of hierarchy. The changed title, path, and topology must
make the abstraction change understandable with animation disabled.

## Synchronize a live flow

Define the flow as an ordered state timeline. Each step should name the active
nodes, active edges, caption, status, and changed values. Use one render
function and one current-step index to update every dependent surface:

- connected diagram highlights;
- moving or emphasized relationship edges;
- system-state values and counters;
- current-step caption and supplemental explanation;
- progress or timeline position; and
- Previous, Next, Reset, Play, and Pause state.

Never maintain these surfaces with independent click handlers or duplicated step
numbers. Advancing, rewinding, resetting, seeking, or autoplaying must produce
the same state for the same index.

At each step, make four facts visible together: what is active, which
relationship is moving, what system value changed, and why the change matters.
Use manual Previous and Next as the dependable learning path. Add Play, Pause,
and a seekable timeline when observing the whole movement helps; do not require
autoplay to reach any content. Pause when the page loses visibility and define
whether changing semantic level preserves the current phase or resets it.

On wide screens, a large diagram beside a compact state and explanation panel
usually works well. At narrow widths, stack the connected diagram first, then
controls, state, and explanation. Keep all of them within one flow section so
their shared state remains obvious.

## Compose the page

Prefer one vertical learning narrative: establish the scenario or overview, then
place deeper maps and live flows in the order needed to understand them. Let the
reader continue by scrolling. A sticky table of contents or section links may
aid navigation without hiding the narrative.

Do not use tabs as the default way to separate consecutive explanation stages.
Use tabs only when the user explicitly requests them or must compare mutually
exclusive views in the same position. Semantic zoom is graph navigation, not a
tab switcher.

Keep the main conclusion and a non-interactive description in source order so
the document remains useful without JavaScript. Interaction should expose detail
or state, not hold the only explanation hostage.

## Animate meaningfully

Use motion to show direction, active responsibility, state transfer, or the
change of abstraction level. Good examples are a dashed edge whose offset moves
toward its arrowhead, a short pulse on a newly active node, and a brief
inward/outward transition between semantic levels.

Avoid continuous decorative motion, simultaneous competing animations, and
motion that implies a relationship absent from the model. Keep transitions
short, pauseable when continuous, and stable after completion.

Under `prefers-reduced-motion: reduce`, remove travel, pulsing, smooth
scrolling, and autoplay. Preserve the same active node, edge, state value,
progress, and level change through static emphasis. Do not make reduced motion a
less informative mode.

## Preserve route ownership

Do not change the selected HTML, Mermaid, or combined route merely to obtain
interaction.

- For Mermaid, keep pinned source canonical and retain its versioned validation
  and rendering contract.
- For combined HTML and Mermaid, validate and pre-render every diagram through
  Mermaid first. Let HTML coordinate level visibility, state, controls, and
  final browser behavior without discarding the matching inert source records.
- For HTML-only interaction, use semantic HTML and accessible SVG only when the
  content and behavior selected the HTML route. Provide a synchronized text
  alternative for complex SVG or Canvas views.

Do not treat a screenshot, a collection of cards, or an unvalidated hand-drawn
SVG as a substitute for the route-owned diagram proof.

## Pass the validation gates

In addition to the route's normal deterministic and browser checks, require all
applicable gates below.

### Topology gate

- Every modeled material edge is visible, directed correctly, and plainly
  labeled; labels do not collide with nodes or arrows.
- Group boundaries match the model, remain distinguishable without color, and do
  not visually sever relationships that cross them.
- No accidental orphan, clipped node, hidden arrowhead, or ambiguous crossing
  remains at the intended width.

### Semantic-zoom gate

- Every advertised zoom target opens the correct child topology.
- Breadcrumbs, direct ancestor navigation, explicit zoom-out, keyboard
  activation, focus, and accessible level announcements work at every depth.
- Zoom changes abstraction instead of only scaling the same graph.

### Synchronization gate

- Exercise Next, Previous, Reset, Play, Pause, and timeline seeking when
  present. The same step always produces the same nodes, edges, explanation,
  counters, progress, and control state.
- Run the full timeline forward and backward; no stale highlight or state value
  survives a transition.
- Verify visibility changes and semantic-level changes follow the declared
  pause, preserve, or reset behavior.

### Responsive and motion gate

- At desktop width, 320 CSS pixels, and 200% zoom, the graph, labels, group
  boundaries, controls, state, and explanation remain reachable without page
  overflow or occlusion. A contained diagram scroller is acceptable when the
  topology would otherwise become unreadable.
- Exercise pointer, touch-equivalent, and keyboard paths with visible focus.
- Verify the exact same states under reduced motion, with animation and autoplay
  disabled and no loss of meaning.

Treat a failed topology, navigation, synchronization, or accessibility gate as
blocking. Report an unexecuted gate as unverified, never passed.
