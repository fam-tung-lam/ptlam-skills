---
schema_version: 1
skill: ptlam-git
canonical_path: skills/engineering/ptlam-git
updated_at: 2026-08-07
---

# Project Git Context

## Project profile

- [The development guide](../../../../docs/DEVELOPMENT.md) owns authored and
  generated file boundaries, compiler commands, and local quality gates.
- [The contribution guide](../../../../CONTRIBUTION.md) owns branch,
  contribution, commit, and pull-request conventions.
- [The plugin release runbook](../../../../docs/RELEASE_PLUGIN_FLOW.md) owns
  release preparation, automation, and the mandatory human-approval handoff.
- Revalidate these entries when any governing document changes.

## Git flow

- Start focused work on a descriptive short-lived branch from current `main`.
- Change authored catalog sources under `plugin/`; run the plugin compiler and
  review its generated `skills/`, host metadata, and catalog output in the same
  change.
- Keep the plugin version unchanged during normal feature and maintenance work.
- Run the repository quality gates before requesting review.

## Git preferences

- For this repository, agents may maintain material durable Git-flow facts and
  explicitly stated Git preferences in this file during an already-authorized
  state-changing Git task or in response to an explicit context-maintenance
  request. Keep automatic context changes outside unrelated staging and commits.
  Evidence: user instruction on 2026-08-06.
