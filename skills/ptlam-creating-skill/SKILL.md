---
name: ptlam-creating-skill
description:
  Create, review, or refactor predictable agent skills through explicit
  invocation, distinct branches, information hierarchy, completion criteria,
  context pointers, and single-source package design. Use when the user asks to
  turn a workflow or reference set into a new skill, revise an existing
  SKILL.md, or audit a skill without editing it. Resolve target-specific
  authored and generated boundaries and verify the package statically. Tests,
  evals, benchmarks, grading, comparisons, and trigger optimization remain
  outside this skill's scope.
---

# PTLam Creating Skills

Create, review, and refactor skills for **predictability**: the agent should
follow the same sound process on repeated runs even when the resulting content
varies. Keep ordered steps in this file and disclose detailed reference only
when its branch needs it.

## 1. Resolve the mode and target

1. Resolve whether the user wants to create, update, or review a skill. Keep a
   review read-only unless the user also requests changes.
2. Resolve the target repository, skill root, and host from explicit context and
   filesystem evidence. Do not assume the current directory or this skill's
   installation directory is the target.
3. Read repository instructions, adjacent skills, host documentation, schemas,
   generators, and static validators relevant to that target.
4. Identify authored sources, generated surfaces, supported resource
   directories, metadata ownership, and action authority. Preserve foreign and
   in-progress changes.

Complete this step when the mode, target, authority, authored surface, metadata
contract, and available static checks are unambiguous.

## 2. Capture intent as distinct branches

Extract evidence from the conversation and supplied materials before asking
questions. Establish:

- the reusable capability and expected outcome;
- each distinct way the skill will be invoked;
- the input, output, tools, dependencies, and side effects for each branch;
- the boundary against adjacent work; and
- the decisions a future agent should not have to rediscover.

Use examples to discover the general process, not as cases to optimize around.
Ask only when an undiscoverable answer would materially change compatibility,
scope, authority, or behavior.

Complete this step when every branch has one distinct trigger, one expected
outcome, and no unresolved material choice.

## 3. Choose invocation and granularity

Resolve the target's invocation mechanics instead of assuming one host's fields.
Where the target distinguishes them:

- choose model invocation when the agent or another skill must discover the
  skill autonomously, accepting the permanent description context load;
- choose user invocation when only the human should start it, accepting the
  human cognitive load; and
- introduce a router only when several user-invoked skills become difficult for
  the human to remember.

Split a skill only when a branch needs independent invocation or when a long
sequence exposes later steps that cause premature completion. First sharpen the
current step's completion criterion; split by sequence only when the criterion
cannot become sufficiently checkable.

Complete this step when invocation, skill boundaries, and every proposed split
have an explicit load or completion rationale.

## 4. Build the information hierarchy

Read [skill authoring best practices](references/skill-best-practices.md) before
designing or materially revising the package. It owns naming, package anatomy,
resource selection, progressive-disclosure patterns, executable resources, and
the static quality checklist.

Arrange content by immediacy:

1. Keep ordered actions in `SKILL.md`; end every step with a checkable and
   appropriately exhaustive completion criterion.
2. Keep reference inline only when every branch needs it at that point.
3. Move branch-specific detail into a directly linked reference. Write each
   context pointer so it says exactly when to load the file and what that file
   owns.

Co-locate each concept's definition, rules, and caveats. Give every meaning one
source of truth. Add `scripts/`, `assets/`, references, or host metadata only
when a concrete branch consumes them.

Complete this step when every content item has one owner and one hierarchy rung,
and every disclosed file has a precise context pointer from `SKILL.md`.

## 5. Write discovery metadata

Use a compact leading word that already appears in the user's prompts, domain,
or repository when one accurately anchors the skill. Write one trigger for each
distinct branch; collapse synonymous triggers that merely rename the same
branch.

For model invocation, make the description a precise model-facing context
pointer. For user invocation, keep its human-facing summary compact. Follow the
resolved target schema over generic examples.

When the target uses Claude-style inline YAML, read
[skill frontmatter specification](references/skill-frontmatter-spec.md). Do not
load or apply that host-specific schema when a manifest, generated frontmatter,
or another host owns metadata.

Complete this step when the target accepts the metadata and each description
phrase earns its context cost by identifying a distinct branch or reach rule.

## 6. Write the instructions

Read [prompting best practices](references/prompting-best-practices.md) when the
skill must steer non-trivial reasoning, tool use, output shape, long context, or
agentic behavior. Apply only the sections relevant to the resolved target and
branch.

Write the positive target behavior first. Use a prohibition only for a hard
guardrail that cannot be expressed positively, and pair it with the behavior to
perform instead. Explain non-obvious reasons, calibrate specificity to risk, and
use examples only when prose leaves the desired behavior ambiguous.

This skill authors and verifies skill packages statically. Its scope excludes
test cases, eval suites, baselines, benchmarks, graders, comparison viewers, and
trigger-optimization loops.

Complete this step when every branch can be followed without hidden context,
every action stays within authority, and every ordered step has a completion
criterion.

## 7. Prune for predictability

Review every sentence and resource for:

- **duplication**: move repeated meaning to one source of truth;
- **sediment**: remove stale or historical layers that no longer govern action;
- **sprawl**: disclose branch-specific reference behind a strong pointer;
- **no-op instructions**: remove text that does not change model behavior;
- **negation**: replace the named unwanted behavior with a positive target; and
- **weak leading words**: keep only words that reliably anchor invocation or
  execution.

Complete this step when every retained line changes behavior, defines a needed
concept, routes context, or establishes a completion criterion.

## 8. Verify statically

1. Inspect the final tree and diff for unintended or generated-file edits.
2. Check naming, metadata, marker count, local links, context pointers, resource
   routing, and user-facing host metadata against the target contract.
3. Run the target's static skill validator, formatter, compiler, and
   generated-output drift check when available.
4. Report authored and generated files, exact checks, unavailable checks, and
   remaining uncertainty without claiming unmeasured behavioral effectiveness.

Complete the task only when the authored package is structurally valid,
generated outputs are current, foreign work remains preserved, and the report
states every verification boundary.
