# ISSUE-005: Project the public catalog to README and hosts

## Status

- Status: Implemented
- Epic:
  [Compile public skills from composable plugin sources](../../epics/plugin-skill-composition-v2-epic.md)
- Depends on: ISSUE-001

## Problem

Visibility and lifecycle rules are useful only when every consumer sees the same
eligible public catalog. README tables, Claude manifests, and repository
guidance must stop exposing internal, draft, or archived skills and must point
at the new flat generated paths.

## Scope

- Generate public README catalog rows only for `public + active` and
  `public + deprecated` skills.
- Use one Markdown table with columns `Skill`, `Category`, `Description`,
  `Status`, and `Replacement`.
- Resolve the category display value from `category_id` to `categories[].name`.
- Use `description` verbatim as the human catalog description.
- Render active status plainly; render deprecated status with verbatim
  `deprecation.reason` and `deprecation.instructions`.
- Render `deprecation.replacement_skill_id` or an em dash in `Replacement`.
- Preserve category order and skill manifest order; categories remain metadata
  and never become output directories.
- Escape pipes, line breaks, and other values that could corrupt Markdown table
  structure while retaining their text.
- Update root and skills README guidance to distinguish authored
  `plugin/skills/` from generated root `skills/` and prohibit manual generated
  edits.
- Project only eligible public skills into `.claude-plugin/plugin.json` using
  flat `./skills/<skill-id>` paths.
- Preserve existing plugin and marketplace identity metadata from the v2
  manifest and keep marketplace projection behavior deterministic.
- Keep README marker replacement bounded and byte-preserving outside managed
  regions.

## Non-goals

- Showing internal, draft, or archived skills in the public README
- Adding lifecycle notices to generated `SKILL.md`
- Creating category folders
- Publishing to a marketplace or changing installation tooling
- Inventing a separate `summary` value

## Acceptance criteria

- README tables use exactly the five agreed columns and the authored order.
- Active and deprecated public skills appear once; every other combination is
  absent.
- Deprecated reason, instructions, and replacement are visible in README only.
- Long descriptions, Unicode, pipes, and line breaks produce valid,
  Prettier-stable Markdown.
- Claude skill paths are flat, unique, eligible, and point at generated output.
- Marketplace and plugin identity fields retain their current meaning and values
  after migration.
- Generated README regions and host manifests are deterministic and drift
  checked through the common output plan.

## Validation

- Add pure updater tests for all visibility and status combinations.
- Cover replacement present or absent, Markdown escaping, Unicode width, empty
  categories, and authored order.
- Assert exact Claude and marketplace JSON projections.
- Prove bytes outside README markers are unchanged.
- Run Prettier and markdownlint against generated README fixtures.
