# ISSUE-004: Verify contract behavior and fallback paths

## Status

- Status: Done
- Epic:
  [Deliver `ptlam-explain-with-analogy` v1](../../epics/ptlam-explain-with-analogy-v1-epic.md)
- PRD requirement: Validation plan and acceptance criteria

## Problem

Structural validity alone cannot prove the one-scenario, progressive-learning,
optional-visualizer, and host-native fallback contracts. The repository needs
focused executable checks plus independent forward validation.

## Scope

- Add contract tests that read the skill and metadata.
- Verify literal-first ordering and stable mapping rules.
- Verify connected context for one concept.
- Verify combined mechanisms, progressive scenes, and prerequisites.
- Verify meaningful interactions and accessibility alternatives.
- Verify optional visualizer routing and the complete fallback.
- Verify metadata and catalog registration once integration lands.
- Run the full repository suite.
- Forward-test with minimal-context agents after implementation is complete.

## Owned files

- `tests/skills/productivity/ptlam-explain-with-analogy/**`

The coordinating agent owns ephemeral forward-test prompts and removes any
temporary artifacts they create.

## Acceptance criteria

- Targeted tests fail against an absent or materially incomplete skill.
- Targeted tests pass against the finished implementation.
- Tests require no network, renderer, or visualization runtime.
- Tests assert no hard visualization dependency.
- Structural validation passes.
- Markdown formatting and lint pass.
- Catalog validation and drift checks pass.
- The complete repository suite passes.
- One forward test uses an available visualizer path.
- One forward test exercises the no-visualizer fallback path.
- Forward tests receive the skill and user-like requests, not expected answers
  or diagnoses.
