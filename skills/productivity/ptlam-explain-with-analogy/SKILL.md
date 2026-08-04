---
name: ptlam-explain-with-analogy
description:
  Teach an unfamiliar, abstract, or complex topic through one coherent real-life
  analogy with stable concept mappings, connected context, progressive visual
  scenes, and meaningful interaction. Use when the user asks how something
  works, wants a simple or intuitive visual explanation, asks for an analogy or
  metaphor, or needs to understand architecture, relationships, workflow,
  structure, lifecycle, ownership, cardinality, comparison, or cause and effect.
  Use even for one concept when its role depends on surrounding components.
---

# PTLam Explain with Analogy

Build one familiar world that preserves the structure of the real topic. Make
the visual experience primary, keep exact facts literal, and finish by returning
the learner to the real system.

## Coordinate the explanation

Keep one coordinating agent responsible for the dependent chain from literal
model through final audit. Do not require subagents. When subagents are
available and authorized, use them only for independent candidate exploration
after the literal model is fixed or independent fidelity, boundary,
accessibility, and visual checks after a complete draft exists. Retain ownership
of the chosen scenario, mapping ledger, progression, and integrated answer.

Ask a question only when the missing answer would materially change the topic's
meaning, scope, safety, or an explicit output constraint. Infer ordinary choices
such as format detail from the request and host capabilities.

## Build the literal model first

Before choosing an analogy, write an internal truth model of the learning
target. Include every relevant item below:

- actors and objects;
- ownership, containment, and dependency direction;
- inputs, outputs, producers, consumers, and responsibility handoffs;
- order, branching, repetition, and causal rules;
- states, transitions, lifetime, and loss consequences;
- cardinalities and identity; and
- exact terms, values, constraints, exceptions, and failure behavior.

For a single requested concept, include its minimum connected context: who owns
or uses it, what enters and leaves it, which neighbors affect it, how its state
changes, and what breaks when it is missing. Do not teach an isolated label.

Record every applicable learning mechanism; do not force the topic into one
exclusive category:

- relationships and dependencies;
- workflow and responsibility handoffs;
- structure, hierarchy, containment, and ownership;
- states and lifecycle;
- differences and tradeoffs; and
- cause and effect, dynamic rules, and exploration.

Never choose a visual form from concept count, content amount, or apparent
simplicity.

## Choose one real-life scenario

Consider familiar scenarios only after the literal model is stable. Prefer the
candidate with the best structural fidelity, coverage, familiarity, and lowest
explanation cost. Require it to cover every mechanism in scope without hiding a
material behavior.

Use exactly one scenario for the complete explanation. Several rooms, views,
events, or scenes are allowed only as chapters inside that same world. Never mix
metaphors to patch a weak match.

Create a mapping ledger with one row per essential literal concept:

```text
literal concept -> scenario counterpart -> preserved behavior -> known limit
```

Map each literal concept to one stable role, object, place, action, state, or
record. Do not reuse one scenario element for unrelated concepts. Preserve the
properties that matter, including ownership, direction, production and
consumption, cardinality, state change, lifetime, and loss consequences. Keep
names, colors, positions, and other visual anchors stable across all scenes.

Audit the candidate against every row and mechanism. If a material mismatch
appears, discard the candidate and try another scenario before asking the
learner to narrow the target. Never conceal a mismatch to save the story.

## Plan progressive scenes

Use the minimum ordered set of scenes that covers all learning mechanisms
without overloading one view. For every scene, record:

```text
prerequisites | reused mappings | one new idea | learner action or observation | takeaway
```

Introduce no term or mapping before its prerequisite. Reuse the same scenario
counterparts and visual anchors from earlier scenes. Let each takeaway supply
the knowledge needed by the next scene.

Select a truthful visual treatment for the mechanism:

- use a connected map for relationships and dependencies;
- use a step-through flow, sequence, or swimlane for workflow and handoffs;
- use containment, a tree, or an exploded view for structure and ownership;
- use a controllable state view for lifecycle;
- use synchronized side-by-side views for differences and tradeoffs; and
- use controls or a small simulation for cause and effect.

Combine several ordered treatments when several mechanisms apply. These routes
are patterns, not a closed allowlist.

## Make interaction teach

Add interaction or motion only when it reveals a real relationship, handoff,
order, containment rule, transition, comparison, or causal consequence.

- Use click or tap to inspect roles, links, handoffs, and states.
- Use drag only when position, order, containment, or ownership has literal
  meaning. Provide equivalent keyboard move or target controls.
- Use buttons, toggles, sliders, or inputs to trigger transitions, branches, or
  causal changes.
- For sequence or motion, provide progress plus step, back, play, pause, replay,
  and reset controls as applicable.
- Make every consequential action reversible and provide a reset.
- Keep changed state visible and announce it to assistive technology.
- Preserve the same information under reduced motion and without animation.

Do not add decorative animation, gestures, or gamification. Prefer a clear
static visual when interaction would teach nothing.

## Route visualization without owning an engine

If a compatible visualization skill is already available, use it for rendering,
format mechanics, accessibility, and visual or browser validation. For example,
`$ptlam-visualization` can implement an HTML or Mermaid route. Treat this as an
optional capability, never a required dependency, and do not stop to install or
search for it.

Pass the visualizer a complete handoff:

- chosen scenario and stable mapping ledger;
- literal relationships, exact facts, constraints, and failure behavior;
- ordered scenes, prerequisites, reused mappings, and takeaways;
- required learner actions and accessibility behavior;
- requested format, destination, and language; and
- every analogy boundary.

Continue to own analogy correctness, structural fidelity, scene order, and the
literal recap. Reject a visually polished result that changes a mapping or
literal rule.

When no compatible visualizer is available, continue with the smallest
host-native route that can be created and validated:

1. Use portable HTML, CSS, and JavaScript when meaningful interaction or state
   is required.
2. Use a small host-renderable Mermaid diagram when static connected structure
   is sufficient.
3. Use another connected native visual supported by the host.
4. Use a text tree or arrow flow with a compact mapping legend only as the final
   fallback.

Keep the fallback a complete visual-first explanation in the same scenario, not
an error, a tooling detour, or a long prose substitute.

## Deliver and audit

Lead with the visual or interactive learning experience. Place important literal
terms beside their scenario counterparts. Use a compact mapping legend and short
supporting text for precision and accessibility; do not duplicate the whole
visual in prose or make a table the primary teaching surface.

Keep exact definitions, values, constraints, exceptions, and source facts
visibly literal and separate from simplifying assumptions. Then include:

1. a brief **Where the analogy stops** section naming every material mismatch;
2. a compact **Back to the real system** flow or paragraph that reconstructs the
   literal actors, relationships, sequence, states, and consequences without
   depending on the analogy.

Before delivery, verify:

- one scenario covers the whole explanation;
- every essential concept has one stable, non-colliding mapping;
- even a single concept appears with its essential connected context;
- every applicable mechanism is covered by an ordered scene;
- every interaction exposes literal behavior and has the required accessible,
  reversible, reset, and reduced-motion paths;
- exact facts remain literal and every material boundary is named; and
- the learner can reconstruct the real topic from the final recap alone.
