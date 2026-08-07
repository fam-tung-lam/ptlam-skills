---
name: ptlam-git
description:
  Plan, inspect, execute, review, diagnose, or recover Git workflows safely
  across repositories and collaboration models. Use for status and diffs;
  staging and commits; branches, worktrees, and refs; fetch, pull, merge,
  rebase, cherry-pick, revert, and history editing; pushes and deletions; tags;
  pull or merge request lifecycle work; conflicts, interrupted operations;
  recovery; and maintenance of project-local Git context and workflow
  preferences. Resolve repository policy, authority, custody, targets, and proof
  before mutation instead of assuming a topology or convention.
---

# PTLam Git

Route Git work through the stable decision kernel and load only the capability
patterns needed for the outcome.

## Load the governing references

1. Read [principles](references/principles.md) for every task. It owns the
   vocabulary, invariants, decision kernel, recovery rules, and proof envelope.
2. For every repository-tied task, read
   [project Git context](references/project-git-context.md). It owns the
   project-local `CONTEXT.md` path, durable Git facts and preferences, automatic
   maintenance boundaries, and freshness rules.
3. Read only the relevant capability sections in
   [patterns](references/patterns.md). They own operation-specific decisions and
   completion criteria.
4. When creating or changing a commit message, read
   [commit message preferences](references/commit-message-preferences.md). It
   owns preference precedence and the portable defaults for subjects, bodies,
   and issue references.

Patterns may specialize the principles but never weaken them.

## Run the workflow

1. Apply the operation kernel in `principles.md` to resolve context, policy,
   mode, scope, custody, impact, recovery, and required proof.
2. Load and verify the project Git context. In an authorized state-changing
   mode, persist material durable findings under its maintenance rules; keep
   inspect work read-only unless the user explicitly requests context
   maintenance.
3. Select patterns by capability and compose only those needed for the outcome.
4. Re-observe every controlling fact immediately before mutation; stop and
   re-plan if it changed.
5. Verify with the proof envelope and report the outcome, project Git context
   status, evidence, recovery state, risks, blockers, and gaps.

Keep exact command syntax at the execution edge. Assume no branch, remote,
commit format, merge method, wrapper, hosting surface, or project path. Use
available mechanisms without installing tools, and never expose credentials or
secret-bearing remote URLs.
