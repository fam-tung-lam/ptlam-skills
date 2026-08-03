---
name: ptlam-skills-git
description:
  Use for any Git operation in ptlam-skills, including commits, pushes, pulls,
  rebases, branches, pull requests, and cherry-picks. Provides commit message
  format and project conventions.
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

Use `ptlam-skills` when introducing a new skill, a skill name for a follow-up
change limited to that existing skill, `collection` for the portable collection,
`plugin` for Claude plugin metadata, or `agents` for coding-agent
infrastructure. Omit the scope for repository-wide changes.

Use `chore(agents)` for `.agents/` skills and other AI coding-agent
infrastructure unless they add an end-user product capability.

### New Skill Titles

Name the introduced skill and its purpose in both the main commit subject and
the pull request title:

```text
feat(ptlam-skills): Introduce `<skill-name>` skill to <purpose>
```

Use this same subject for the main commit and pull request title. Do not use the
new skill name as the scope: the capability being changed is the `ptlam-skills`
collection, while the description identifies the new skill.

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

Before committing, ask: "Does the subject explain why this change exists?" If it
only describes what changed, rewrite it.

### Rules

1. Use imperative mood: `Add`, not `Added`.
2. Capitalize the first letter of the description.
3. Do not end the subject with a period.
4. Keep the subject near 50 characters when possible and at most 72 by default.
   A new-skill title may exceed 72 when naming both the skill and its purpose is
   necessary to make the introduction self-explanatory; keep it concise.
5. Add a blank line before the body and explain why, not line-by-line mechanics.
6. Add `Fixes #<number>` or `Closes #<number>` when the commit resolves that
   issue. Use the full URL for a cross-repository issue.

### Examples

```text
feat(ptlam-skills): Introduce `ptlam-testing` skill to standardize automated test workflows
feat(collection): Expose planning skill to installers
fix(plugin): Prevent duplicate skill discovery in Claude
refactor(collection): Separate validation rules for reuse
docs: Clarify one installation route per agent
chore(agents): Standardize Git operations
```

## Consolidate `no-mistakes` Fixes

Treat corrective commits produced by `no-mistakes` as missed parts of the
related main change. Do not leave any pipeline-produced corrective commit
separate in the final pull request history, regardless of its commit subject.

For a new pull request, run `no-mistakes` with its PR and CI phases deferred so
the pipeline can return branch custody before history consolidation:

```text
no-mistakes axi run --skip=pr,ci --intent "<user goal>"
```

Then:

1. Drive the run to a successful terminal outcome. Never rewrite history while
   the pipeline owns the branch.
2. Follow `branch_sync.next_action` exactly. Run the guarded sync only when its
   code is `sync`; recover custody only when instructed.
3. After successful terminal validation and branch custody return, use the
   completed `no-mistakes` run history to identify every pipeline-produced
   corrective commit, regardless of its subject. Cross-check every commit since
   the base, then fold each correction into the main commit whose change it
   completes. A single-change branch should end with one commit.
4. Record the final tree before rewriting and prove that the consolidated commit
   has the same tree. The squash must change history, not content.
5. Fetch the live remote head immediately before publishing rewritten history.
   Use an explicit `--force-with-lease` for that observed SHA; never use plain
   `--force`.
6. Create or update the pull request so its title matches the consolidated main
   commit, then verify the live head and checks.

If the completed run history contains no pipeline-produced corrective commits,
keep the existing main commit and continue without rewriting history.
