# ISSUE-001: Define the version 2 manifest and domain model

## Status

- Status: Implemented
- Epic:
  [Compile public skills from composable plugin sources](../../epics/plugin-skill-composition-v2-epic.md)
- Depends on: None

## Problem

Version 1 conflates authored skill packages with distributable packages and
represents dependencies as unqualified IDs. The compiler needs an explicit model
for authored sources, publication visibility, lifecycle, and contextual
dependency edges before it can compose self-contained public skills.

## Scope

- Introduce `plugin/plugin.yml` with `schema_version: 2`.
- Require commented plugin metadata fields `name`, `description`, and quoted
  `version`; keep schema and plugin-release versions separate.
- Keep metadata required by existing host projections without changing its
  consumer meaning.
- Define ordered categories with required unique `id`, `name`, and `description`
  fields.
- Define ordered skills with required `id`, `description`, `category_id`,
  `visibility`, `status`, and `required_skills` fields.
- Define `visibility` as `internal | public` and lifecycle `status` as
  `draft | active | deprecated | archived`, with no defaults.
- Define every required-skill edge as an ordered object with required
  `skill_id`, `reason`, and `instructions` text fields.
- Require `deprecation.reason` and `deprecation.instructions` for deprecated
  skills and allow an optional `deprecation.replacement_skill_id`.
- Require `archive.reason` for archived skills and allow an optional
  `archive.replacement_skill_id`.
- Model dependency edges separately from skills so edge-specific context is not
  collapsed into the referenced skill.
- Preserve manifest order in immutable domain objects.

## Non-goals

- Per-skill versions or dependency version ranges
- External dependencies, lockfiles, or resolution algorithms
- A separate foundation or product entity
- A `summary` field distinct from `description`
- Default visibility or lifecycle values

## Domain rules

- IDs use `^[a-z0-9]+(?:-[a-z0-9]+)*$` and contain at most 64 characters.
- Plugin name, category IDs, skill IDs, and required `skill_id` values use the
  same hyphen-case contract.
- Every `category_id` and replacement ID resolves to an existing manifest entry;
  a replacement is not the same skill and has `status: active`.
- Required-skill edges are unique per owning skill, non-self-referential, and
  acyclic across the full graph.
- List order defines display and dependency-reading order but never an implicit
  override policy.
- `public + active` and `public + deprecated` are distributable; internal,
  draft, and archived skills are not root outputs.
- Active or deprecated dependency closures cannot contain draft or archived
  skills. A deprecated dependency is allowed with a warning.
- Internal skills may be complete active foundations and are not secrets.
- Unused internal skills are valid but produce a non-failing reachability
  warning.

## Acceptance criteria

- JSON Schema rejects unknown fields and every invalid conditional field
  combination.
- Models represent plugin metadata, categories, skills, dependency edges,
  deprecation, and archive metadata immutably.
- `description` is the one skill description used for frontmatter and catalogs.
- A version such as `"0.1.0+1"` remains an exact string; build metadata does not
  create a separate per-skill precedence system.
- Unit tests cover every enum value, conditional object, reference rule, order,
  and immutability guarantee.
- The compiler rejects unknown schema versions rather than silently migrating.

## Validation

- Run model unit tests and schema fixture tests.
- Exercise valid active internal, active public, deprecated public, draft, and
  archived examples.
- Exercise invalid missing fields, unknown fields, bad IDs, unresolved
  categories, bad replacements, self-dependencies, duplicate edges, cycles, and
  forbidden lifecycle closures.
