# ISSUE-006: Migrate the current catalog to version 2 sources

## Status

- Status: Implemented
- Epic:
  [Compile public skills from composable plugin sources](../../epics/plugin-skill-composition-v2-epic.md)
- Depends on: ISSUE-002, ISSUE-003, ISSUE-004, ISSUE-005

## Problem

The repository currently authors skills directly in categorized root output
directories, carries frontmatter inside every `SKILL.md`, and treats all catalog
members as standalone products. The v2 compiler cannot be adopted until current
content is moved into its source model and regenerated without semantic or
resource loss.

## Scope

- Move the authored manifest to `plugin/plugin.yml` and populate the agreed v2
  metadata, category, visibility, lifecycle, and dependency fields.
- Move every current authored skill to flat `plugin/skills/<skill-id>/` paths,
  preserving supporting files byte-for-byte.
- Remove YAML frontmatter from source `SKILL.md` files and move `name` and
  `description` ownership to the manifest.
- Add exactly one required-skills placeholder at the author-selected workflow
  position in every source `SKILL.md`.
- Model `ptlam-testing` as an active internal foundation rather than a
  separately distributed skill.
- Add active public `ptlam-testing-flutter` and `ptlam-testing-python` target
  skills; make each require `ptlam-testing` with explicit `reason` and
  `instructions` appropriate to that target.
- Keep `ptlam-git`, `ptlam-explain-with-analogy`, and
  `ptlam-visualization-with-html` public and active.
- Express every cross-skill relationship through `required_skills`; remove any
  direct source filesystem relationship.
- Regenerate the complete flat root `skills/`, README regions, and host
  manifests from sources.
- Update compiler and maintainer documentation to describe source ownership,
  generated ownership, lifecycle behavior, and dependency composition.
- Remove obsolete categorized generated paths only through the complete-tree
  generator.

## Non-goals

- Rewriting unrelated skill guidance or design-system content
- Creating a general installer, package manager, or external dependency model
- Hand-editing generated root skills after generation
- Treating internal skill content as secret
- Adding target skills without a genuine target-specific trigger and workflow

## Acceptance criteria

- `plugin/plugin.yml` and `plugin/skills/` are the only authored catalog and
  skill sources.
- Every current resource is accounted for in a source skill or intentionally
  removed with documented rationale.
- Source `SKILL.md` files have no frontmatter; every generated copy has exact
  compiler-owned `name` and `description` frontmatter.
- `ptlam-testing` has no root output but is fully embedded in every active
  public target skill that requires it.
- Public target descriptions define distinct user triggers and target-specific
  instructions rather than merely renaming the foundation.
- Root skills are flat, self-contained, and contain no stale category paths.
- README and Claude projections contain only eligible public skills once.
- The generated runtime behavior of preserved current public skills remains
  equivalent apart from dependency context and paths required by v2.

## Validation

- Compare source and generated resource inventories before and after migration.
- Inspect generated frontmatter, placeholder replacement, dependency blocks, and
  nested testing resources.
- Exercise at least one request that triggers each migrated public skill and one
  Flutter and Python testing request.
- Run catalog validate, generate, and check from a clean worktree and inspect
  the complete generated diff.
