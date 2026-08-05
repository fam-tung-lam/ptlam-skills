# PTLam Skill Catalog

This context defines the language used to author, compose, and publish the
skills in the PTLam catalog.

## Language

**Plugin Manifest**:

The authoritative catalog record for one plugin release, including its skills,
categories, lifecycle state, and composition relationships.

_Avoid_: Installer manifest, lockfile

**Plugin Release**:

A versioned snapshot of the catalog and all public skills produced from it.
Every skill in the snapshot shares the release version.

_Avoid_: Skill release, package version

**Source Skill**:

An authored skill definition from which distributable skills are produced. A
source skill may be internal or public.

_Avoid_: Foundation, product skill

**Internal Skill**:

A source skill intended for composition into other skills but not for standalone
discovery or installation.

_Avoid_: Private skill, hidden skill, foundation

**Public Skill**:

A source skill intended for standalone discovery and installation when its
lifecycle status permits publication.

_Avoid_: Product skill, exported skill

**Generated Skill**:

A self-contained distributable skill derived from one source skill and the full
closure of its required skills.

_Avoid_: Source skill, linked skill

**Category**:

A named catalog grouping used to organize skills for people without affecting
their identity or composition.

_Avoid_: Folder, namespace

**Visibility**:

The distribution intent of a source skill: `internal` or `public`. Visibility is
independent of lifecycle status.

_Avoid_: Status, publication state

**Lifecycle Status**:

The readiness and support state of a source skill: `draft`, `active`,
`deprecated`, or `archived`. Lifecycle status is independent of visibility.

_Avoid_: Visibility

**Draft Skill**:

A source skill still under development and unavailable for publication or
composition into a released skill.

_Avoid_: Internal skill

**Active Skill**:

A supported source skill that may participate in released compositions and, if
public, be offered independently.

_Avoid_: Published skill

**Deprecated Skill**:

A supported but discouraged source skill that remains available while directing
users toward a preferred replacement or migration path.

_Avoid_: Archived skill

**Archived Skill**:

A historical source skill that is no longer published or eligible for released
composition.

_Avoid_: Deprecated skill

**Required Skill**:

A direct source-skill prerequisite whose complete behavior becomes part of a
dependent generated skill.

_Avoid_: Runtime dependency, optional skill

**Skill Requirement**:

The directed relationship from a dependent skill to one required skill,
including why the relationship exists and how an agent should apply it.

_Avoid_: Package constraint, import

**Dependency Closure**:

The complete set of direct and transitive required skills reachable from one
source skill.

_Avoid_: Direct requirements

**Replacement Skill**:

An active skill recommended as the successor to a deprecated or archived skill.

_Avoid_: Required skill

**Skill Description**:

The single canonical explanation used both to trigger a skill and to describe it
in the human-facing catalog.

_Avoid_: Summary, tagline

**Public Catalog**:

The human-facing list of active and deprecated public skills in a plugin
release.

_Avoid_: Source inventory
