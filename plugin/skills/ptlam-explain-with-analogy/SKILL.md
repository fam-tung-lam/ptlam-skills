# PTLam Explain with Analogy

Build one familiar world that preserves the structure of the real topic. Make
the visual experience primary, keep exact facts literal, and finish by returning
the learner to the real system.

<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->

## Coordinate the explanation

Keep one coordinating agent responsible for the dependent chain from literal
model through final audit. Do not require subagents. When subagents are
available and authorized, use them only for independent candidate exploration
after the literal model is fixed or for independent fidelity, boundary,
accessibility, and visual checks after a complete draft exists. Retain ownership
of the chosen scenario, mapping ledger, progression, and integrated answer.

Ask a question only when the missing answer would materially change the topic's
meaning, scope, safety, or an explicit output constraint. Infer ordinary choices
such as format and detail from the request and host capabilities.

## Set goal-driven depth

State the learner's goal internally. Show the minimum complete ecosystem needed
to understand that goal: the requested concept, its owner or user, its essential
neighbors, what enters and leaves it, how its state changes, and what breaks
when it is absent. Do not teach an isolated label.

Deepen only to the mechanism required by the learner's goal. Stop before
unrelated implementation detail. Add another abstraction level only when the
current level cannot explain a relationship, responsibility, transition, or
failure that matters to the goal.

## Build and verify the literal model first

Write an internal truth model before choosing an analogy. Include every relevant
item below:

- actors, objects, groups, and system boundaries;
- ownership, containment, and dependency direction;
- inputs, outputs, producers, consumers, and responsibility handoffs;
- order, branching, repetition, and causal rules;
- states, transitions, lifetime, and loss consequences;
- cardinalities and identity; and
- exact terms, values, constraints, exceptions, and failure behavior.

Use risk-based verification:

- inspect and verify user-provided materials when they define the topic;
- consult authoritative primary sources for new, narrow, changeable, disputed,
  safety-critical, legal, medical, financial, or otherwise high-impact claims;
- explain stable foundational concepts from reliable existing knowledge when
  external research would not materially improve accuracy; and
- label uncertainty and keep unverified details out of the analogy.

Record every applicable learning mechanism; do not force the topic into one
exclusive category:

- relationships and dependencies;
- workflow and responsibility handoffs;
- structure, hierarchy, containment, and ownership;
- states and lifecycle;
- differences and tradeoffs; and
- cause and effect, dynamic rules, and exploration.

Never choose a visual form from concept count, content amount, or apparent
simplicity. Choose it from the mechanism the learner must see.

## Auto-select one real-life scenario

Generate several familiar candidates internally after the literal model is
stable. Auto-select the candidate with the best structural fidelity, coverage,
familiarity, and lowest explanation cost. Do not ask the learner to choose an
analogy unless no candidate passes the mapping gate.

Use exactly one scenario for the complete explanation. Treat rooms, teams,
objects, events, and views as parts of the same real-life ecosystem. Never mix
metaphors to patch a weak match.

Create a mapping ledger with one row per essential literal concept:

```text
literal concept -> scenario counterpart -> preserved behavior -> known limit
```

Apply the strict mapping gate before rendering:

1. Map every essential literal concept to one stable scenario element.
2. Preserve ownership, direction, production and consumption, cardinality, state
   change, lifetime, loss consequences, and abstraction boundary.
3. Reuse no scenario element for unrelated concepts.
4. Preserve the same names, colors, positions, and identities across scenes.
5. Reject the candidate when any material behavior needs a misleading mapping,
   an unexplained exception, or a second metaphor.

Keep mappings non-colliding: one analogy element must not represent unrelated
literal concepts.

Try another candidate when the gate fails. Ask the learner to narrow the goal
only when no coherent candidate can cover the requested mechanism. If a material
mismatch appears, discard the candidate rather than weakening a literal rule.

## Plan one top-to-bottom learning path

Use one scrollable, top-to-bottom narrative. Do not hide the main learning path
behind tabs. Use the minimum ordered set of scenes that covers the goal without
overloading a view. For every scene, record:

```text
prerequisites | reused mappings | one new idea | action or observation | takeaway
```

Introduce no term or mapping before its prerequisite. Reuse scenario elements
and visual anchors from earlier scenes. Let each takeaway supply the knowledge
needed by the next scene.

Lead each mechanism with its interactive visual. Add only the short text needed
for instructions, precision, accessibility, or analogy limits. Remove any prose,
table, recap, or later section that repeats what a preceding interactive visual
already teaches. Do not make a table the primary teaching surface.

Do not add learner quizzes, knowledge checks, or validation exercises by
default. Add checks only when the learner explicitly requests them, and place
them in the same artifact after the explanation.

## Synchronize the analogy and literal system

Render the real-life and literal systems as synchronized twins whenever the
analogy teaches topology, flow, or state. Give corresponding nodes, edges,
groups, states, and transitions the same semantic identities. Keep both twins on
the same abstraction level and current step.

Make selection, focus, transition, and state changes appear in both twins at
once. Never animate a scenario action without revealing its literal counterpart.
Place important literal terms beside their scenario counterparts so the learner
does not need to translate from memory.

For dense systems, use C4-like semantic zoom:

1. Start with the system in its surrounding world.
2. Zoom into major groups or containers.
3. Zoom into components only when the goal requires their mechanism.
4. Provide a visible way to zoom out and preserve the selected path.

Build each level as a truthful connected map, not a scaled-up copy. Keep parent
and child boundaries explicit. Synchronize the analogy and literal twin at every
level.

## Choose interactive diagrams from the mechanism

Select and combine these treatments as needed:

- use a connected map for relationships and dependencies;
- use C4-like semantic zoom for boundaries and nested systems;
- use a step-through flowchart or swimlane for workflow and handoffs;
- use an interactive sequence diagram for time-ordered messages;
- use containment, a tree, an exploded view, or an ERD for structure, ownership,
  identity, and cardinality;
- use a controllable state diagram for lifecycle;
- use synchronized side-by-side views for differences and tradeoffs; and
- use controls or a small simulation for cause and effect.

Combine several ordered treatments when multiple mechanisms apply; keep their
shared identities and state synchronized.

For a flow with changing state, compose one teaching unit:

- place the active flowchart on the left;
- place live state, frames, messages, or records on the right;
- place one shared control plane below both views;
- always provide manual step, back, and reset controls;
- add autoplay with play, pause, and replay only when it improves learning;
- animate the active node and the transition to the next node; and
- update both twin diagrams and the state panel atomically.

Apply the same composition to sequence diagrams: show the active sequence on the
left, the current frame or state on the right, and shared controls below.
Highlight the active lifelines, message, state delta, and corresponding analogy
event at every step.

When teaching memory layers or prompt tiers, do not leave stable, context, and
volatile as text rows. Give each type a stable real-life counterpart and render
their containment, lifetime, refresh cadence, and loss consequence as an
analogy-mapped visual.

Add interaction or motion only when it reveals a real relationship, handoff,
order, containment rule, transition, comparison, or causal consequence. Make
every consequential action reversible. Keep changed state visible and announce
it to assistive technology. Under reduced motion, preserve the same information
and manual controls; disable autoplay and remove or simplify animation without
hiding the active state or transition.

Every consequential interaction must be reversible and provide a reset path.

Use click or tap to inspect a role, link, handoff, group, or state. Use drag
only when position, order, containment, or ownership has literal meaning, and
provide an equivalent keyboard or target-control path.

## Hand off rendering without surrendering semantics

Prefer `$ptlam-visualization-with-html` for rich, portable, interactive HTML
when it is available. Keep the renderer optional: do not stop to install, search
for, or repair a missing visualization skill.

Pass the renderer one explicit contract:

```text
learning goal and stopping depth
literal truth model and source confidence
chosen scenario and mapping ledger with limits
abstraction tree and synchronized twin topology per level
ordered scenes with prerequisites and takeaways
diagram type and responsive composition per scene
node, edge, group, state, transition, and step identities
initial state, state deltas, branches, loops, and reset state
control behavior and animation cues
exact literal labels, facts, constraints, failures, and analogy boundaries
language, destination, portability, accessibility, and reduced-motion needs
```

Name the requested format, destination, and language together in the handoff.

Require the renderer to return the complete artifact plus browser or static
validation evidence. Review it against the contract. Reject a polished result
that changes a mapping, topology, literal rule, step order, or state transition.

Own the learning goal, depth, literal truth, verification, analogy choice,
mapping gate, topology, abstraction tree, scene order, state script, and final
literal reconstruction. Let the renderer own HTML/CSS/JavaScript mechanics,
layout, reusable visual components, responsive behavior, animation execution,
keyboard and screen-reader behavior, portability, and visual/browser QA. The
visualization skill owns rendering, accessibility mechanics, and browser
validation while this skill retains semantic ownership. This skill continues to
own analogy correctness, mapping stability, scenario fidelity, and the literal
recap.

### Host-native fallback

When no compatible renderer is available, continue with the smallest host-native
route that preserves the contract:

1. Create portable HTML, CSS, and JavaScript for required interaction or state.
2. Use a small host-renderable Mermaid diagram for static connected structure.
3. Use another connected native visual supported by the host.
4. Use a text tree or arrow flow with a compact mapping legend only as the final
   fallback.

Keep the fallback visual-first and complete. Do not replace it with an error,
tooling detour, or long prose explanation. Create and validate the host-native
output itself while preserving the complete same-scenario contract.

## Deliver and audit

Lead with the visual learning experience. End with:

1. a brief **Where the analogy stops** section naming every material mismatch;
2. a compact **Back to the real system** visual or paragraph that reconstructs
   literal actors, relationships, sequence, states, and consequences without
   depending on the analogy.

Before delivery, verify:

- the depth serves the stated goal and stops after the necessary mechanism;
- the minimum complete ecosystem is present;
- one scenario passes every mapping-gate row without collisions;
- analogy and literal twins preserve topology, abstraction level, and state;
- every diagram matches its learning mechanism;
- flows and sequences synchronize diagram, state or frames, and controls;
- dense systems provide coherent zoom in and zoom out;
- stable, context, and volatile memory receive analogy-mapped visuals when in
  scope;
- redundant prose and duplicate sections are absent;
- interactions are reversible, accessible, resettable, and reduced-motion safe;
- exact facts remain literal and every material boundary is named; and
- the learner can reconstruct the real topic from the final recap alone.
