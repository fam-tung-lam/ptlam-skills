# ISSUE-001: Implement the analogy reasoning contract

## Status

- Status: Done
- Epic:
  [Deliver `ptlam-explain-with-analogy` v1](../../epics/ptlam-explain-with-analogy-v1-epic.md)
- PRD requirements: ANA-001 through ANA-007, ANA-012, ANA-013

## Problem

An analogy selected too early can become memorable but wrong. The skill needs a
literal-first reasoning contract that preserves one stable scenario, connected
context, exact facts, and an honest boundary.

## Scope

- Define complete trigger metadata.
- Model actors, objects, owners, direction, sequence, states, rules,
  cardinalities, lifetimes, inputs, outputs, and failure consequences first.
- Select one structurally faithful real-life scenario.
- Retry a different scenario before narrowing scope.
- Maintain one stable non-colliding mapping ledger.
- Keep simple concepts connected to their essential context.
- Preserve literal facts and analogy boundaries.
- End with a compact literal recap.
- Keep the dependent workflow under one coordinating agent.

## Owned files

- `skills/productivity/ptlam-explain-with-analogy/SKILL.md`
- `skills/productivity/ptlam-explain-with-analogy/agents/openai.yaml`

ISSUE-002 shares these files and must be implemented by the same workstream.

## Acceptance criteria

- Frontmatter contains only `name` and `description`.
- The description states what the skill does and when it triggers.
- The body models the real topic before analogy selection.
- Exactly one scenario covers the complete explanation.
- Several scenes remain chapters inside that scenario.
- Every essential concept has one stable mapping.
- One simple concept is never taught in isolation.
- Scenario mismatch causes candidate replacement before scope narrowing.
- Exact facts and material analogy boundaries remain explicit.
- The output ends with the literal real system.
- The workflow does not require subagents.
