# ISSUE-002: Validate isolated source skills and filesystem safety

## Status

- Status: Implemented
- Epic:
  [Compile public skills from composable plugin sources](../../epics/plugin-skill-composition-v2-epic.md)
- Depends on: ISSUE-001

## Problem

Composable output is safe only when every input is explicit, isolated, and
portable. Directory discovery, authored frontmatter, cross-skill paths, or a
pre-existing compiler namespace could otherwise bypass manifest ownership or
escape the skill being packaged.

## Scope

- Load the manifest only from `plugin/plugin.yml`.
- Parse strict YAML 1.2 with comments, rejecting duplicate keys, aliases,
  anchors, merge keys, explicit tags, interpolation, and non-JSON values.
- Require plugin versions to be quoted strings.
- Discover source skills only at flat `plugin/skills/<skill-id>/` paths.
- Enforce fail-closed one-to-one mapping between manifest entries and source
  directories, including draft, internal, deprecated, and archived entries.
- Require exactly one regular `SKILL.md` per source skill and require its body
  not to begin with YAML frontmatter.
- Require exactly one `<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->` placeholder in
  every authored `SKILL.md`, including skills with no direct requirements.
- Reserve `references/required-skills/` completely for the compiler and reject
  any authored file or directory at that path.
- Copy arbitrary other resource directories without inventing a whitelist, but
  reject known repository debris such as `.DS_Store`.
- Reject source roots, skill directories, files, and path segments that are
  symbolic links, non-regular, escaping, duplicated, or case-mismatched.
- Validate local Markdown links as paths confined to the owning source skill;
  prohibit direct cross-skill filesystem links and absolute local paths.
- Permit external `https://` links and require inter-skill relationships to use
  `required_skills` only.
- Aggregate independent diagnostics before any generation begins.

## Non-goals

- Fetching or validating remote link availability
- Discovering unlisted skills automatically
- Following symlinks or copying files outside the source skill
- Recognizing categories from directory names
- Writing, fixing, or normalizing authored resources

## Acceptance criteria

- Missing and orphaned source skills are both validation errors.
- Skill IDs exactly match their source directory names.
- Authored frontmatter and absent or repeated placeholders fail with actionable
  file-specific diagnostics.
- Every authored path is proven beneath its source skill without symlinks.
- Relative links that leave the source skill or target a sibling skill fail.
- Unknown useful directories survive validation; reserved compiler content and
  known debris do not.
- Validation remains read-only and makes no directories or output files.
- Existing valid errors are aggregated without exposing a partial Plugin model.

## Validation

- Add temporary-repository integration fixtures for missing, orphaned,
  symlinked, escaping, case-mismatched, and malformed source trees.
- Test strict YAML rejection, source frontmatter rejection, placeholder
  cardinality, reserved paths, arbitrary resource directories, and link
  containment.
- Snapshot or assert complete diagnostic sets for multiple independent errors.
- Prove source bytes and repository contents are unchanged after validation.
