# Resolve Project Git Context

Use this workflow for every repository-tied Git task. The skill's installation
location is irrelevant. Store durable project-specific Git knowledge in one
file:

```text
<repository-root>/.ptlam-skills/skills/engineering/ptlam-git/CONTEXT.md
```

This file is ordinary project data used by the installed skill, not a
project-local copy of the skill. It is a verified cache of durable Git facts and
preferences, never authority or live operation state.

## Contents

- [Resolve the repository and mode](#resolve-the-repository-and-mode)
- [Load or create the context](#load-or-create-the-context)
- [Keep one file with three kinds of information](#keep-one-file-with-three-kinds-of-information)
- [Handle earlier layouts](#handle-earlier-layouts)
- [Verify freshness and preserve Git scope](#verify-freshness-and-preserve-git-scope)
- [Feed the workflow and report](#feed-the-workflow-and-report)

## Resolve the repository and mode

1. Resolve each repository root under P1 in
   [principles](principles.md). Prefer explicit task paths and repository
   evidence; do not assume the current directory or skill installation path is
   the project root.
2. Keep nested repositories and submodules separate. Keep context for multiple
   repositories separate even when one task spans them.
3. In a linked worktree, use only the `CONTEXT.md` visible from the active
   worktree. Do not search other worktrees for local context.
4. Resolve the operation mode under P2 before maintaining context:
   - **Inspect**: load context without changing it. An explicit request to
     maintain Git context authorizes only the requested context-file change.
   - **Prepare, Integrate, Publish, or Recover**: automatically create or update
     context only when the authorized task establishes material durable Git
     knowledge.
5. If multiple repository roots remain plausible and the choice changes the
   stored scope, ask the user which repository owns the context.

Complete this step when every repository in scope has one resolved root and
mode, or one explicitly reported unresolved root.

## Load or create the context

- Load canonical `CONTEXT.md` when it exists. Treat current user instructions,
  repository policy, Git configuration, hooks, hosting configuration, and
  collaboration surfaces as the sources of truth.
- Continue without creating the file when it is absent and the task establishes
  no material durable Git fact or preference.
- Create or update it after a direct user request for Git workflow
  customization or context maintenance.
- In an authorized state-changing mode, create or update it automatically only
  after current evidence establishes material new, changed, or stale durable
  knowledge. A one-off choice is not a durable preference.
- Preserve unknown fields. Require an explicit migration before changing an
  unsupported schema.

Use compact identity and freshness frontmatter:

```yaml
---
schema_version: 1
skill: ptlam-git
canonical_path: skills/engineering/ptlam-git
updated_at: YYYY-MM-DD
---
```

Change `updated_at` only when stored content changes.

Complete this step when the current file state and operation mode permit one
clear read-only, create, or update path.

## Keep one file with three kinds of information

Use sections inside `CONTEXT.md`; do not create sibling profile, preference,
research, decision, or operation-state files.

### Project profile

Record only durable repository facts that affect Git work:

- repository, workspace, submodule, and worktree boundaries;
- repository-relative policy, hook, check, and collaboration entrypoints; and
- evidence plus freshness or invalidation signals.

Link to an authoritative repository source instead of duplicating its rules.

### Git flow

Record stable flow semantics that cannot be safely rediscovered from current
ref positions alone:

- branch and ref roles, base-selection rules, and upstream or push-destination
  relationships;
- isolation, worktree, integration, review, release, and publication practices;
- required checks, gates, and hosting surfaces; and
- the scope, evidence, and invalidation signals for each fact.

Record roles and policies, not current object IDs, ref positions, queue state,
or operation progress.

### Git preferences

Record stable user or project preferences with their scope and evidence:

- commit subject, body, trailer, signing, and issue-reference preferences;
- worktree, isolation, consolidation, and meaningful-unit preferences; and
- integration, publication, pull-request, and recovery preferences.

Record a user preference only when the user states it as a durable preference.
Do not infer one from a single accepted command, branch, commit, or workflow.
Do not repeat universal rules owned by this skill.

Keep `CONTEXT.md` concise and current. Update facts in place and remove stale
facts when their replacements are verified. Keep task-specific research,
alternatives, rationale, and decision history in the task report.

Never store:

- current object IDs, ref positions, dirty state, conflicts, checks, approvals,
  custody, handoffs, recovery points, or other live observations;
- permission grants, including standing authority for shared, destructive, or
  identity-changing actions;
- credentials, secret-bearing URLs, transient logs, or machine-specific
  absolute paths; or
- preferences inferred only from agent behavior or a one-off user choice.

Complete this step when every retained item is a current durable project fact,
Git-flow fact, or explicitly supported scoped preference.

## Handle earlier layouts

When canonical `CONTEXT.md` is absent, check the earlier flat
`.ptlam-skills/skills/ptlam-git/profile.md` layout and the categorized
`.ptlam-skills/skills/engineering/ptlam-git/profile.md` layout. Load relevant
profile, preference, context, and decision facts in place and report the earlier
layout.

During authorized writable context maintenance, consolidate only verified
current profile, flow, and preference facts into canonical `CONTEXT.md`. Do not
carry research, operation state, or decision history forward. Remove replaced
files only when deletion is explicitly authorized; otherwise leave them
untouched and report them as earlier-layout files.

Complete this step when current information has one canonical destination and
every retained earlier-layout file is reported.

## Verify freshness and preserve Git scope

- Before relying on a context entry, compare it with current instructions, Git
  configuration, repository evidence, and controlling shared state. Observe
  every mutation target live even when context describes its role.
- Refresh only task-relevant knowledge. Recheck an entry when its evidence
  changes, a recorded command fails, or current policy contradicts it. Treat
  dates as freshness signals, not proof.
- Use repository-relative paths and record evidence or invalidation signals for
  facts whose freshness is not self-evident.
- If `CONTEXT.md` is tracked, update it as ordinary project state. If it is
  ignored, keep it local. If it is untracked and not ignored, leave it untracked
  and report that status.
- Classify an automatic context-file change separately from the user's Git
  change range. Never stage, commit, publish, or add it to `.gitignore` unless
  the user explicitly includes that effect in the authorized Git scope.
- Preserve foreign and unknown fields and files under P3.

Complete this step when every used entry has current supporting evidence and
any context mutation preserves repository policy, VCS treatment, and the
authorized Git change range.

## Feed the workflow and report

Use verified task-relevant context as starting evidence under P2. It may narrow
or select otherwise unconstrained mechanics; it cannot override current
evidence or policy, authorize an action, or replace live target observation.

After an authorized state-changing task, persist only material durable facts
and preferences established by that task. In inspect mode, report suggested
changes without writing them unless the user explicitly requested context
maintenance.

Report whether `CONTEXT.md` was absent, loaded, created, updated, or left
unchanged; which entries affected the workflow; stale or provisional entries;
earlier-layout files; and relevant tracked, ignored, or untracked status. When
automatic maintenance changed the file, name the durable knowledge updated and
keep it outside unrelated staging and commits.

Complete this workflow when the Git task has the verified project context it
needs and the report accounts for the canonical file, freshness, any earlier
layout, and every context-file side effect.
