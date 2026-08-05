# ISSUE-007: Verify and roll out the version 2 compiler

## Status

- Status: In progress
- Epic:
  [Compile public skills from composable plugin sources](../../epics/plugin-skill-composition-v2-epic.md)
- Depends on: ISSUE-001 through ISSUE-006

## Problem

The change moves the source of truth, rewrites every distributed path, and adds
recursive content composition. Passing isolated unit tests is insufficient: the
repository must prove clean generation, complete drift detection, host
discoverability, migration fidelity, and understandable maintainer workflows
before review.

## Scope

- Complete focused unit and integration coverage from all preceding issues.
- Update repository workflow tests to exercise the v2 manifest and flat source
  and output layouts end to end.
- Validate command exit codes and prove `validate` and `check` never write.
- Run a clean generation followed by a clean drift check.
- Run the complete Node test suite and Markdown format and lint checks.
- Validate generated skill packages using the same structural expectations as
  installed Agent Skills.
- Inspect host manifests and public README rows for exact eligibility and paths.
- Forward-test representative dependency-free, single-dependency, recursive, and
  target-specific public skills from generated output rather than sources.
- Exercise deprecated README projection and rejected draft or archived
  dependency fixtures without publishing synthetic entries.
- Update CI only where necessary so committed generated drift and migrated paths
  are checked on every pull request.
- Review the final diff for stale v1 paths, duplicate sources, generated
  placeholders, authored frontmatter, and unrelated changes.
- Commit, push the feature branch, and open one reviewable pull request against
  the current default branch.

## Non-goals

- Publishing a plugin release or changing external installation state
- Measuring success through generated file count or test count alone
- Forward tests that receive expected answers or internal implementation hints
- Reintroducing deprecated auxiliary validation harnesses
- Expanding scope after validation begins without a recorded issue change

## Acceptance criteria

- All issue-level acceptance criteria and validation steps are complete.
- `npm test`, `npm run catalog:validate`, `npm run catalog:check`, and
  `npm run markdown:check` pass from the feature worktree.
- A fresh `npm run catalog:generate` followed by `git diff --exit-code` proves
  committed outputs are current.
- Validation and drift commands are proven read-only in automated tests.
- No `PLUGIN-COMPILER` placeholder or authored frontmatter appears in generated
  skill bodies.
- No v1 categorized root skill path or root `plugin.yml` remains referenced by
  maintained code, tests, docs, or host manifests.
- Generated public packages are independently usable without sibling root
  skills.
- Forward tests demonstrate that dependency reason and instructions give the
  agent the intended context and that target wrappers preserve specialization.
- The pull request explains migration impact, generated ownership, validation
  evidence, and any intentional compatibility break.

## Validation

- Run the focused suites first, then the complete repository commands.
- Inspect `git status`, `git diff --check`, and the full staged diff before
  committing.
- Re-run drift and Markdown checks after the final generation.
- Confirm the pushed branch matches the reviewed local commit and the pull
  request targets the repository default branch.
