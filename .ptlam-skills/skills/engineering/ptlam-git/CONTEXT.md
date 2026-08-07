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

- Use Conventional Commits with an outcome-focused subject:
  `<type>(<scope>): <description>`, omitting the scope only when it adds no
  useful context. Preferred types are `feat`, `fix`, `docs`, `style`,
  `refactor`, `perf`, `test`, `chore`, and `ci`.
- Make the subject explain why the change exists: name the outcome or
  capability, the broken behavior fixed, or the reason for a refactor—not the
  implementation mechanics. Use imperative mood, capitalize the description,
  omit the final period, aim for 50 characters, and never exceed 72.
- Add a short, concrete body when the subject cannot carry enough context. For
  features, show sample usage or explain the new capability. For fixes, state
  the cause and how the change prevents the failure. Prefer why over a
  step-by-step account of the implementation.
- When a commit resolves a GitHub issue, add `Fixes #<issue-number>` or
  `Closes #<issue-number>` in the body; use the full issue URL for an issue in
  another repository.
- Before committing, reread the subject in isolation and rewrite it if it says
  only what changed rather than why the change matters.
  Evidence: user instruction on 2026-08-07.
- For this repository, agents may maintain material durable Git-flow facts and
  explicitly stated Git preferences in this file during an already-authorized
  state-changing Git task or in response to an explicit context-maintenance
  request. Keep automatic context changes outside unrelated staging and commits.
  Evidence: user instruction on 2026-08-06.
