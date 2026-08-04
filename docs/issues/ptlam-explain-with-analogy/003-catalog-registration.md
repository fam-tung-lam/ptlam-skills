# ISSUE-003: Register the skill in portable catalogs

## Status

- Status: Done
- Epic:
  [Deliver `ptlam-explain-with-analogy` v1](../../epics/ptlam-explain-with-analogy-v1-epic.md)
- PRD requirement: Packaging requirements

## Problem

The new skill must be discoverable through every supported collection surface
without duplicate registration or a hard dependency on the visualization skill.

## Scope

- Add the skill to `plugin.yml` as a productivity product.
- Keep `required_skill_ids: []`.
- Regenerate managed root, category, and Claude plugin projections.
- Adapt only existing repository integration assertions that assume a fixed
  generated table width.
- Do not add installation or visualization infrastructure.

## Owned files

- `plugin.yml`
- `.claude-plugin/plugin.json`
- generated catalog sections in `README.md` and `skills/README.md`
- existing repository integration tests only when required by generated width

## Acceptance criteria

- The source catalog contains one registration.
- The generated plugin manifest contains one skill path.
- Root and productivity catalogs list the skill once.
- `required_skill_ids` is empty.
- Catalog validation passes.
- Generated outputs are current.
- No unrelated generated section changes.
