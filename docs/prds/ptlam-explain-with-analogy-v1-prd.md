# PRD: `ptlam-explain-with-analogy` v1

## Document status

- Status: Implemented and validated
- Date: 2026-08-04
- Product: `ptlam-skills`
- Skill: `ptlam-explain-with-analogy`
- Category: `productivity`
- Epic:
  [Deliver the v1 analogy-learning skill](../epics/ptlam-explain-with-analogy-v1-epic.md)

## Summary

`ptlam-explain-with-analogy` teaches an unfamiliar topic through one coherent,
familiar real-life scenario. It first models the literal topic, maps every
essential concept to one stable analogy counterpart, and then presents the
system through connected, progressive visual scenes.

The output is visual-first and interactive when interaction improves learning.
The skill may delegate rendering and browser validation to an available
visualization skill such as `ptlam-visualization`. That integration is optional:
the analogy skill ships no visualization engine, runtime, renderer, script, or
hard skill dependency. When no compatible visualizer is present, the agent uses
the smallest host-native visual treatment it can create and validate itself.

## Problem

Unknown concepts are often explained as isolated definitions, unrelated
metaphors, or long prose. Those approaches make the learner remember words
without understanding how the concept relates to owners, neighbors, inputs,
outputs, state, sequence, or failure behavior.

Even a memorable analogy can be misleading when:

- it is selected before the real topic is modeled;
- one analogy object changes meaning during the explanation;
- multiple metaphors are mixed to cover missing relationships;
- the visual form is selected from concept count instead of the mechanism being
  learned;
- combined mechanisms are compressed into one overloaded diagram;
- interaction is decorative rather than revealing real behavior;
- a rich renderer is treated as mandatory and the answer fails without it; or
- the learner remembers the story but cannot reconstruct the literal topic.

Agents need a reusable reasoning and delivery contract that preserves source
truth while connecting it to one familiar world the learner can see, manipulate,
and progressively understand.

## Goals

1. Explain any unfamiliar, abstract, or complex topic through exactly one
   coherent real-life scenario.
2. Model the literal topic before choosing an analogy.
3. Keep one stable, non-colliding mapping for every essential concept.
4. Show even one simple concept in its essential connected context.
5. Select visual treatments from the mechanism being learned: relationships,
   workflow, structure, states, comparison, cause and effect, or a combination.
6. Compose combined mechanisms as ordered scenes that build on previously
   introduced knowledge.
7. Prefer meaningful visual interaction over long prose or a primary table.
8. Preserve exact literal facts and explicitly mark where the analogy stops.
9. Use a compatible visualization skill when available without making it a hard
   dependency.
10. Produce a useful host-native fallback when no visualization skill is
    available.
11. Ask the learner only questions whose unresolved answers would materially
    change meaning, scope, safety, or output constraints.
12. End with a compact literal reconstruction of the real topic.

## Non-goals for v1

- Shipping a visualization, Mermaid, HTML, animation, or browser engine
- Bundling visualization scripts, assets, runtimes, templates, or dependencies
- Requiring `ptlam-visualization` or any other named skill
- Installing, updating, or discovering plugins through a custom installer
- Recreating the former `ptlam_harness` installer, state, transaction, recovery,
  target-profile, or host-filesystem systems
- Guaranteeing that one fixed analogy fits every topic
- Maintaining a catalog of preferred metaphors
- Replacing exact definitions, constraints, numbers, exceptions, or source
  documentation with an analogy
- Treating tables or prose as the primary teaching surface when a useful visual
  can be validated
- Adding decorative animation, gestures, or gamification that do not reveal real
  behavior
- Requiring subagents or parallel execution to produce an answer
- Publishing or hosting generated learning artifacts unless the user explicitly
  requests that lifecycle action

## Users and jobs

### Visual learner

The learner wants to understand an unfamiliar topic by seeing familiar objects
interact, changing state, and revealing consequences through direct action.

### Learner asking about one concept

The learner names one concept but needs its owners, neighbors, inputs, outputs,
and state effects to understand its role rather than memorize a definition.

### Learner asking about a system

The learner needs relationships, workflow, structure, lifecycle, differences, or
causal rules explained together without switching metaphors.

### Agent producing the explanation

The agent needs a deterministic reasoning order, an honest analogy boundary, a
visual routing algorithm, and a fallback that does not depend on a particular
host or renderer.

### Skill maintainer

The maintainer needs a compact, portable skill whose behavior can evolve without
absorbing visualization-engine responsibilities.

## Product decisions

1. One real-life scenario covers the complete explanation.
2. One scenario may contain several scenes, views, events, or interactions; they
   are chapters in the same world, not separate analogies.
3. The literal topic is modeled before analogy selection.
4. The analogy is selected for structural fidelity, coverage, familiarity, and
   low explanation cost, not novelty.
5. A mismatched analogy is discarded and replaced before the learner is asked to
   narrow the target.
6. Every essential source concept has one stable analogy counterpart.
7. Even a single requested concept is shown with the minimum connected context
   required to understand its role.
8. Visual form is selected from how the target works, never from content amount
   or concept count.
9. More than one learning mechanism may apply. The skill composes the minimum
   ordered set of scenes that covers them.
10. Each scene introduces a small new idea using mappings established by earlier
    scenes.
11. Interaction must expose a real relationship, transition, handoff, ordering,
    containment, comparison, or causal effect.
12. Dragging is used only when placement, order, containment, or ownership has
    literal meaning and always has a keyboard-accessible alternative.
13. Text and a mapping table are supporting explanation, accessibility, and
    precision surfaces rather than the primary learning interface.
14. Exact facts remain literal and visibly distinct from simplifying
    assumptions.
15. The explanation identifies every material point where the analogy stops
    matching.
16. A compatible visualization skill owns rendering, accessibility, format
    mechanics, and visual validation when used; this skill retains ownership of
    analogy correctness and learning sequence.
17. Visualization integration is capability-based and optional. V1 declares no
    required skill dependency and ships no visualization engine.
18. The host-native fallback remains a complete answer, not an error message or
    tooling search.
19. Dependent reasoning stays with one coordinating agent. Only independent
    candidate exploration and completed-draft validation may be parallelized
    when subagents are available and authorized.
20. The final step restates the literal system so the learner can leave the
    analogy behind.

## Vocabulary

- **Literal model:** The real concepts, relationships, rules, states, and
  failure behavior that the learner must retain.
- **Scenario:** The single familiar real-life world used for the analogy.
- **Mapping ledger:** The stable one-to-one record from each essential literal
  concept to its analogy counterpart and preserved behavior.
- **Learning mechanism:** What the learner needs to understand, such as a
  relationship, workflow, structure, state transition, difference, or cause and
  effect.
- **Scene:** One ordered visual or interactive chapter inside the scenario.
- **Learning action:** What the learner clicks, moves, changes, follows, or
  observes to expose meaning.
- **Analogy boundary:** A material property that the scenario does not preserve.
- **Visualizer:** An optional compatible skill or host capability that renders
  and validates the selected presentation.
- **Host-native fallback:** A visual treatment the current agent can create and
  validate without a dedicated visualization skill.

## Functional requirements

### ANA-001: Trigger and scope

The skill must trigger for requests to understand how something works, receive a
simple or intuitive explanation, use an analogy or metaphor, or learn connected
architecture, relationships, workflow, structure, state, ownership, cardinality,
comparison, or causal behavior.

The agent must infer ordinary preferences from current context. It asks a
question only when the answer would materially alter meaning, scope, safety, or
an explicit output constraint.

### ANA-002: Literal model first

Before choosing an analogy, the agent must identify the essential actors,
objects, owners, directions, sequence, states, rules, cardinalities, lifetimes,
inputs, outputs, and failure consequences relevant to the learning target.

The agent must include essential connected context even when only one concept
was requested.

### ANA-003: One scenario selection

The agent must evaluate candidate real-life scenarios against the literal model.
The selected scenario must cover every learning mechanism in scope without
changing mappings or hiding material behavior.

When the selected candidate exposes a material mismatch, the agent must try a
different scenario before asking the learner to narrow the target. It must never
silently combine metaphors.

### ANA-004: Stable mapping ledger

Each essential source concept must map to one analogy role, object, location,
action, state, or record. One analogy element must not represent unrelated
source concepts. Names and visual anchors must remain stable across all scenes.

The explanation must preserve ownership, production and consumption,
cardinality, state change, lifetime, and loss consequences when those properties
matter.

### ANA-005: Mechanism classification

The agent must record every applicable mechanism rather than force the target
into one exclusive category:

- relationships and dependencies;
- workflow and responsibility handoffs;
- structure, hierarchy, containment, and ownership;
- states and lifecycle;
- differences and tradeoffs; and
- cause and effect, dynamic rules, and exploration.

Concept count, content amount, and apparent simplicity must not select the
visual form.

### ANA-006: Progressive scenes

When several mechanisms apply, the explanation must use the minimum ordered set
of scenes needed for coverage instead of one overloaded view.

Each scene must define:

- prerequisite knowledge;
- mappings reused from earlier scenes;
- one small new idea;
- the learner action or observation; and
- the takeaway needed by a later scene.

A scene must not depend on a term or mapping that has not yet been introduced.
The primary artifact may contain several scenes, but all scenes must remain in
the same scenario.

### ANA-007: Visual-first response

The explanation must lead with the visual or interactive learning experience.
Text and a compact mapping legend may support exact terms, accessibility, and
precision. They must not repeat the complete visual explanation at length.

Important nodes must place the literal term beside its analogy counterpart.

### ANA-008: Visualization routing

The agent must select the smallest truthful treatment for each mechanism:

- a connected map for relationships and dependencies;
- a step-through flow, sequence, or swimlane for workflow;
- containment, tree, or exploded view for structure and ownership;
- a controllable state view for lifecycle;
- a synchronized side-by-side view for differences; and
- controls or a simulation for cause and effect.

These are routing patterns, not a closed allowlist. Combined mechanisms may use
several ordered treatments.

### ANA-009: Meaningful interaction

The agent should use:

- click or tap to inspect roles, links, handoffs, and states;
- drag only for meaningful position, order, containment, or ownership;
- buttons, toggles, sliders, or inputs to trigger transitions, branches, and
  causal changes; and
- step, back, play, pause, replay, and reset controls when sequence or motion is
  relevant.

Every consequential interaction must be reversible. Changed state must remain
visible and be announced to assistive technology. Dragging must have an
equivalent keyboard-accessible move or target control. Reduced motion must
preserve the same information.

### ANA-010: Optional visualizer integration

When a compatible visualization skill is available, the agent should pass it:

- the chosen scenario;
- the mapping ledger;
- literal relationships and constraints;
- ordered scenes and prerequisites;
- required interaction;
- requested format, destination, and language; and
- analogy boundaries.

For example, `$ptlam-visualization` may own HTML or Mermaid routing, rendering,
accessibility, and browser validation. The analogy skill must continue to own
scenario fidelity, mapping stability, learning progression, and literal recap.

The package must declare no hard visualization dependency and must not assume
that `$ptlam-visualization` exists.

### ANA-011: Host-native fallback

If no compatible visualizer is available, the agent must continue without a
tooling detour and choose the smallest route it can validate:

1. portable HTML, CSS, and JavaScript for meaningful interaction or state;
2. a small host-renderable Mermaid diagram for sufficient static structure;
3. another connected native visual available in the host; or
4. a text tree or arrow flow with a compact mapping legend as the final
   fallback.

The fallback must remain useful and must preserve the one-scenario contract.

### ANA-012: Analogy boundary and literal recap

The output must include a brief boundary section for every material mismatch. It
must then reconstruct the literal topic in one compact flow or paragraph.

### ANA-013: Execution strategy

One coordinating agent must own the dependent chain from framing through final
audit. The skill must not require subagents.

When subagents are available and authorized, the coordinator may parallelize:

- candidate scenario generation or scoring after the literal model is fixed; and
- independent fidelity, boundary, accessibility, and visual checks after a
  complete draft exists.

The coordinator owns the final scenario, mapping ledger, integration, and audit.

## Packaging requirements

The v1 package contains only:

```text
skills/productivity/ptlam-explain-with-analogy/
├── SKILL.md
└── agents/
    └── openai.yaml
```

It must not contain scripts, assets, visualization references, a renderer,
runtime packages, persistent state, or installation logic.

The plugin catalog must register the skill exactly once as a productivity
product with `required_skill_ids: []`.

## Validation plan

1. Run the Agent Skills structural validator.
2. Run repository catalog validation and generated-output drift checks.
3. Run Markdown formatting and lint checks.
4. Add contract tests for the one-scenario, mapping, progressive-scene,
   interaction, optional-visualizer, and fallback rules.
5. Run the complete repository test suite.
6. Forward-test the finished skill through isolated agents using realistic
   prompts and minimal context.
7. Inspect the final diff for unrelated files, hard visualization dependencies,
   bundled engines, and absolute project-specific assumptions.

## Acceptance criteria

V1 is complete when:

1. `ptlam-explain-with-analogy` is discoverable through accurate skill metadata,
   the root catalog, productivity catalog, and Claude plugin manifest exactly
   once.
2. The skill models the literal topic before selecting one real-life scenario.
3. Every essential concept has one stable, non-colliding mapping.
4. A single requested concept is presented in its essential connected context.
5. The skill selects visual treatments from learning mechanisms, not concept
   count or content amount.
6. Combined mechanisms produce progressive scenes that reuse prior mappings and
   introduce no unexplained prerequisite.
7. Interactions expose real behavior and include reversal, reset, keyboard, and
   reduced-motion paths where relevant.
8. Exact facts and analogy assumptions remain distinguishable.
9. Every material mismatch is named and the output ends with a literal recap.
10. `$ptlam-visualization` or another compatible visualizer may be used when
    available, but the skill declares no required visualization dependency.
11. Without a visualization skill, the host-native fallback still produces a
    complete useful answer.
12. The skill package contains no visualization engine, scripts, assets,
    runtime, installer, or persistent state.
13. Structural validation, catalog checks, Markdown checks, contract tests, and
    the complete repository suite pass.
14. Independent forward tests demonstrate the one-scenario and fallback behavior
    without relying on leaked implementation conclusions.

## Risks and mitigations

| Risk                                             | Mitigation                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------- |
| A vivid analogy distorts the real topic          | Model the literal system first, preserve exact facts, and expose boundaries   |
| Combined mechanisms produce a dense visual       | Use progressive scenes ordered by prerequisites                               |
| Several scenes become several metaphors          | Keep one scenario, stable mapping ledger, names, colors, and anchors          |
| Interaction becomes decoration                   | Require every action to reveal a literal behavior or consequence              |
| Dragging excludes keyboard or touch users        | Require move or target controls and visible state                             |
| An agent assumes `ptlam-visualization` exists    | Keep `required_skill_ids` empty and define a complete fallback                |
| The analogy skill grows into a renderer          | Keep the package to `SKILL.md` and UI metadata only                           |
| The fallback becomes long prose                  | Preserve visual-first routing and make text the final fallback                |
| Parallel workers introduce inconsistent mappings | Keep one coordinator as scenario and ledger owner                             |
| The skill becomes overlong                       | Keep universal algorithms in `SKILL.md` and avoid variant catalogs or engines |

## Open questions

None. Owner feedback from the completed Lavish review is incorporated into this
v1 contract.
