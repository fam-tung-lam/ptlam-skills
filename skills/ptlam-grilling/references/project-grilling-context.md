# Resolve project grilling context

Use this workflow for every project-tied grilling session. The skill's
installation location is irrelevant. Store durable project-specific grilling
knowledge in one file:

```text
<project-root>/.ptlam-skills/skills/ptlam-grilling/CONTEXT.md
```

This file is ordinary project data used by the installed skill. It is a
verified cache of durable project facts and grilling preferences, never
authority over current evidence and never a substitute for a session record.

## Resolve the project and context

1. Use the project root already resolved for the grilling session. Keep context
   for separate projects in separate files.
2. Load the canonical `CONTEXT.md` when it exists. Recheck every relevant entry
   against current repository evidence and user instructions before relying on
   it.
3. Continue without creating the file when the session establishes no durable
   project-specific fact or preference.
4. Create or update it when the user directly requests context maintenance or
   when an active grilling session establishes material durable knowledge that
   will change how future sessions should reason or ask questions.
5. Preserve unknown fields. Report a required migration rather than rewriting
   an unsupported schema.

Use compact identity and freshness frontmatter:

```yaml
---
schema_version: 1
skill: ptlam-grilling
canonical_path: skills/ptlam-grilling
updated_at: YYYY-MM-DD
---
```

Complete this step when the project has one clear context path and the current
session permits one read-only, create, or update path.

## Store only durable memory

Use this compact shape. Keep `Project profile` when the file exists and omit
empty optional sections:

```markdown
# Project Grilling Context

## Project profile

## Recurring decision constraints

## Grilling preferences
```

### Project profile

Record only durable project facts that affect how decisions should be explored:

- repository-relative policy and architecture entry points;
- stable project, product, stakeholder, and vocabulary boundaries;
- authoritative evidence paths; and
- freshness or invalidation signals.

Link to authoritative repository sources instead of duplicating their rules.

### Recurring decision constraints

Record stable constraints that apply across multiple grilling sessions, such
as fixed product boundaries, accepted risk limits, compatibility promises, or
decision ownership. Do not promote a one-session conclusion into durable
context unless current evidence shows that it governs future work.

### Grilling preferences

Record explicit, stable user or project preferences that specialize how future
grilling sessions should communicate or prioritize decisions. Include their
scope and evidence. Do not store permission grants or infer a durable preference
from one answer.

Keep session-specific outcomes, evidence snapshots, open questions, current
status, and resume instructions in the session file under `sessions/`. Keep
research notes, alternatives, and decision history out of `CONTEXT.md`.

Never store secrets, credentials, personal data unrelated to the project,
transient logs, machine-specific absolute paths, or hidden reasoning.

Complete this step when every retained item is a current durable project fact,
recurring constraint, or explicitly supported grilling preference.

## Preserve repository treatment

- If `CONTEXT.md` is tracked, update it as ordinary project state. If it is
  ignored, keep it local. If it is untracked and not ignored, leave it untracked
  unless the user includes it in the authorized change.
- Change `updated_at` only when stored content changes.
- Update facts in place and remove stale facts only after verifying their
  replacement.
- Never edit `.gitignore`, stage files, or create a commit merely because
  context was created or refreshed.

Report whether context was absent, loaded, created, updated, or left unchanged;
which entries affected the session; stale or provisional entries; and relevant
tracked, ignored, or untracked state.

Complete this workflow when the session has current project memory without
duplicating its decision record and every context-file side effect is accounted
for.
