# ISSUE-004: Generate root skills atomically and detect drift

## Status

- Status: Implemented
- Epic:
  [Compile public skills from composable plugin sources](../../epics/plugin-skill-composition-v2-epic.md)
- Depends on: ISSUE-003

## Problem

Root `skills/` becomes one committed compiler-owned output. Updating individual
files in place can leave stale skills, partial dependency trees, or a mixed old
and new catalog after failure. Drift checking must compare the same canonical
tree without writing.

## Scope

- Build the complete expected root `skills/` tree from the validated model and
  recursive composer before touching the current output.
- Include only `visibility: public` skills with `status: active` or
  `status: deprecated` as root directories.
- Generate flat `skills/<skill-id>/` paths without category directories.
- Treat the entire root `skills/` directory as compiler-owned, including its
  catalog README.
- Stage the complete tree in a safe temporary sibling, validate it, then swap
  the directory only after all preparation succeeds.
- Remove stale, renamed, newly internal, draft, and archived root outputs by
  complete replacement rather than incremental deletion.
- Extend the canonical expected-output plan so README and host output planning
  uses the same validated plugin state.
- Make `check` compare the complete expected tree byte-for-byte, reporting
  missing, unexpected, changed, and wrong-type paths without mutation.
- Preserve command boundaries: `validate` and `check` are read-only; `generate`
  is the sole writer.
- Apply existing repository-root containment, no-symlink, regular-file, and
  cleanup guarantees to directory-level replacement.

## Non-goals

- Retaining manually authored files under root `skills/`
- Partial generation of selected skills
- Transaction logs, recovery journals, or installation state
- Cross-repository installation or publication
- Incremental merge semantics

## Acceptance criteria

- A preparation, composition, link-validation, or staging failure leaves the
  existing root `skills/` tree byte-for-byte unchanged.
- Successful generation yields exactly the expected public root directories and
  no stale files.
- The swap never targets a symlink, repository root, or path outside the
  repository.
- Temporary paths are unique, confined, and removed after success or failure.
- `check` reports the full drift set and does not repair, create, touch, or
  reserve paths.
- Generator and Checker consume the same expected tree rather than implementing
  separate selection or formatting logic.
- A second generation with unchanged sources reports no changes.

## Validation

- Add integration tests for eligibility combinations, renamed skills, stale
  files, missing trees, byte changes, wrong path types, and symlink attacks.
- Inject failures before staging, during staging, and before swap and prove the
  prior tree survives.
- Prove `check` leaves timestamps and bytes unchanged.
- Run generation twice and assert deterministic no-op behavior on the second
  run.
