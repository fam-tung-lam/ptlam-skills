# Prompting Best Practices

Use this reference when a skill must steer non-trivial reasoning, tool use,
output shape, long context, or agentic behavior. It adapts the durable guidance
from Anthropic's
[Claude prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).
Model-specific behavior can drift; verify the current target documentation
before depending on exact model names or runtime features.

## Contents

- [Clarity and context](#clarity-and-context)
- [Examples](#examples)
- [Prompt structure](#prompt-structure)
- [Output control](#output-control)
- [Tool use and action authority](#tool-use-and-action-authority)
- [Reasoning calibration](#reasoning-calibration)
- [Long context and state](#long-context-and-state)
- [Agentic work](#agentic-work)
- [Pruning](#pruning)
- [Prompt review](#prompt-review)

## Clarity and context

Write as if the agent is capable but new to the user's local norms. State the
outcome, relevant context, constraints, authority, and output shape explicitly.
Use ordered instructions when sequence or completeness matters.

Explain the reason behind a non-obvious rule. A reason helps the model transfer
the rule to unlisted cases; unexplained rigidity encourages literal compliance
without judgment.

Prefer one strong instruction over several restatements. Give each concept one
name and use it consistently.

## Examples

Use examples when the desired format, tone, boundary, or transformation remains
ambiguous after direct instruction. Make them:

- relevant to the real branch;
- varied enough to reveal the rule rather than one surface pattern; and
- clearly separated from instructions and user data.

For Claude targets, descriptive XML tags such as `<example>`, `<context>`, and
`<input>` can separate roles in a complex prompt. Verify that the target host
preserves the tags before relying on them.

Examples are reference, not the workflow's completion criteria. Avoid examples
that teach accidental values, paths, or provider assumptions.

## Prompt structure

Use the smallest structure that removes ambiguity:

- prose for one principle;
- bullets for a peer set of rules;
- numbered steps for ordered work;
- explicit headings or tags when instructions, data, and examples could be
  confused; and
- templates when the output schema is strict.

For large inputs, place the source material in a clearly bounded section and
put the task after it. Include source metadata when several documents must be
distinguished. Ask the agent to ground conclusions in the supplied material
when provenance matters.

## Output control

Describe what to produce rather than centering the unwanted form:

```text
Write connected prose with short headings and use a list only for discrete
items.
```

Match the prompt's organization to the requested output when practical. State
required fields, ordering, length constraints, language, and file destination.
Use an exact template only when exactness is part of the contract.

Keep formatting rules subordinate to meaning. Do not let a presentation rule
hide required evidence or produce an invalid artifact.

## Tool use and action authority

Use action verbs when implementation is authorized and advisory verbs when the
user wants analysis. Resolve ambiguity from local evidence before asking, but do
not infer authority for destructive, externally visible, or materially broader
actions.

Name a tool only when the target exposes it and the tool materially improves
reliability. Use fully qualified identifiers when the host requires them.

Request parallel operations only for independent work. Keep dependent actions
sequential and resolve real parameters before calling tools. Avoid speculative
calls whose side effects or cost exceed the task.

## Reasoning calibration

Use high-level principles when the model can choose among safe approaches. Add
an algorithm when a repeated decision otherwise varies. Reserve detailed
step-by-step reasoning instructions for fragile operations where intermediate
choices must be observable.

Constrain excessive exploration with a commitment rule:

```text
Choose the best-supported approach and continue until new evidence contradicts
it or the approach fails its completion criterion.
```

Ask for a final self-check against explicit acceptance criteria when omission is
the primary risk. Do not request hidden chain-of-thought or expose private
reasoning; request concise evidence, decisions, and verification instead.

## Long context and state

For long-running work:

- maintain a compact plan or progress record when the host supports it;
- store structured state in a structured format and narrative progress in prose;
- preserve exact file, ref, or artifact identities needed to resume safely;
- re-read controlling instructions after context restoration; and
- continue from verified state instead of reconstructing it from memory.

Use version control as a durable history mechanism only within the user's Git
authority. Do not turn progress tracking into extra repository files unless the
workflow needs them.

## Agentic work

Balance autonomy with impact. Encourage reversible local actions inside the
authorized scope. Require confirmation or an already explicit instruction for
destructive, difficult-to-reverse, externally visible, or shared-system changes.

Use subagents only when the host and user authorize them and the workstreams are
independent or benefit from isolated context. Keep one owner for integrated
decisions and conflict-prone edits.

Use prompt chaining when a pipeline genuinely needs an inspected intermediate
artifact. Prefer one coherent workflow when separate calls add no control or
information boundary.

## Pruning

Remove prompt content that:

- restates default model behavior without strengthening it;
- repeats one meaning with synonyms;
- introduces tools or variants without a decision rule;
- preserves old model behavior as if it were current;
- creates extra files, abstractions, or flexibility for hypothetical needs; or
- specifies mechanics the resolved target already guarantees.

Replace weak phrases such as "be thorough" with a checkable completion criterion
that names what must be accounted for.

## Prompt review

Before using the instructions, confirm that:

- the outcome and authority are explicit;
- the structure separates instructions, inputs, examples, and output schema;
- every branch has the context it needs and no unrelated context;
- tool names and target-specific mechanics are verified;
- positive target behavior dominates over negation;
- the degree of freedom matches the operation's risk;
- examples reveal a general rule rather than one answer; and
- every sentence changes behavior or supplies necessary context.
