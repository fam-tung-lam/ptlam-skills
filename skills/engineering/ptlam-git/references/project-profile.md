# Project Git profile

Use an optional project profile as a verified cache of durable Git facts and
preferences. Never treat it as authority or live operation state.

## Resolve the profile

Resolve the Git repository root under [principles](principles.md), then use:

```text
<repository-root>/.ptlam-skills/skills/engineering/ptlam-git/
```

Keep nested repositories and submodules separate. In a linked worktree, load
only the profile visible from the active worktree; do not search other worktrees
for local profile data.

- If `profile.md` exists, load it first and then only its task-relevant links.
- If it does not exist, continue without one.
- Create or update profile data only when the user explicitly requests Git
  workflow customization or profile maintenance.
- Preserve unknown fields and require an explicit migration before changing an
  unsupported schema.

## Keep the structure minimal

```text
.ptlam-skills/skills/engineering/ptlam-git/
├── profile.md
├── preferences.md
└── decisions/
    └── <YYYY-MM-DD>-<decision>.md
```

Only `profile.md` is required when a profile exists. Create other entries only
for real content; do not add placeholders, `SKILL.md`, or `README.md`.

Use compact identity and freshness metadata:

```yaml
---
schema_version: 1
skill: ptlam-git
canonical_path: skills/engineering/ptlam-git
updated_at: YYYY-MM-DD
---
```

Keep `profile.md` as a small index of scope, evidence, invalidation signals, and
links. Store scoped user preferences in `preferences.md`. Record only accepted
material workflow choices in `decisions/`.

## Record only durable inputs

Useful profile inputs include:

- commit subject, body, trailer, signing, and issue-reference preferences;
- semantic branch or ref roles not reliably inferable from current Git state;
- worktree, isolation, consolidation, and integration preferences; and
- repository-relative policy or check entrypoints with their evidence and
  invalidation signals.

Link to an authoritative repository source instead of duplicating its rules. Do
not repeat universal skill rules in the profile.

Never store:

- current object IDs, ref positions, dirty state, conflicts, checks, approvals,
  or other live observations;
- current custody, handoffs, recovery points, or an operation ledger;
- permission grants, including standing authority for shared, destructive, or
  identity-changing actions;
- credentials, secret-bearing URLs, transient logs, or machine-specific absolute
  paths.

Resolve profile conflicts and authority through P2 in `principles.md`.

## Verify freshness

Before relying on a profile entry, compare it with current instructions, Git
configuration, repository evidence, and any controlling shared state. Observe
every mutation target live even when the profile describes its role.

Treat dates as freshness signals, not proof. Ignore and report an entry whose
evidence is stale, missing, or contradicted. Verify only facts relevant to the
current task.

## Preserve Git scope

Treat profile files as task-owned only when profile maintenance is explicitly in
scope. Do not create, edit, stage, or commit them as a side effect of another
Git task, and never change `.gitignore` for the profile automatically.

When profile maintenance is authorized, preserve its existing VCS treatment:
update tracked files normally, keep ignored files local, and leave untracked
non-ignored files untracked unless the user separately authorizes delivery.

Report whether the profile was loaded, absent, created, updated, or ignored;
name stale inputs and any VCS effect.
