# Epic: Compile public skills from composable plugin sources

## Status

- Status: In progress
- Date: 2026-08-05
- PRD: [Product requirements](../prds/plugin-skill-composition-v2-prd.md)
- Target branch: `codex/plugin-skill-composition`

## Outcome

Replace the version 1 catalog model with a version 2 plugin source model in
which every authored skill lives under `plugin/skills/<skill-id>/`, public and
internal skills share one manifest representation, and each distributable skill
is compiled into a self-contained flat package under `skills/<skill-id>/`.

The compiler embeds every transitive required skill recursively, generates
frontmatter and dependency context, projects only eligible public skills to
README and host manifests, and proves that committed outputs match authored
sources without turning the repository into a package manager.

## Scope

- Move the authored manifest to `plugin/plugin.yml` and adopt schema version 2.
- Model categories, lifecycle, visibility, dependency-edge context, and
  deprecation or archive metadata explicitly.
- Treat `plugin/skills/` as the complete flat source set and root `skills/` as a
  compiler-owned flat public output.
- Generate standard frontmatter from manifest metadata.
- Recursively embed required skills under the reserved
  `references/required-skills/` namespace.
- Preserve authored resources byte-for-byte except for `SKILL.md` composition.
- Generate public README tables and host projections from one validated model.
- Migrate all current skills without losing runtime content or host metadata.
- Add focused, integration, repository-workflow, and rollout validation.

## Out of scope

- Runtime dependency loading between separately installed skills
- External skill dependencies or version constraints
- Per-skill versions, lockfiles, dependency resolution, or package management
- Installation, updates, publication automation, or release-state storage
- Secret internal skills; embedded internal content is visible in public output
- Automatic instruction merging or implicit dependency override rules
- Category directories in either source or generated skill trees

## Issues

1. [ISSUE-001: Define the version 2 manifest and domain model](../issues/plugin-skill-composition-v2/001-v2-manifest-domain-model.md)
2. [ISSUE-002: Validate isolated source skills and filesystem safety](../issues/plugin-skill-composition-v2/002-source-validation-and-safety.md)
3. [ISSUE-003: Compose required skills recursively](../issues/plugin-skill-composition-v2/003-recursive-skill-composer.md)
4. [ISSUE-004: Generate root skills atomically and detect drift](../issues/plugin-skill-composition-v2/004-atomic-root-skills-and-drift.md)
5. [ISSUE-005: Project the public catalog to README and hosts](../issues/plugin-skill-composition-v2/005-readme-and-host-projections.md)
6. [ISSUE-006: Migrate the current catalog to version 2 sources](../issues/plugin-skill-composition-v2/006-current-skill-migration.md)
7. [ISSUE-007: Verify and roll out the version 2 compiler](../issues/plugin-skill-composition-v2/007-verification-and-rollout.md)

## Dependency graph

```text
ISSUE-001 ──┬── ISSUE-002 ── ISSUE-003 ── ISSUE-004 ──┐
            └──────────────── ISSUE-005 ───────────────┤
                                                      ├── ISSUE-006 ── ISSUE-007
ISSUE-003 ─────────────────────────────────────────────┘
```

ISSUE-001 fixes the vocabulary and immutable model before filesystem or output
work. ISSUE-002 and the pure projection portion of ISSUE-005 can then proceed in
parallel. ISSUE-003 owns composition semantics; ISSUE-004 owns complete-tree
replacement and drift. Migration begins only after the compiler can produce and
check every affected output.

## Parallel delivery plan

### Workstream A: Manifest and validation

Owns:

- `plugin/plugin.yml` schema and domain-model contracts
- validator parsing, semantic checks, and source discovery
- focused model and validator tests

Implements ISSUE-001 and ISSUE-002.

### Workstream B: Composition and generated trees

Owns:

- recursive skill composition
- expected root `skills/` tree construction
- atomic replacement and drift comparison
- focused composer, generator, and checker tests

Implements ISSUE-003 and ISSUE-004 after the ISSUE-001 model is stable.

### Workstream C: Catalog and host projections

Owns:

- README table projection
- Claude plugin and marketplace projection
- projection-specific tests and fixtures

Implements ISSUE-005 against the ISSUE-001 model without owning migration.

### Coordinating workstream

Owns the PRD and epic, migration ordering, conflict prevention, repository-wide
validation, generated diff review, commit, push, and pull request creation.
Implements ISSUE-006 and ISSUE-007 after the other workstreams converge.

## Definition of done

- The v2 manifest and source tree are the only authored skill catalog.
- Every manifest skill has exactly one source directory and every source
  directory has exactly one manifest entry.
- Every generated public skill is self-contained, deterministic, and has only
  compiler-generated `name` and `description` frontmatter.
- Required skills are embedded recursively with verbatim edge context and
  correct links, including diamond graphs.
- Root `skills/` is replaced as one compiler-owned output only after the full
  tree validates; the read-only check reports complete byte-level drift.
- README and host projections contain only eligible public skills, with
  deprecated entries represented according to the manifest.
- Current skills and resources are migrated without semantic loss.
- Focused tests, the full test suite, catalog validation, catalog drift, and
  Markdown checks pass.
- The branch contains only intentional changes and one reviewed pull request is
  pushed against the current default branch.
