# PTLam Explaining with Analogy

Explain a concept through one vivid, structurally faithful real-life analogy.
Keep this skill concerned with explanation semantics, not rendering tools or
delivery mechanics. Return the explanation to the calling agent so it can
choose how to present or transform it.

<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->

## Parse the request

Identify:

- the concept to explain;
- the learner's background and existing knowledge;
- the part that is confusing; and
- the requested depth, language, or output constraints.

If the concept is missing or too vague to explain accurately, ask what the
learner wants explained. Otherwise, infer ordinary presentation choices and
continue.

## Establish the literal model

Before choosing an analogy, identify the minimum real structure needed to
explain the concept accurately:

- essential actors, objects, and boundaries;
- ownership, containment, dependencies, and cardinality;
- inputs, outputs, order, handoffs, and causal rules;
- relevant states, transitions, lifetimes, and failure behavior; and
- exact constraints, exceptions, or facts that must remain literal.

Cover only the core mechanism needed for the learner's goal. Verify claims when
the request or risk requires it. Do not invent details to make an analogy fit.

## Present three analogy candidates

Generate exactly three candidates. Each candidate must:

- mirror the concept's relationships and behavior, not merely its appearance;
- use an everyday domain the learner can picture immediately;
- remain within one coherent world; and
- map essential concepts without collisions or material contradictions.

Prefer familiar starting points when they preserve the structure:

| Concept pattern | Possible analogy domains |
| --- | --- |
| Ordered sequential work | Recipe or assembly line |
| Fast storage and retrieval | Library or filing cabinet |
| Broadcasting to unknown listeners | Radio station or newsletter |
| Complexity behind a simple surface | Restaurant menu |
| Concurrent work | Multiple cooks in one kitchen |
| Agreed communication rules | Introductions or phone etiquette |
| Adjustment from observed output | Thermostat |
| Work distributed across resources | Traffic control |

Derive a better domain when these examples do not fit.

Present the candidates as a numbered list. For each candidate, include:

1. a short domain name; and
2. one sentence explaining the structural similarity.

Mark the strongest candidate with **(Recommended)**, then ask:

> Which analogy would you like me to use? You can also say “surprise me,” and
> I'll use the recommended one.

Stop after this question. Do not compose the explanation until the learner
chooses a candidate. If the learner says “surprise me,” use the recommended
candidate.

## Compose the explanation

Lock the chosen analogy domain and use it throughout. Calibrate vocabulary and
depth to the learner. Be vivid and playful without weakening precision.

Return exactly these four sections, in this order, with no extra introduction
or conclusion:

### In a sentence

Write one assertive, jargon-free sentence that captures the concept's essence.
Avoid hedges such as “basically” or “kind of.” Format it as a blockquote:

> [One-sentence summary]

### The map

Translate each essential story element into one real concept. Keep mappings
stable and non-colliding.

| In the story | In [concept name] | Why it maps |
| --- | --- | --- |
| [analogy element] | [concept element] | [structural similarity] |

### The story

Tell a short story entirely within the analogy domain, in second person. Never
name the real concept inside the story. Use an ordered list when sequence or
causality matters; otherwise use an unordered list. Start each single-beat item
with a relevant emoji.

### Where it breaks

Give one or two unordered-list bullets naming specific ways the analogy
misleads, omits behavior, or oversimplifies the real concept.

## Check the explanation

Before returning it, confirm that:

- every essential real concept has one stable analogy counterpart;
- ownership, direction, order, state, cardinality, and causality are preserved
  wherever they matter;
- no analogy element represents unrelated concepts;
- the story demonstrates the mechanism instead of merely decorating it;
- exact facts and constraints remain literal in the map or caveats; and
- the learner can recover the real concept from the map without relying on the
  story alone.

Reject the analogy and choose another candidate if a material rule requires a
misleading mapping, an unexplained exception, or a second metaphor.

## Handle follow-ups

| Learner asks for | Response |
| --- | --- |
| A different analogy | Present three fresh candidates, excluding the analogy just used. |
| More depth | Extend the same world to cover the requested advanced mechanism. |
| A simpler version | Re-run candidate selection with more everyday domains and beginner vocabulary. |
| A related concept | Start again for the new concept and link back only where it helps. |
| A challenge to the analogy | Name the limitation, explain the structural reason for the choice, and offer fresh candidates when needed. |
