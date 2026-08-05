# PRD: Plugin skill composition v2

## Document status

- Status: Approved for implementation
- Date: 2026-08-05
- Product: `ptlam-skills`
- Manifest schema: `2`
- Epic:
  [Deliver plugin skill composition v2](../epics/plugin-skill-composition-v2-epic.md)

## Summary

Plugin skill composition v2 separates authored skills from distributable skills.
Authors maintain every source skill in one flat, manifest-governed source tree.
The compiler publishes only eligible public skills and embeds each skill's
complete dependency closure so every generated skill works without runtime
access to neighboring skills.

Internal skills are first-class authored skills rather than a separate
"foundation" type. The same dependency mechanism composes internal and public
skills. Visibility controls whether a skill is distributed independently;
lifecycle status controls whether it is ready, supported, discouraged, or
retained only for history.

The generated `skills/` tree is committed as the installable product. It is a
single compiler-owned projection that must match the authored `plugin/` tree
byte for byte when checked.

## Problem

The v1 repository makes `skills/` both the authored source and the public
distribution tree. It also models a required skill as an ID-only graph edge.
That graph can be validated, but it does not make the dependent skill
self-contained and it cannot tell an agent why or how to use the prerequisite.

This creates several constraints:

- a reusable universal skill must be published independently even when it only
  exists to support target-specific skills;
- target-specific skills cannot carry their shared foundation with them;
- users or hosts may need several neighboring installations for one workflow;
- metadata is split between `plugin.yml`, `SKILL.md`, and catalog summaries;
- categories affect filesystem paths even though they are catalog metadata;
- changing category membership requires moving the public package;
- generated and authored files are not separated strongly enough to support a
  complete drift check; and
- a future split such as testing for Flutter and Python would duplicate shared
  guidance or depend on host-specific runtime loading.

The repository needs compile-time composition, one canonical metadata source,
explicit lifecycle semantics, and deterministic standalone outputs without
becoming an installer, package manager, or runtime dependency resolver.

## Goals

1. Make `plugin/plugin.yml` and `plugin/skills/` the complete authored source of
   truth.
2. Keep every authored skill in one flat namespace independent of category.
3. Represent internal and public skills with the same skill object.
4. Separate distribution visibility from lifecycle status.
5. Let any eligible skill require any other eligible skill in an acyclic graph.
6. Record why every dependency exists and how an agent must apply it.
7. Produce a self-contained generated package for every publishable public
   skill.
8. Preserve required skills recursively without rewriting their internal
   relative paths.
9. Generate skill frontmatter from canonical manifest metadata.
10. Treat the entire root `skills/` tree as one committed compiler-owned output.
11. Make validation and drift checks strict, deterministic, and read-only.
12. Generate the public catalog from the same canonical metadata.
13. Migrate existing skills without changing their intended runtime behavior.

## Non-goals for v2

- Resolving dependencies from another plugin or repository
- Runtime loading of neighboring skills
- Individual skill versions, version ranges, or a dependency lockfile
- Recreating an installer, updater, transaction engine, or host state manager
- Deduplicating repeated transitive skills inside one generated package
- Automatically merging or reconciling conflicting instructions
- Automatically discovering or publishing an unlisted source directory
- Treating an internal skill as secret; its contents may be embedded publicly
- Creating category directories in either source or generated trees
- Injecting deprecation or archive notices into runtime `SKILL.md` files
- Preserving arbitrary hand edits under the generated `skills/` tree

## Users and jobs

### Skill author

The author needs one place to write a reusable internal skill, declare how other
skills consume it, and control where the generated dependency context appears in
each dependent workflow.

### Catalog maintainer

The maintainer needs an explicit inventory, lifecycle model, stable ordering,
strict validation, and a safe all-or-nothing regeneration workflow.

### Skill user

The user needs each installed public skill to be complete by itself, with no
knowledge of compiler internals or sibling installations.

### Agent applying a skill

The agent needs the required skill's full instructions plus explicit context
explaining why the dependency exists, when to read it, and how to combine it
with the current skill.

### Host integration

A host adapter needs a deterministic set of independently distributable public
skills and canonical metadata from which to generate native manifests.

## Product decisions

1. Authored sources live under `plugin/`; generated distributions live under the
   repository-root `skills/` tree.
2. `plugin/plugin.yml` and `plugin/skills/<skill-id>/` together are the source
   of truth.
3. Source and generated skill directories are flat. Category membership never
   changes a filesystem path.
4. All authored entries are skills. V2 has no separate foundation, product, or
   kind hierarchy.
5. `visibility` and `status` are separate required fields with no defaults.
6. `visibility` is either `internal` or `public`.
7. `status` is one of `draft`, `active`, `deprecated`, or `archived`.
8. An internal skill may be fully active while remaining unavailable as an
   independent installation.
9. One plugin version applies to every skill in a release. Skills have no
   individual version or version constraint.
10. The manifest owns skill ID and description. Authored `SKILL.md` files have
    no YAML frontmatter.
11. The same description is used for generated frontmatter, README output, and
    host metadata when supported. V2 has no `summary` field.
12. Every source skill has exactly one category selected by `category_id`.
13. Each dependency is a required object with `skill_id`, `reason`, and
    `instructions`.
14. `reason` and `instructions` are agent-facing runtime context, not merely
    maintainer documentation.
15. The authored dependent `SKILL.md` explicitly places the generated required
    skills section with one compiler marker.
16. Required skills are materialized recursively under the dependent skill.
17. Recursive nesting deliberately duplicates a shared transitive skill when a
    diamond graph reaches it through more than one branch.
18. A public skill may be both published independently and embedded as a
    required skill in another public skill.
19. Required-skill order controls reading and display order but creates no
    implicit override rule.
20. The current skill's own instructions define its final specialization. Any
    dependency conflict or priority must be stated explicitly in the edge's
    `instructions`.
21. The compiler transforms only `SKILL.md` and its reserved dependency
    namespace. All other source resources are copied byte for byte with their
    relative structure intact.
22. `references/required-skills/` is entirely compiler-owned and forbidden in a
    source skill.
23. Source skills are isolated. Their authored local links cannot escape their
    own directory or refer directly to a neighboring source skill.
24. The root `skills/` tree is entirely compiler-owned, regenerated as one
    output, and committed.
25. Deprecated and archive metadata is documentation metadata. It is not
    injected into runtime `SKILL.md` files.
26. The public README uses one Markdown table with the agreed columns `Skill`,
    `Category`, `Description`, `Status`, and `Replacement`.

## Vocabulary

The canonical domain language is maintained in [`CONTEXT.md`](../../CONTEXT.md).
In particular:

- a **Source Skill** is authored input, whether internal or public;
- an **Internal Skill** is composable but not independently distributed;
- a **Public Skill** is intended for independent distribution when its status
  permits;
- a **Generated Skill** is the self-contained distributable output;
- a **Skill Requirement** is one directed edge carrying `reason` and
  `instructions`; and
- the **Dependency Closure** contains every direct and transitive requirement.

## Authored and generated layout

```text
plugin/
├── plugin.yml
└── skills/
    ├── ptlam-testing/
    │   ├── SKILL.md
    │   └── references/
    ├── ptlam-testing-flutter/
    │   ├── SKILL.md
    │   └── references/
    └── ptlam-testing-python/
        └── SKILL.md

skills/                              # generated and committed
├── ptlam-testing-flutter/
│   ├── SKILL.md
│   └── references/
│       └── required-skills/
│           └── ptlam-testing/
│               ├── SKILL.md
│               └── references/
└── ptlam-testing-python/
    └── ...
```

The source tree contains every manifest-listed skill regardless of visibility or
status. The generated tree contains only root outputs allowed by the
visibility/status matrix, plus complete nested dependency trees.

## Manifest contract

The v2 manifest uses human-readable YAML comments while JSON Schema remains the
formal structural contract:

```yaml
# Version of the plugin.yml structure understood by the compiler.
# Change only when the manifest schema becomes incompatible.
schema_version: 2

# Stable plugin identifier.
name: ptlam-skills

# Human-readable explanation of the plugin's purpose.
description: Portable skills authored and published by PTLam.

# Version shared by this plugin release and all of its generated skills.
# Keep it quoted; build metadata after "+" does not affect SemVer precedence.
version: "0.1.0+1"

# Publication metadata retained for generated host and marketplace projections.
author:
  name: Pham Tung Lam
  email: fam.tung.lam@gmail.com
  url: https://github.com/fam-tung-lam
homepage: https://github.com/fam-tung-lam/ptlam-skills#readme
repository: https://github.com/fam-tung-lam/ptlam-skills
license: MIT
keywords:
  - agent-skills
  - engineering
  - productivity

marketplace:
  name: ptlam
  description: PTLam's portable agent skills as an installable plugin.
  plugin_description: Portable skills for engineering and productivity.
  category: development
  keywords:
    - agent-skills
    - engineering
    - productivity

categories:
  - id: engineering
    name: Engineering
    description: Skills for software engineering workflows.

skills:
  - id: ptlam-testing
    description:
      Design, write, update, run, review, and diagnose automated tests.
    category_id: engineering
    visibility: internal
    status: active
    required_skills: []

  - id: ptlam-testing-flutter
    description:
      Design, run, review, and diagnose tests for Flutter and Dart projects.
    category_id: engineering
    visibility: public
    status: active
    required_skills:
      - skill_id: ptlam-testing
        reason: Provides universal testing rules and verification policy.
        instructions:
          Read it first and apply its universal rules before Flutter-specific
          guidance and explicit overrides.

  - id: ptlam-old-testing
    description: Apply the former target-neutral testing workflow.
    category_id: engineering
    visibility: public
    status: deprecated
    deprecation:
      reason: Target-specific testing skills provide clearer tool guidance.
      replacement_skill_id: ptlam-testing-flutter
      instructions: Use the replacement for new Flutter testing work.
    required_skills: []

  - id: ptlam-retired-testing
    description: Preserve the retired testing model for historical reference.
    category_id: engineering
    visibility: internal
    status: archived
    archive:
      reason: The target-specific model replaced this source.
      replacement_skill_id: ptlam-testing-flutter
    required_skills: []
```

### Top-level metadata

- `schema_version` is required and equals `2` for this contract.
- `name`, `description`, and `version` are required top-level plugin metadata.
- Existing `author`, `homepage`, `repository`, `license`, `keywords`, and
  `marketplace` fields remain required top-level publication metadata so current
  Claude and marketplace projections preserve their information.
- Core plugin identity is `name`, `description`, and `version`; publication
  metadata describes how that identity is presented and attributed by hosts.
- `version` is a quoted SemVer-compatible string such as `"0.1.0+1"`.
- The version is preserved exactly in generated host metadata.
- Build metadata identifies a build but does not make `0.1.0+2` higher
  precedence than `0.1.0+1`; a release upgrade changes the SemVer core or
  prerelease component when ordering matters.
- No skill entry has its own version.

### Identifier contract

The plugin `name`, `categories[].id`, `skills[].id`, `skills[].category_id`,
`required_skills[].skill_id`, and replacement skill IDs use one contract:

```text
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

- IDs contain at most 64 characters.
- IDs use lowercase ASCII letters, digits, and single separating hyphens.
- A skill ID exactly matches its `plugin/skills/<id>/` directory.
- Comparison is case-sensitive.
- Renaming an ID deletes the old identity and introduces a new one.

### Category contract

- Every category contains exactly the required fields `id`, `name`, and
  `description`.
- Category IDs are unique.
- Every skill has one required `category_id` referencing an existing category.
- Category order in the manifest controls catalog order.
- Skill order within each category follows the order of `skills[]`.
- Empty categories are valid.
- Categories never create source or output directory levels.

### Skill metadata contract

- Every skill contains `id`, `description`, `category_id`, `visibility`,
  `status`, and `required_skills`.
- `description` is non-empty and is the sole skill description. It replaces the
  v1 split between frontmatter description and catalog summary.
- `visibility` and `status` are always explicit; neither has a default.
- Unknown fields are rejected.

### Lifecycle metadata

A `deprecated` skill requires:

```yaml
deprecation:
  reason: Why continued use is discouraged.
  replacement_skill_id: optional-active-successor
  instructions: How the user should migrate or choose the replacement.
```

- `reason` and `instructions` are required and non-empty.
- `replacement_skill_id` is optional.
- A replacement must identify another existing `active` skill and cannot point
  to the deprecated skill itself.
- `deprecation` is forbidden for every other status.

An `archived` skill requires:

```yaml
archive:
  reason: Why the skill was retired.
  replacement_skill_id: optional-active-successor
```

- `reason` is required and non-empty.
- `replacement_skill_id` is optional and follows the same existence, non-self,
  and active-status rules.
- `archive` is forbidden for every other status.
- Archive metadata is retained for maintainers. Because archived skills are
  omitted from the public catalog, it does not appear in the v2 public table.

Neither lifecycle object is injected into generated `SKILL.md` content.
Deprecation metadata appears only in README catalog documentation in v2; archive
metadata remains non-runtime catalog history.

### Required skills contract

Every item in `required_skills` contains exactly:

```yaml
- skill_id: ptlam-testing
  reason: Provides universal testing rules.
  instructions: Read it first and apply its rules before local overrides.
```

- `skill_id`, `reason`, and `instructions` are all required and non-empty.
- A skill may not require itself.
- Direct `skill_id` values are unique within one `required_skills` list.
- Every target must exist in the same manifest.
- The complete graph must be acyclic.
- List order is meaningful and is preserved for agent reading and display.
- List order does not create an implicit override or "last wins" rule.
- `reason` explains why the dependency exists.
- `instructions` tells the agent when, in what order, and how to apply it.
- The compiler preserves `reason` and `instructions` verbatim in generated
  runtime content. It does not summarize, rewrite, or infer them.
- The compiler adds only fixed Markdown structure and the generated local link.
- Complicated reusable procedures belong to the required skill itself; edge
  instructions explain composition rather than duplicate that procedure.

## Visibility and status behavior

### Root output matrix

| Visibility | Status       | Root generated skill | Public README | Eligible dependency |
| ---------- | ------------ | -------------------- | ------------- | ------------------- |
| `internal` | `draft`      | No                   | No            | No                  |
| `internal` | `active`     | No                   | No            | Yes                 |
| `internal` | `deprecated` | No                   | No            | Yes, with warning   |
| `internal` | `archived`   | No                   | No            | No                  |
| `public`   | `draft`      | No                   | No            | No                  |
| `public`   | `active`     | Yes                  | Yes           | Yes                 |
| `public`   | `deprecated` | Yes                  | Yes           | Yes, with warning   |
| `public`   | `archived`   | No                   | No            | No                  |

Rules derived from the matrix:

- visibility controls independent distribution, not readiness;
- status controls readiness and support, not distribution intent;
- `public + active` and `public + deprecated` are the only root skill outputs;
- internal skills never become root outputs but may be embedded when eligible;
- draft and archived skills are never generated or embedded in a released
  dependency closure;
- an active or deprecated root output fails validation if its dependency closure
  contains a draft or archived skill; and
- a deprecated dependency is allowed but produces a validation/generation
  warning so maintainers can migrate deliberately.

## Source skill contract

Every manifest entry has one matching source directory:

```text
plugin/skills/<skill-id>/
├── SKILL.md
├── references/
├── scripts/
├── assets/
└── any-other-authored-resource/
```

### One-to-one inventory

- Every `skills[]` entry must have exactly one `plugin/skills/<id>/SKILL.md`.
- Every direct directory under `plugin/skills/` must be listed exactly once in
  the manifest.
- A missing source, an orphan source directory, a duplicate ID, or an extra
  direct file under `plugin/skills/` is a validation error.
- The compiler does not infer catalog membership or publication merely from a
  directory's existence.

### Authored `SKILL.md`

- The authored file contains only the skill's runtime Markdown body.
- It must not begin with YAML frontmatter. Authored frontmatter is a validation
  error because the manifest is the sole metadata owner.
- It contains exactly one required-skills marker:

```markdown
<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->
```

- The author chooses the marker's position in the workflow.
- A missing or repeated marker is a validation error.
- When `required_skills` is empty, generation removes the marker without
  replacement.
- The marker never remains in generated output.

### Source isolation

- Authored local links may refer only to content inside the same source skill.
- `..` traversal that escapes the skill root is forbidden.
- Direct links to a neighboring `plugin/skills/<other-id>/` tree are forbidden.
- Absolute local filesystem paths are forbidden.
- External `https://` links are allowed.
- Cross-skill composition is expressed only through `required_skills`.
- All generated local links must resolve after complete materialization.
- Symbolic links are forbidden anywhere in a source skill tree.

### Resource ownership

- `references/required-skills/` is a reserved compiler-owned namespace at every
  nesting level.
- A source skill that contains that path is invalid, even when the directory is
  empty.
- The compiler transforms `SKILL.md` and creates the reserved namespace.
- Every other authored file is copied byte for byte with its path relative to
  the source skill preserved.
- The compiler does not restrict useful resource directory names; references,
  scripts, assets, examples, templates, runtimes, and future resource kinds may
  coexist.
- Known filesystem debris such as `.DS_Store` is rejected rather than copied.

## Generated skill contract

### Generated frontmatter

Every root and nested generated `SKILL.md` begins with deterministic
compiler-owned frontmatter containing exactly:

```yaml
---
name: ptlam-testing
description: Design, write, update, run, review, and diagnose automated tests.
---
```

- `name` equals the manifest skill ID.
- `description` comes from the manifest without semantic rewriting.
- No additional frontmatter fields are emitted.
- The same transformation applies when the skill is embedded transitively.

### Generated required-skills block

At the authored marker, the compiler emits direct requirements in manifest
order:

```markdown
## Required skills

### ptlam-testing

**Reason:** Provides universal testing rules and verification policy.

**Instructions:** Read it first and apply its universal rules before
Flutter-specific guidance and explicit overrides.

Read [ptlam-testing](references/required-skills/ptlam-testing/SKILL.md).
```

The fixed heading, labels, and link are compiler-owned. `reason` and
`instructions` are copied verbatim. The block shows only direct requirements;
each nested required skill's generated `SKILL.md` shows its own direct
requirements.

### Recursive materialization

For a graph:

```text
ptlam-testing-flutter
└── ptlam-testing
    └── ptlam-codebase-design
```

the output is:

```text
skills/ptlam-testing-flutter/
├── SKILL.md
└── references/
    └── required-skills/
        └── ptlam-testing/
            ├── SKILL.md
            └── references/
                └── required-skills/
                    └── ptlam-codebase-design/
                        └── SKILL.md
```

Recursive nesting is preferred over flattening because each required skill
remains self-contained and its local links require no graph-wide rewrite.

For a diamond graph, a shared transitive skill is copied once in each branch.
This deliberate duplication preserves each branch as a standalone generated
skill. V2 performs no cross-branch deduplication or shared-link creation.

## Public README contract

The public catalog displays only `public + active` and `public + deprecated`
skills. It uses this Markdown table:

```markdown
| Skill                   | Category    | Description                        | Status                                                                                          | Replacement             |
| ----------------------- | ----------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- |
| `ptlam-testing-flutter` | Engineering | Test Flutter and Dart projects.    | Active                                                                                          | —                       |
| `ptlam-old-testing`     | Engineering | Apply the former testing workflow. | Deprecated — Target-specific skills provide clearer guidance. Use the replacement for new work. | `ptlam-testing-flutter` |
```

- `Skill` comes from `skills[].id`.
- `Category` comes from the referenced `categories[].name`.
- `Description` uses `skills[].description` verbatim in meaning; the compiler
  performs only Markdown table escaping and whitespace normalization required
  for a valid row.
- `Status` is `Active` or `Deprecated`.
- A deprecated status cell includes `deprecation.reason` and
  `deprecation.instructions`.
- `Replacement` contains `deprecation.replacement_skill_id` or an em dash.
- Category order follows `categories[]`; skill order inside each category
  follows `skills[]`.
- The compiler escapes pipes, line breaks, and other content that would corrupt
  Markdown table structure.
- Internal, draft, and archived skills are omitted.
- Lifecycle metadata is catalog documentation only and is not added to runtime
  `SKILL.md` content.

## Functional requirements

### PSC-001: Load one canonical source model

The compiler must load `plugin/plugin.yml` and the flat `plugin/skills/<id>/`
inventory as the only authored source model. It must not read generated
`skills/` content as source or merge generated content back into authored
inputs.

### PSC-002: Parse strict YAML 1.2

The compiler must accept YAML 1.2 with ordinary `#` comments and reject:

- duplicate mapping keys;
- anchors and aliases;
- merge keys;
- explicit YAML tags;
- environment-variable interpolation or template evaluation;
- non-string mapping keys;
- non-JSON-compatible values; and
- unknown fields forbidden by the closed JSON Schema.

The plugin version must be a quoted string. Validation diagnostics should
identify the manifest path and, when available, source line and column.

### PSC-003: Validate identities and inventory

The compiler must enforce the identifier contract, unique plugin/category/skill
identities, valid category and replacement references, exact directory-to-entry
mapping, and the no-frontmatter source contract.

### PSC-004: Validate lifecycle combinations

The compiler must require `deprecation` only for deprecated skills and `archive`
only for archived skills. Replacement references must identify an existing,
different, active skill. Visibility/status output and dependency eligibility
must follow the agreed matrix.

### PSC-005: Validate the dependency graph

The compiler must validate required edge shape, target existence, direct
uniqueness, no self-dependency, and global acyclicity. It must report an
actionable cycle path. It must reject any publishable root whose dependency
closure contains a draft or archived skill and warn on deprecated dependencies.

### PSC-006: Validate source safety and isolation

The compiler must reject symbolic links, reserved authored dependency paths,
filesystem debris, escaping local links, absolute local paths, and supported
local links that do not resolve. It must not follow paths outside the source
skill root.

### PSC-007: Generate self-contained skills

For each `public + active` and `public + deprecated` root, the compiler must:

1. create deterministic frontmatter from manifest metadata;
2. replace the single required-skills marker;
3. preserve direct dependency order;
4. embed `reason` and `instructions` verbatim;
5. add a relative link to each embedded required skill;
6. copy authored resources byte for byte;
7. recursively perform the same transformation for every requirement; and
8. verify that all generated local links resolve.

### PSC-008: Replace the generated tree as one output

Generation must build the complete `skills/` tree in a temporary sibling
location, validate the complete result, and replace the managed tree only after
all validation succeeds. A failed build must leave the previously committed tree
intact.

Generation must not merge into the previous output. Skills that are deleted,
made internal, changed to draft, or archived disappear from root output on the
next successful generation.

The replacement operation must reject unsafe targets and symbolic-link path
segments. Temporary files and directories must be cleaned up after success or
failure where safely possible.

### PSC-009: Generate catalog and host projections

Generation must update the public README table and existing supported host
manifests from the same validated model. Host manifests receive only the root
public outputs permitted by the matrix. Category directories are not recreated
in a host projection unless a host's format independently requires them.

### PSC-010: Detect byte-level drift read-only

The check command must generate the complete expected output plan without
writing and compare every managed output against the repository:

- generated `skills/` paths and file bytes;
- absence of stale generated paths;
- public README catalog content; and
- supported host manifests.

It must report missing, unexpected, or content-different paths and exit non-zero
on any drift. An unchanged repository produces no writes.

## Command behavior

### Validate

`validate` is read-only. It validates the manifest, source inventory, lifecycle
model, dependency graph, markers, resources, and source links. It may report
non-failing warnings such as use of a deprecated dependency. It does not require
generated output to be current.

### Generate

`generate` validates sources, builds and validates the full expected projection,
atomically replaces the root `skills/` output, and updates other managed
projections. It reports changed and unchanged managed paths. It writes nothing
when source validation or staged-output validation fails.

### Check

`check` is read-only. It performs source validation and compares the complete
expected projection to committed outputs. It succeeds only when no generated
file is missing, stale, unexpected, or byte-different.

## Migration from manifest schema v1

Migration is a coordinated source/output boundary change rather than an in-place
directory tweak:

1. Introduce manifest schema v2 and move canonical metadata from the root
   `plugin.yml` into `plugin/plugin.yml`.
2. Promote plugin `name`, `description`, quoted `version`, `author`, `homepage`,
   `repository`, `license`, and `keywords` to top-level fields while retaining
   top-level `marketplace` publication metadata and the one-release-version
   policy.
3. Rename category `title` to `name` and keep category descriptions and order.
4. Replace each skill's `category` with `category_id`.
5. Remove v1 `kind`, `summary`, and `required_skill_ids` fields.
6. Move each authored package from `skills/<category>/<id>/` to the flat
   `plugin/skills/<id>/` source tree.
7. Move the existing frontmatter description into `skills[].description` and
   remove all authored frontmatter. The former short summary is not retained as
   a second metadata field.
8. Add explicit `visibility` and `status` to every skill. Existing independently
   distributed stable skills initially map to `public + active`; deliberate
   foundations map to `internal + active` only when product design identifies
   them as such.
9. Convert every v1 required ID into a `required_skills` object and author a
   specific non-empty `reason` and `instructions`. Migration must not invent
   generic edge context.
10. Add exactly one required-skills marker to every authored `SKILL.md`, even
    when its direct dependency list is empty.
11. Confirm no authored skill owns `references/required-skills/`, uses a
    cross-skill filesystem link, contains a symbolic link, or retains local
    absolute paths.
12. Generate the new flat root `skills/<id>/` tree from scratch. Do not copy the
    old generated/source tree forward as an output base.
13. Regenerate README and host projections from v2 metadata.
14. Remove category-shaped generated paths and confirm removed/internal/draft/
    archived roots are absent.
15. Run validation, full generation, byte-for-byte check, repository tests, and
    a final diff review before the v2 release is committed.

The migration must be performed in one branch and delivered in one pull request
so a repository checkout never claims schema v2 while retaining a schema v1
source/output interpretation.

## Validation plan

1. Add JSON Schema tests for required fields, closed objects, identifier length,
   enum values, lifecycle metadata, and quoted version behavior.
2. Add strict YAML tests for comments, duplicate keys, anchors, aliases, merge
   keys, tags, interpolation-like values, and JSON compatibility.
3. Add inventory tests for missing, orphaned, duplicate, category-shaped, and
   mismatched skill directories.
4. Add source tests for forbidden frontmatter, marker count, symlinks, reserved
   paths, filesystem debris, path escape, cross-skill links, and missing links.
5. Add graph tests for unknown targets, duplicate direct edges, self-edges,
   cycles, ordering, valid public-to-public composition, draft/archive
   rejection, and deprecated warnings.
6. Add lifecycle matrix tests covering all eight visibility/status pairs.
7. Add generation golden tests for frontmatter, empty and populated marker
   replacement, verbatim edge text, direct order, nested dependencies, public
   dependencies, and diamond duplication.
8. Add byte-copy tests for authored non-`SKILL.md` resources.
9. Add transactional generation tests proving failed staging leaves committed
   output unchanged and stale roots disappear after successful replacement.
10. Add README tests for the five columns, ordering, escaping, status text,
    replacement display, and visibility filtering.
11. Add drift-check tests for missing, unexpected, and byte-different output.
12. Run the complete repository test, Markdown format, lint, validate, generate,
    and check workflows against the migrated real catalog.

## Acceptance criteria

V2 is complete when:

1. `plugin/plugin.yml` validates against the closed schema v2 contract and
   documents `schema_version`, `name`, `description`, and `version` with YAML
   comments.
2. Every source skill is listed exactly once and lives at `plugin/skills/<id>/`
   without authored frontmatter.
3. Every category has `id`, `name`, and `description`; every skill references an
   existing category through `category_id`.
4. All IDs satisfy the 64-character lowercase hyphen-case contract.
5. Every skill explicitly declares valid `visibility` and `status` values.
6. Deprecated and archived skills carry their required lifecycle metadata and
   valid optional replacement references.
7. Every required edge contains `skill_id`, `reason`, and `instructions`; the
   complete graph is valid and acyclic.
8. A publishable skill cannot transitively depend on a draft or archived skill,
   and deprecated dependencies produce a clear warning.
9. Every source `SKILL.md` contains exactly one required-skills marker and no
   YAML frontmatter.
10. Generated frontmatter contains exactly `name` and `description` from the
    manifest.
11. Generated required-skill sections preserve manifest order and edge text
    verbatim while adding only fixed structure and valid relative links.
12. Every generated root is self-contained, recursively embeds its complete
    dependency closure, and preserves deliberate diamond duplication.
13. Non-`SKILL.md` resources are byte-identical to their authored sources.
14. No source owns the compiler-reserved namespace, escapes its skill boundary,
    links directly to another source skill, or uses a symbolic link.
15. Root output matches the visibility/status matrix, is flat, contains no stale
    roots, and is replaced only after successful staged validation.
16. The public README lists only active and deprecated public skills in the
    five-column Markdown table with correct descriptions and deprecation data.
17. Lifecycle metadata is absent from generated runtime `SKILL.md` files.
18. `validate` and `check` perform no writes; `check` detects byte-level drift
    across the full managed projection.
19. The migrated repository passes focused compiler tests, the complete test
    suite, Markdown checks, generation, and a clean post-generation drift check.
20. The delivered pull request contains the PRD, epic, issue plan, glossary,
    compiler implementation, migrated sources, generated outputs, tests, and
    reviewable evidence with no unrelated changes.

## Risks and mitigations

| Risk                                     | Mitigation                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Internal is mistaken for secret          | Define visibility as distribution intent and document that embedded content becomes public     |
| Two metadata sources drift               | Remove authored frontmatter and generate it exclusively from the manifest                      |
| A dependency is bundled but ignored      | Require edge instructions and inject reason, instructions, and link at an author-placed marker |
| Transitive links break when nested       | Preserve recursive skill structure and validate links after materialization                    |
| A diamond graph increases package size   | Accept deterministic duplication in v2 to preserve branch self-containment                     |
| A category rename breaks install paths   | Keep category metadata independent from flat skill paths                                       |
| A stale public skill survives retirement | Replace the whole generated tree from a staged expected output                                 |
| A failed build corrupts committed output | Validate the staged tree before atomic replacement                                             |
| Hand edits under `skills/` are lost      | Mark the complete tree compiler-owned and require edits in `plugin/`                           |
| Deprecated guidance leaks into runtime   | Limit lifecycle metadata to catalog documentation and test generated skill content             |
| YAML features hide or mutate the model   | Use strict YAML 1.2 plus a closed JSON Schema and semantic validation                          |
| V2 expands into a package manager        | Keep dependencies local, unversioned, compile-time, and within one plugin release              |

## Open questions

None. The visibility model, lifecycle matrix, manifest metadata, composition
rules, source/output ownership, README format, and migration boundary were
explicitly agreed before implementation.
