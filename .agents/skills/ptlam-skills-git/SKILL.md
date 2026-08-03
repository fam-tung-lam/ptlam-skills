---
name: ptlam-skills-git
description: Use for any Git operation in ptlam-skills, including commits, pushes, pulls, rebases, branches, pull requests, and cherry-picks. Provides commit message format and project conventions.
---

# Git Operations for PTLam Skills

## Commit Message Format

Use **Conventional Commits** with an optional scope:

```text
<type>(<scope>): <Description>
<type>: <Description>
```

### Types

- `feat`: New skill or user-facing capability
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no content or behavior change
- `refactor`: Restructure without meaning or behavior change
- `perf`: Performance improvement
- `test`: Add or update tests
- `chore`: Infrastructure, metadata, config, licensing, or dependencies
- `ci`: CI/CD changes

### Scopes

Use a skill name for one skill, `collection` for the portable collection,
`plugin` for Claude plugin metadata, or `agents` for coding-agent
infrastructure. Omit the scope for repository-wide changes.

Use `chore(agents)` for `.agents/` skills and other AI coding-agent
infrastructure unless they add an end-user product capability.

### Description Phrasing

**CRITICAL**: The subject must answer **why**, not just **what**. A reviewer
reading only the subject should understand the motivation.

- **State the outcome**, not the mechanics:
  - Good: `Standardize Git operations for coding agents`
  - Bad: `Update SKILL.md`
- **Name the capability**, not the implementation:
  - Good: `Expose planning skill to portable installers`
  - Bad: `Add path to plugin.json`
- **For refactors, state the reason**:
  - Good: `Separate validation rules for reuse`
  - Bad: `Move validation section`
- **For fixes, state what was broken**:
  - Good: `Prevent duplicate skill discovery in Claude`
  - Bad: `Change plugin skill paths`

### Detailed Commit Messages

Add a short, concrete body when the subject alone is not enough:

- For features, give a sample use or explain the capability.
- For fixes, explain the cause and how the fix prevents recurrence.

**Feature:**

```text
feat(collection): Expose review skill to installers

Make the review workflow discoverable through supported portable skill
installers so users can select it without copying files manually.
```

**Fix:**

```text
fix(plugin): Prevent duplicate skill discovery in Claude

The same skill was exposed through two plugin paths, producing duplicate menu
entries. Keep one canonical path so Claude discovers each skill once.
```

Before committing, ask: "Does the subject explain why this change exists?" If
it only describes what changed, rewrite it.

### Rules

1. Use imperative mood: `Add`, not `Added`.
2. Capitalize the first letter of the description.
3. Do not end the subject with a period.
4. Keep the subject near 50 characters when possible and never exceed 72.
5. Add a blank line before the body and explain why, not line-by-line mechanics.
6. Add `Fixes #<number>` or `Closes #<number>` when the commit resolves that
   issue. Use the full URL for a cross-repository issue.

### Examples

```text
feat(collection): Expose planning skill to installers
fix(plugin): Prevent duplicate skill discovery in Claude
refactor(collection): Separate validation rules for reuse
docs: Clarify one installation route per agent
chore(agents): Standardize Git operations
```
