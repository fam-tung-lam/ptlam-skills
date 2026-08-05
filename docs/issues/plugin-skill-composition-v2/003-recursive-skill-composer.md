# ISSUE-003: Compose required skills recursively

## Status

- Status: Implemented
- Epic:
  [Compile public skills from composable plugin sources](../../epics/plugin-skill-composition-v2-epic.md)
- Depends on: ISSUE-001, ISSUE-002

## Problem

Host runtimes do not guarantee that a sibling required skill is installed or
loaded. Each distributable skill must therefore carry the complete transitive
dependency context and content it needs while keeping author-controlled
instruction order and portable relative links.

## Scope

- Add a deterministic composer that builds one complete generated skill tree
  from one validated source skill and its dependency closure.
- Generate `SKILL.md` frontmatter with exactly `name` and `description`, sourced
  from the manifest without semantic rewriting.
- Replace `<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->` with a generated
  `Required skills` section for direct dependencies in manifest order.
- For every direct edge, embed `skill_id`, verbatim `reason`, verbatim
  `instructions`, and a generated relative link to the nested `SKILL.md`.
- Remove the placeholder without a section when the skill has no direct
  requirements.
- Materialize each direct dependency under
  `references/required-skills/<skill-id>/` and compose it by the same rules.
- Preserve recursive nesting rather than flattening or deduplicating transitive
  dependencies.
- Allow a diamond graph to contain separate physical copies of a common
  transitive dependency in each branch.
- Copy every non-`SKILL.md` authored resource byte-for-byte with its relative
  structure intact.
- Validate all generated local links after the complete tree is assembled.

## Non-goals

- Concatenating multiple instruction bodies into one authored section
- Rewriting dependency prose, inferring precedence, or introducing implicit
  last-wins behavior
- Hoisting or deduplicating common transitive dependencies
- Runtime loading of neighboring root skills
- Mutating source directories

## Generated dependency block

The fixed generated shape is equivalent to:

```markdown
## Required skills

### `ptlam-testing`

**Reason:** Provides universal testing rules.

**Instructions:** Read it first and apply its rules before Flutter overrides.

Read [ptlam-testing](references/required-skills/ptlam-testing/SKILL.md).
```

Formatting may be centralized, but the `reason` and `instructions` values must
remain byte-for-byte equivalent in text content to the parsed manifest scalar.

## Acceptance criteria

- Generated frontmatter contains only the manifest skill ID and description.
- No compiler placeholder remains in generated output.
- Every direct dependency appears once in its owner's generated block and once
  as a nested directory for that edge.
- Each nested dependency has its own frontmatter and direct-dependency block.
- Dependency order matches the manifest and does not change precedence.
- Diamond dependencies remain recursively self-contained and use valid local
  links in both branches.
- All authored resources except transformed `SKILL.md` are byte-identical.
- Repeated composition from the same validated model produces identical paths
  and bytes.

## Validation

- Add unit fixtures for no dependency, one dependency, ordered siblings,
  multiple levels, and a diamond graph.
- Assert exact generated Markdown, nested paths, and copied resource bytes.
- Assert no authored directories are changed.
- Assert post-composition link validation catches missing generated or authored
  local targets.
