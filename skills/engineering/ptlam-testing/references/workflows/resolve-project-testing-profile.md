# Resolve Project Testing Profile

Use this workflow for every project-tied testing task. The skill's installation
location is irrelevant. Store durable project-specific testing knowledge at:

```text
<project-root>/.ptlam-skills/skills/engineering/ptlam-testing/
```

This directory is ordinary project data used by the installed skill, not a
project-local copy of the skill. Treat this canonical path as a stable storage
contract. If a future skill version changes its category or profile layout, it
must retain a read fallback and provide an explicit migration from this path.

## Resolve project roots

1. Prefer explicit paths, files, workspace selections, and repository evidence
   supplied by the task.
2. When working inside a project, walk upward to the relevant Git or build
   workspace root. Do not stop at an arbitrary package directory when the task
   is governed by a higher workspace root.
3. When the current working directory is above one or more projects, inspect
   only explicit task paths and a bounded set of nearby candidate roots. Never
   recursively scan the entire home directory to discover projects.
4. If multiple roots remain plausible and the choice would change the result,
   ask the user which project is in scope.
5. Keep profiles for multiple projects separate, even when one agent session
   works above or across them. Never merge their testing knowledge.
6. Disclose any candidate root that cannot be inspected because it is outside
   the available filesystem or sandbox scope.

## Load or initialize the profile

- If the canonical profile directory exists, load `profile.md` first and then
  only the linked files relevant to the current task.
- Treat repository instructions, manifests, lockfiles, build and test
  configuration, CI, and existing tests as the source of truth. The profile is a
  verified cache of durable facts and rationale, not authority over current
  repository evidence.
- In audit mode, do not create or update the profile. Report suggested changes
  with the audit findings.
- In write, fix, or explicit TDD mode, create a minimal `profile.md` only after
  analysis establishes at least one durable project-specific fact. Update an
  existing profile only when the task establishes material new or changed
  durable knowledge.
- When an existing schema or file contains unknown fields, preserve them. Do not
  destructively rewrite an unsupported profile; report a meaningful migration
  choice before changing it.

## Use the canonical structure

```text
.ptlam-skills/skills/engineering/ptlam-testing/
├── profile.md
├── preferences.md
├── contexts/
│   └── <context-id>.md
├── research/
│   └── <YYYY-MM-DD>-<topic>.md
└── decisions/
    └── <YYYY-MM-DD>-<decision>.md
```

`profile.md` is required only when a project profile exists. Every other file
and directory is optional: create it only when real content belongs there. Do
not create empty directories or placeholder files. Do not add `SKILL.md` or
`README.md` to this project-data directory.

Use small YAML frontmatter for identity and freshness:

```yaml
---
schema_version: 1
skill: ptlam-testing
canonical_path: skills/engineering/ptlam-testing
updated_at: YYYY-MM-DD
---
```

Use equivalent compact frontmatter in every linked Markdown file. Add only
fields relevant to that file, such as a stable context identifier or
`verified_at` for research.

Keep `profile.md` as the living index. It should map relative project paths to
the relevant testing contexts and link to active preferences, decisions, and
current research snapshots. Keep detailed, independently changing information in
the linked files rather than growing the index indefinitely.

## Define testing contexts

Split contexts by independently testable execution environment or capability.
Create separate contexts when one or more of these materially differ:

- execution environment or target;
- testing toolchain;
- test roots, commands, or CI jobs;
- supported platforms;
- lifecycle or integration infrastructure;
- version or dependency constraints.

Do not split solely because the project contains different packages, languages,
frameworks, SDKs, or testing tools. Use stable capability-oriented identifiers,
such as `mobile-client.md`, instead of naming a context after a replaceable
tool.

A context should record only relevant durable facts:

- relative paths to which it applies;
- execution environments and targets;
- tools, their roles, and material version constraints;
- test commands, roots, and naming conventions;
- supported test levels;
- test-double or integration infrastructure constraints;
- repository evidence;
- freshness and invalidation signals.

## Record durable knowledge

- Put additional stable user or project preferences in `preferences.md`, with
  their scope. Do not duplicate this skill's universal rules.
- Record an accepted or rejected material choice in
  `decisions/<YYYY-MM-DD>-<decision>.md`, including rationale, alternatives, and
  supporting evidence.
- Record time-sensitive tool research in `research/<YYYY-MM-DD>-<topic>.md`. The
  date is when the sources were verified, not when the task began. Include
  sources, relevant versions, trade-offs, and a `verified_at` value.
- When research is refreshed, create a newly dated snapshot and update
  `profile.md` to point to it. Remove the superseded snapshot unless its history
  is needed to explain a retained decision.

## Verify freshness

Before relying on a relevant profile fact, compare it with current repository
instructions, manifests, lockfiles, build and test configuration, CI, and
existing tests. Refresh the relevant context when evidence changes, a recorded
command fails, current versions or maintenance status matter, or a user
preference or accepted decision changes.

Verify only the context required for the task; do not rescan the entire project
on every use. Dates are freshness signals, not proof that a fact remains valid.

## Preserve mode and VCS policy

- In write, fix, or explicit TDD mode, persist only material durable knowledge
  learned by the task. Audit mode remains completely read-only.
- If the profile is already tracked, update it as normal project state. If it is
  ignored, keep it local. If it is untracked and not ignored, leave it untracked
  and report that status.
- Never edit `.gitignore`, stage files, or create a commit merely because the
  project testing profile was created or updated.
- Never store secrets, credentials, transient command logs, or machine-specific
  absolute paths. Use paths relative to the project root.

## Feed environment resolution and report

Use the relevant context as starting evidence for environment resolution, never
as hard-coded authority. In write, fix, or explicit TDD mode, persist material
new environment, tool, command, research, and decision facts after verifying
them. In audit mode, report the same facts only as suggested profile changes.

Report whether the profile was loaded, created, updated, or left unchanged; the
context selected; stale or provisional information; suggested audit-only
changes; and relevant tracked, ignored, or untracked status.
