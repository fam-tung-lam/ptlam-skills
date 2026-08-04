# ISSUE-002: Route progressive visual learning without an engine

## Status

- Status: Done
- Epic:
  [Deliver `ptlam-explain-with-analogy` v1](../../epics/ptlam-explain-with-analogy-v1-epic.md)
- PRD requirements: ANA-005 through ANA-011

## Problem

The learner may need relationships, workflow, structure, state, comparison, and
causality together. The skill must compose truthful progressive visuals and
interaction without bundling a renderer or requiring another skill.

## Scope

- Classify every applicable learning mechanism.
- Select visual form from mechanism rather than concept count.
- Compose the minimum ordered scene sequence for combined mechanisms.
- Define prerequisites, reused mappings, new idea, action, and takeaway per
  scene.
- Use meaningful click, drag, buttons, toggles, sliders, state change, and
  controllable motion.
- Require keyboard, reset, reversibility, visible state, and reduced-motion
  equivalents.
- Delegate rendering to a compatible visualizer when available.
- Keep analogy correctness and progression in this skill.
- Provide a complete host-native fallback.
- Ship no engine, script, asset, runtime, or hard dependency.

## Owned files

- `skills/productivity/ptlam-explain-with-analogy/SKILL.md`
- `skills/productivity/ptlam-explain-with-analogy/agents/openai.yaml`

ISSUE-001 shares these files and must be implemented by the same workstream.

## Acceptance criteria

- Multiple mechanism types may be combined.
- Combined types become ordered scenes instead of one overloaded view.
- Each scene builds only on introduced mappings.
- Visual form is never selected from concept count or content amount.
- Interaction reveals real behavior and is not decorative.
- Dragging has a keyboard-accessible alternative.
- Sequential behavior has progress and reset controls.
- `$ptlam-visualization` is an optional example, not a required dependency.
- The fallback order covers interactive HTML, static Mermaid or native visual,
  and a final text flow.
- The skill package contains no visualization implementation engine.
