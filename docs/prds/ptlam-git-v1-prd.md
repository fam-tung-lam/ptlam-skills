# PRD: `ptlam-git` v1

## Document status

- Status: Approved for implementation
- Date: 2026-08-04
- Product: `ptlam-skills`
- Skill: `ptlam-git`
- Category: `engineering`

## Summary

`ptlam-git` is a generic Agent Skill for reasoning about and completing Git
workflows safely across different repositories, collaboration models, and agent
environments.

The skill is a principle-first decision kernel, not a universal command recipe.
It discovers the active repository and policy, selects capability-driven
patterns, performs only actions within the granted authority, and closes every
workflow with evidence proportional to its impact.

V1 covers the full Git change lifecycle: discovery, scope and custody, worktrees
and branches, staging and commits, synchronization and integration, history
design and consolidation, publication, verification, recovery, and reporting. It
also supports an optional project-local profile for durable Git preferences
without caching live operation state. It ships as a lean skill package with
focused references and no mutating runtime scripts.

## Problem

Project-specific Git skills often encode one repository's branch names, remote
names, commit format, validation pipeline, and preferred history shape as if
they were universal rules. Those rules become unsafe or irrelevant in
repositories with forks, triangular remotes, stacked changes, protected
branches, shared feature branches, or dirty worktrees.

Generic command lists do not solve the problem. A syntactically valid command
can still target the wrong repository, absorb unrelated work, invalidate active
reviews, overwrite a concurrent push, or violate a repository's policy. Agents
need a reusable way to determine:

- what repository, ref, change range, and remote are actually in scope;
- which policy and collaboration constraints apply now;
- who currently has custody of each mutable target;
- whether an operation is reversible, local, published, or shared;
- which commits form meaningful review and recovery units;
- whether a correction belongs inside an existing unit or deserves its own;
- what evidence proves the intended result.

## Product decisions

The owner approved all thirteen decisions in the design review:

1. The product is a decision kernel with durable principles and a small pattern
   library, not a command encyclopedia or one prescribed end-to-end workflow.
2. The core is Git-first. Hosted collaboration mechanics stay outside the skill
   and are discovered from the current project and available tools only when a
   task requires them.
3. Autonomy is determined by user intent, reversibility, and collaboration
   impact. Technical capability alone never grants authority.
4. Good history consists of meaningful intent boundaries. Only corrections that
   complete an open implementation intent are folded by semantic ownership;
   independent behavior, review, dependency, rollback, and recovery value are
   preserved.
5. Publication makes history and collaboration identities shared. Rewriting a
   published target requires authority, custody, dependency checks, current
   applicable policy, recovery, and compare-and-swap against its exact expected
   prior identity or state token. Remote and review gates apply only when those
   surfaces exist.
6. V1 is a lean `SKILL.md` with focused principle, project-profile, and pattern
   references and no mutating scripts. The repository test tree remains reserved
   for executable source-code tests rather than skill prose, fixtures, or
   forward-evaluation artifacts.
7. Conflicting sources are resolved through layered authority and specificity.
   An unresolved conflict blocks only the affected mutation, not safe discovery.
8. Unrelated repository state is foreign until explicitly authorized. The skill
   never cleans, absorbs, normalizes, stashes, or destroys it for convenience.
9. Only one workflow has mutating custody of a shared target at a time. Other
   workflows integrate through explicit handoffs and evidence.
10. Uncertainty narrows action in proportion to possible impact. Reversible
    discovery continues; an unknown that controls a shared or irreversible
    effect fails closed.
11. Completion requires an impact-proportional proof envelope: observed prior
    state, chosen boundary, resulting state, and relevant checks.
12. The core principles remain stable while patterns and execution edges evolve
    by capability and version. The PRD scenario matrix remains the review
    contract for evaluating that evolution.
13. A project may keep a minimal optional Git profile under `.ptlam-skills` for
    durable facts and preferences. The profile is a freshness-checked input,
    never live state, repository authority, or permission to mutate.

## Goals

1. Give agents one reusable decision model for any Git operation without
   assuming a repository topology, branch model, or command wrapper.
2. Preserve user intent, unrelated work, and collaboration state as hard safety
   boundaries.
3. Produce coherent commit history that serves review, recovery, bisect, blame,
   and revert rather than preserving incidental implementation chronology.
4. Make semantic consolidation safe and generic, without classifying commits by
   author, tool, subject prefix, or validation system.
5. Support local-only, fork-based, shared-repository, stacked, and triangular
   workflows through the same core concepts.
6. Compose with project-specific validation, release, stacked-change, and
   publication workflows without stealing custody.
7. Make every mutation auditable through concise evidence and an explicit
   recovery boundary.
8. Keep the skill compact enough for reliable agent use through progressive
   disclosure and review its reasoning transfer against the PRD scenario matrix
   without shipping skill-specific test artifacts.
9. Let users customize otherwise unconstrained Git mechanics through a minimal
   project profile without duplicating repository policy or weakening live
   verification.

## Non-goals for v1

- Defining one universal branch strategy, commit count, commit-message format,
  remote name, default branch, merge method, or pull-request convention
- Defining hosted review-service integrations, schemas, or lifecycle workflows
- Replacing repository-specific validation, release, deployment, stacked-PR,
  merge-queue, or change-management workflows
- Recreating a skill installer, updater, transaction engine, background daemon,
  persistent operation ledger, or host-filesystem manager
- Using a project profile as live operation state, repository authority, or a
  standing permission grant
- Installing or updating Git, external CLIs, hooks, credentials, plugins, or
  dependencies
- Logging in, creating credentials, changing branch protection, bypassing
  controls, or escalating permissions
- Shipping a mutating command wrapper or hiding Git operations behind scripts
- Treating one pull or merge request as one commit by default
- Treating every later commit as corrective or every open change as safe to
  rewrite
- Rewriting merged, tagged, released, protected-base, shared, or dependent
  history as a generic workflow
- Cleaning, stashing, resetting, formatting, or committing unrelated work to
  obtain a clean state
- Guaranteeing external-service behavior that the agent has not observed
- Replacing human judgment when semantic ownership or collaboration authority
  remains materially ambiguous

## Users and jobs

### Coding agent completing a change

The agent needs to inspect the correct repository, preserve existing work,
create coherent commits, synchronize with the right base, publish to the right
destination, and report proof without requiring the user to prescribe every
command.

### Agent maintaining an open change

The agent needs to add fixes or review responses, decide whether they belong in
existing commits, preserve independent changes, update published history only
when safe, and re-verify the review surface after the update.

### Agent joining an existing workflow

The agent needs to discover whether another validator, release process,
stacked-change manager, or human currently owns branch mutation and either work
read-only or receive an explicit custody handoff.

### User customizing project Git behavior

The user needs durable commit, worktree, consolidation, and integration
preferences without changing the generic skill or granting future mutation
authority.

### Maintainer or reviewer

The human needs a concise explanation of what changed, why the history has its
shape, which shared state was touched, what was verified, and how to recover if
the outcome is wrong.

### Skill maintainer

The maintainer needs to extend execution support without changing the stable
decision model or coupling the skill to current repository paths and tools.

## Vocabulary

| Term                | Meaning                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Change intent       | The user-authorized outcome and its proven file, history, and collaboration scope                                          |
| Change range        | The commits and tree delta that implement one active change relative to its resolved base                                  |
| Meaningful unit     | A commit with one coherent rationale and useful independent review, recovery, or rollback value                            |
| Correction          | A change that completes an open implementation intent by repairing, completing, or clarifying its existing meaningful unit |
| Publication         | Making an object ID or ref available to another clone, worktree, automation, reviewer, or downstream branch                |
| Shared target       | A ref, change request, queue entry, tag, release boundary, or other state that another actor may observe or mutate         |
| Custody             | Exclusive authority to mutate one named target during a bounded workflow phase                                             |
| Dependency          | Any human, branch, worktree, review, automation, tag, queue, or release that relies on an object ID or ref                 |
| Execution mechanism | The available CLI, API, wrapper, or host tool used to carry out a decided action                                           |
| Compare-and-swap    | An update that succeeds only while the shared target still equals its explicitly observed prior identity or state token    |
| Proof envelope      | The minimal evidence connecting intent, prior state, action boundary, result, and checks                                   |

## Core principles

### P1. Context before action

Resolve the actual repository, common Git directory, worktree, `HEAD`, in-flight
operation, index, working tree, untracked state, submodule or linked-worktree
context, and relevant configuration before planning a mutation. Discovery is
read-only. Ambiguous or unexpected context is a decision point, not permission
to repair state implicitly.

### P2. Policy is input

Runtime and host safety constraints are non-overridable. Explicit user intent
caps the workflow's scope and effect. Applicable repository or collaboration
policy may add constraints but cannot authorize an effect outside that cap. A
verified project profile may narrow or select otherwise unconstrained mechanics,
but cannot override current evidence or policy, or expand user authorization.
`ptlam-git` defaults fill only remaining mechanics and never create authority.

Apply host-supported scoping, then use specificity only within one authority
class. A more specific lower-authority rule cannot override a higher one. An
unresolved contradiction blocks the dependent mutation and is reported
precisely; it does not prevent unrelated read-only discovery.

### P3. Preserve scope

Classify changed paths and hunks as task-owned, pre-existing, generated, or
unknown. Treat everything outside proven change intent as foreign. Never broaden
scope merely because the repository or filesystem is technically writable.

### P4. Prefer coherent change units

Design commits around behavior, rationale, dependency, and recovery value rather
than file count, elapsed time, tool provenance, or process chronology. A test,
documentation update, migration, generated artifact, and implementation may
belong together when they jointly make one meaningful unit complete.

### P5. Publication changes the rules

Unpublished, single-writer history may be edited when doing so improves its
meaning. Published history is a shared contract, including identities visible to
another linked worktree when no remote exists. A published rewrite is allowed
only with authority, custody, current applicable policy, dependency analysis,
recovery, and compare-and-swap against the shared target's exact expected prior
identity or state token. Require an expected remote object ID only for a remote
ref and hosted review verification only when that surface exists.

### P6. Consolidate by semantic ownership

Fold a correction into its owning commit only when it completes an open
implementation intent; has no independent rationale, behavior, review,
dependency, rollback, or recovery value and no external object-ID dependency;
both commits belong to the same rewrite-safe change range; the target remains
coherent; and the resulting tree preserves every intended change. Keep a
separate commit whenever those conditions are not proven.

### P7. Shared refs are concurrent state

Treat every shared target as state that another actor may change. Observe its
exact prior identity or state token immediately before mutation and use
compare-and-swap semantics for the update. For a remote ref, use its exact
object ID; for another shared surface, use the strongest exact revision or
precondition token it exposes. A mismatch stops the update and triggers
re-evaluation; it never justifies an unconditional overwrite. Block the mutation
when no exact guard can be proven.

### P8. Evidence closes the loop

Successful command execution is not completion. Verify local custody, intended
content, history and ancestry, repository checks, remote state, and current
review state in proportion to the action's impact. Report results and unverified
areas without replacing evidence with a full command transcript.

## Functional requirements

### FR-01: Trigger and operating modes

The skill must trigger for planning, executing, reviewing, diagnosing, or
recovering any Git workflow, including status and diffs; staging and commits;
branches, worktrees, and refs; fetch, pull, merge, rebase, cherry-pick, revert,
and history editing; pushes and deletions; and tags.

It must resolve one mode before mutation:

- **Inspect**: read-only explanation, review, audit, or diagnosis.
- **Prepare**: local change selection, staging, commit design, or unpublished
  history editing.
- **Integrate**: synchronize or combine histories.
- **Publish**: update a shared Git ref.
- **Recover**: preserve reachable work and restore a known safe boundary.

The user's request controls authorization. Mentioning an operation as a topic
does not authorize performing it.

### FR-02: Repository and operation discovery

Before a mutation, the agent must resolve and record at least:

- repository root, common Git directory, worktree identity, and trust boundary;
- normal, bare, linked-worktree, submodule, or nested-repository context;
- current branch or detached `HEAD` and exact object ID;
- merge, rebase, cherry-pick, revert, bisect, or other sequencer state;
- staged, unstaged, untracked, ignored-when-relevant, and conflicted state;
- repository-local and worktree-local configuration relevant to the action;
- current base, upstream, push destination, remote, and publication target as
  separate identities; and
- available execution capabilities without installing new tools.

The skill must stop a mutation whose target repository or ref cannot be proven.

### FR-03: Policy resolution

The agent must discover applicable repository instructions, contribution rules,
commit conventions, hooks, validation commands, branch rules, and active
workflow contracts. It must distinguish normative policy from examples and
historical artifacts.

The skill must not invent a universal precedence among arbitrary instruction
files. It must use the active agent host's scoping rules and report any conflict
that remains unresolved after applying authority and specificity.

### FR-04: Optional project Git profile

For repository-tied work, the agent must look for the optional profile at:

```text
<repository-root>/.ptlam-skills/skills/engineering/ptlam-git/
```

When present, `profile.md` is a small index of durable project facts,
preferences, evidence, invalidation signals, and task-relevant linked files. The
agent must verify relevant entries against current repository instructions, Git
configuration, and controlling shared state before use.

The profile may select otherwise unconstrained mechanics such as commit-body,
signing, worktree, consolidation, or integration preferences. It must not store
live object IDs, dirty state, checks, approvals, custody, handoffs, recovery
points, permission grants, credentials, or transient logs.

Normal Git work must not create or update profile files. Profile writes require
an explicit customization or maintenance request and remain separate from any
unrelated staging, commit, or publication scope. The skill must not edit
`.gitignore`, stage, or commit profile data automatically.

### FR-05: Scope and preservation

Before staging or changing history, the agent must classify every affected path
and, when mixed changes exist, every relevant hunk. Only task-owned content may
enter the planned mutation.

The agent must not discard, stash, clean, reset, rewrite, format, or commit
foreign state. If isolation is not possible, it must name the exact affected
state and block only the unsafe mutation.

### FR-06: Action and authority decision

For each action, the agent must classify:

- local versus shared effect;
- reversible versus destructive or identity-changing effect;
- expected collaborators and dependents;
- applicable user and repository authority;
- current custody owner; and
- evidence needed before and after the action.

Read-only discovery may continue freely. Local commits require delivery scope
and a proven task-only index. Remote updates, rewrites, deletions, merges,
releases, protection changes, and bypasses require authority proportionate to
their effect.

### FR-07: Target identity resolution

The agent must resolve branch, base, upstream, push destination, remote default,
and publication destination independently. It must never assume values such as
`main`, `master`, or `origin`, or assume local upstream equals publication
destination.

Every network mutation must name the repository, remote, local ref, remote ref,
and expected prior remote object ID when concurrency matters.

### FR-08: Commit design

The agent must derive commit boundaries from meaningful intent units. Each
durable commit should be independently understandable and, where practical,
independently valid under the repository's checks.

Commit messages, trailers, signing, sign-off, and issue-closing syntax come from
user or repository policy. The skill must not require Conventional Commits or
any other format by default.

### FR-09: Semantic consolidation

The skill must provide a repeatable consolidation decision:

1. Resolve the active change range and candidate owning commit.
2. Inspect patch semantics, open implementation intent, dependency, review
   context, rollback value, and recovery value.
3. Prove the later change completes that open implementation intent and adds no
   independent behavior, review, dependency, rollback, or recovery value.
4. Prove no collaborator or system depends on the candidate object IDs.
5. Prove the branch lifecycle and current custody permit rewriting.
6. Preserve the original tip as a recovery boundary.
7. Rewrite with the least broad mechanism supported by the environment.
8. Prove the final tree and intended patch series are equivalent unless a
   content change was explicitly part of the task.

Commit subject, author, tool, timestamp, or pipeline provenance must never be
used as the classification rule. A new requirement or independent behavior,
review, dependency, rollback, or recovery value remains a separate commit.

### FR-10: Published rewrite and concurrency guard

Every published identity is shared. Its mutation requires the exact expected
prior identity or state token and compare-and-swap semantics appropriate to that
surface. Remote and review gates apply only when those collaboration surfaces
exist.

An open or draft change request counts as published history. Before rewriting
its remote branch, the agent must prove:

- the user or repository authorizes rewriting that exact branch;
- the current workflow owns mutation custody;
- the branch is dedicated rather than shared or an integration target;
- no known stack, worktree, reviewer workflow, queue, tag, or downstream branch
  depends on the old object IDs;
- current applicable policy permits the update; and
- the exact remote head object ID has been observed immediately before push.

The update must use an explicit compare-and-swap lease bound to that observed
object ID. On mismatch, preserve local rewritten commits, fetch current state,
identify the concurrent change, and re-plan. Plain force is prohibited.

### FR-11: Custody and workflow composition

For each shared target, the skill must recognize at most one mutating owner at a
time. If a project-specific validator, release workflow, stacked-change tool, or
other actor owns the target, `ptlam-git` may inspect but must not mutate it
until the documented handoff occurs.

A transfer handoff must identify the target, prior and new custody owner,
observed target identity or state token, allowed next action, checks already
completed, and recovery boundary. A claim has no prior owner, and a release has
no new owner. The skill must consume structured workflow evidence when available
without encoding the producing workflow's name or implementation.

### FR-12: Hosted collaboration boundary

The skill does not define hosted review-service schemas, integration contracts,
or lifecycle procedures. When external collaboration state controls Git safety,
the agent discovers it from the current project, available tools, and current
official documentation. If that state cannot be observed, Git-only inspection
may continue while the dependent shared mutation remains blocked rather than
guessed.

### FR-13: Capability-driven pattern selection

The pattern library must cover at least:

- inspect and diagnose;
- isolate changes and prepare the index;
- create or switch branches and linked worktrees;
- create coherent commits;
- fetch and compare histories;
- integrate with merge, rebase, cherry-pick, or revert according to policy;
- consolidate unpublished or authorized published history;
- publish fast-forward and guarded non-fast-forward updates;
- manage high-impact refs such as tags or branch deletions; and
- recover from conflicts, interrupted operations, rejected updates, and mistaken
  local history edits.

Patterns define purpose, preconditions, decision points, invariants,
postconditions, recovery, and evidence. They are not unconditional command
recipes. Exact commands are selected from available tools and current official
documentation.

### FR-14: Risk-scoped uncertainty

When information is incomplete, the agent must continue read-only discovery and
actions whose safety is locally proven. It must fail closed before a shared,
destructive, or identity-changing effect that depends on unknown ownership,
policy, target, dependency, or remote state.

Every blocker must name the missing fact, the affected action, the attempted
safe checks, and the smallest user or environment input that would unblock it.

### FR-15: Recovery

Before a multi-step integration, rewrite, or destructive ref operation, the
agent must record the original local tip and relevant shared identity or state
token. It should use a named, inspectable recovery point when policy permits and
remove temporary recovery artifacts only after successful verification and
within explicit scope.

On conflict, the agent must keep the current operation understandable and use
its own continue or abort path. It must not layer an unrelated reset or cleanup
over an unfinished sequenced operation. Reflogs are recovery aids, not permanent
backups or proof of remote safety.

### FR-16: Verification and proof envelope

Verification must be proportional to the mutation and include, where relevant:

1. **Prior state:** resolved repository, target, intent boundary, custody, local
   object IDs, and the observed identity or state token for each shared target.
2. **Content:** intended staged or final diff, no unrelated changes, no conflict
   markers, and repository-required generated artifacts.
3. **History:** parentage, ancestry, commit boundaries, signatures or trailers
   when required, and old-versus-new patch-series comparison after rewriting.
4. **Repository checks:** hooks, tests, lint, formatting, build, or policy gates
   required for the affected change.
5. **Shared state:** each shared target equals the intended resulting identity
   or state and no concurrent update was overwritten, including remote-ref
   equality when a remote ref exists.
6. **Review state:** correct head and base, current diff, discussions,
   approvals, mergeability, queue state, and required checks for the latest
   relevant SHA.
7. **Recovery:** the retained recovery boundary and its cleanup status.

The report must lead with outcome, then summarize targets and mutations,
evidence, remaining risks, blockers, and unverified checks. It must not expose
credentials or remote URLs containing secrets.

### FR-17: Stable core and evolving edges

Principles and semantic decision algorithms must remain independent of current
project paths, hosted service names, CLI versions, and command wrappers.
Concrete names and paths in references are examples, not requirements.

Execution guidance must be capability-driven and version-aware. When a tool
introduces an experimental operation, the skill may select it only after
detecting support and must preserve a stable semantic fallback.

## Package architecture

The v1 implementation is expected to use this lean structure:

```text
skills/engineering/ptlam-git/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── project-profile.md
    ├── principles.md
    └── patterns.md
```

The exact split inside `references/` may change if one file becomes too broad,
but each concept must have one canonical owner:

- `SKILL.md` owns triggers, the top-level decision flow, reference routing, and
  reporting contract.
- `project-profile.md` owns the optional project-data contract, lifecycle,
  allowed content, freshness, and VCS boundaries.
- `principles.md` owns vocabulary, invariants, authority, preservation,
  publication, custody, uncertainty, and evidence.
- `patterns.md` owns capability-driven local, integration, publication,
  consolidation, and recovery patterns.

No v1 skill runtime script may mutate a repository. Do not place prose-contract
tests, service fixtures, forward-evaluation records, or other skill-specific
validation artifacts under `tests/`; that tree is reserved for tests of
executable source code.

## Scenario matrix

Each scenario is an independent behavioral review contract. Reviewers or
release-time validation may give agents realistic prompts and repository
evidence without naming the expected principle, but those evaluation artifacts
are not committed under `tests/`.

| ID  | Scenario                                                                                           | Expected decision and evidence                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| S01 | The current directory is not a Git repository and no target is named                               | Do not infer a repository; request or discover an explicit target before mutation                                               |
| S02 | A valid repository has unrelated staged, unstaged, and untracked work                              | Classify and preserve foreign state; stage only proven task-owned content or block the unsafe mutation                          |
| S03 | `HEAD` is detached or a merge, rebase, cherry-pick, or revert is in progress                       | Explain the observed operation; do not start a competing mutation or silently repair it                                         |
| S04 | A single-writer topic branch has unpublished implementation and correction commits                 | Fold only corrections that pass semantic ownership; preserve independent units; prove final tree and history                    |
| S05 | A later commit was produced by a tool but adds an independent behavior                             | Keep it separate because provenance does not determine ownership                                                                |
| S06 | A dedicated published branch has an open change request and the owner requests consolidation       | Check custody, dependents, current policy, review impact, and exact remote head; rewrite only with explicit lease and re-verify |
| S07 | A published branch changed remotely after the agent observed it                                    | Reject the stale update, preserve local work, fetch, identify the concurrent writer, and re-plan without blind force            |
| S08 | An open change request feeds a stacked branch or shared worktree                                   | Treat dependent object IDs as shared; preserve published history or coordinate a wider authorized rewrite                       |
| S09 | The remote, upstream, push destination, default branch, and change-request base differ             | Resolve each identity separately and name exact source and target refs before network mutation                                  |
| S10 | Repository policy requires a different commit format or integration method than the skill examples | Follow repository policy while preserving core safety invariants; do not enforce a generic format                               |
| S11 | Two applicable policy sources conflict                                                             | Continue safe discovery; block only the affected mutation and report the exact conflict                                         |
| S12 | A validation or release workflow currently owns the branch                                         | Respect its custody; inspect only until a structured handoff authorizes the next mutation                                       |
| S13 | Hosted review facts needed for a Git mutation cannot be observed                                   | Continue Git-only discovery; block only the mutation that depends on unknown external state                                     |
| S14 | A branch is merged, tagged, released, protected, or used as an integration base                    | Do not rewrite it as a generic cleanup; choose additive history or require a separately authorized recovery plan                |
| S15 | A destructive branch or tag deletion is requested                                                  | Resolve exact ref, merged or landed status, protection, dependents, remote state, authority, and recovery before deletion       |
| S16 | A rewrite preserves the final tree but changes patch boundaries and invalidates approvals          | Report history equivalence separately from review validity; re-check approvals, discussions, checks, and queue state            |
| S17 | An experimental Git command is available only in a newer installed version                         | Select by capability, retain stable semantic fallback, and do not make the experimental command part of the core contract       |
| S18 | The exact remote ref cannot be observed but a remote rewrite is requested                          | Complete local read-only analysis, then fail closed on publication with the precise missing evidence                            |
| S19 | A profile requires a bug-fix body explaining cause and prevention                                  | Verify the preference and apply it to commit design without making the format universal                                         |
| S20 | A profile records stale ref state or claims standing force-push permission                         | Ignore the stale or unauthorized entry; observe live state and require current authority                                        |
| S21 | A normal Git task starts in a repository without a profile                                         | Continue without a profile and do not create project data as a side effect                                                      |

## Staged v1 implementation

### Stage 1: Core contract

Create skill metadata, `SKILL.md`, vocabulary, eight principles, the optional
project-profile contract, the top-level decision flow, operating modes,
reference routing, and reporting contract.

Gate: structural validation and source review show that the skill is generic,
Git-first, preservation-first, and free of hard-coded repository conventions.

### Stage 2: Capability patterns

Add focused patterns for local preparation, coherent commits, worktrees and
branches, integration, semantic consolidation, guarded publication, destructive
refs, recovery, and verification.

Gate: contract review maps every pattern to preconditions, invariants,
postconditions, recovery, and evidence, with no unconditional mutating recipe.

### Stage 3: Review and catalog delivery

Add repository catalogs and plugin metadata, then review the full scenario
matrix with minimal context. Temporary repositories or independent agents may be
used as release-time evidence, but their skill-specific fixtures and reports are
not committed under `tests/`.

Gate: all acceptance criteria pass, any temporary validation avoids real shared
remotes, and unavailable evidence is disclosed rather than represented as
committed test coverage.

## Validation plan

1. Run the Agent Skills structural validator on `ptlam-git`.
2. Run repository Markdown formatting and lint checks.
3. Inspect metadata, catalog exposure, reference links, progressive disclosure,
   and absence of mutating scripts.
4. Search the package for prohibited universal assumptions such as fixed branch
   or remote names, mandatory commit formats, one-commit-per-change rules,
   hosted-service assumptions, commit classification by provenance, profile
   permission grants, and cached live state.
5. When higher-risk mechanics require execution evidence, exercise them only in
   ephemeral disposable repositories and do not commit the fixtures or reports
   under `tests/`.
6. Review scenario-matrix rows with independent agents when useful. Require each
   agent to state intent boundary, policy, custody, action, evidence, and
   blocker where applicable; retain no forward-evaluation artifact in the
   repository.
7. Run repository checks relevant to executable changed code and inspect the
   final diff for unrelated changes. Do not add skill-document contract tests to
   the repository test tree.

## Acceptance criteria

V1 is complete when:

1. `ptlam-git` is discoverable as an engineering skill with accurate metadata,
   is listed in the root and engineering catalogs, and is exposed exactly once
   through supported plugin metadata.
2. `SKILL.md` implements the stable flow: discover → resolve policy, optional
   profile inputs, and identities → classify scope, publication, and custody →
   choose the least-impact authorized action → mutate with explicit targets and
   concurrency guards → verify local and shared state, plus remote and review
   state when present → report evidence and recovery.
3. The package encodes all eight principles and all thirteen approved owner
   decisions without mentioning a project-specific validation pipeline.
4. The core contains no required hosted service, branch name, remote name,
   commit format, merge method, CLI wrapper, one-change-request-one-commit rule,
   current project topology, or absolute path.
5. References cover every required capability pattern and clearly separate
   invariant, policy input, decision, execution mechanism, and evidence.
6. Semantic consolidation folds only corrections that complete an open
   implementation intent after checking patch meaning and independent behavior,
   review, dependency, rollback, and recovery value; it never classifies a
   correction by author, subject, tool, timestamp, or provenance.
7. Unpublished consolidation guidance requires preservation of the intended
   final tree and coherent units, with impact-proportional evidence.
8. Published rewrite guidance requires explicit authority, single custody,
   dependency checks, current applicable policy, the exact expected prior
   identity or state token, compare-and-swap update, recovery, and post-update
   verification, with remote and review evidence only when those surfaces exist.
9. Publication guidance requires a stale remote observation to fail safely and
   never recommends a plain force update.
10. The dirty-worktree contract preserves every unrelated staged, unstaged, and
    untracked change.
11. Hosted collaboration mechanics remain outside the skill; unavailable
    external state never becomes permission for a dependent Git mutation.
12. The custody contract prevents `ptlam-git` from mutating a target owned by
    another active workflow until an explicit evidence-bearing handoff.
13. Every scenario-matrix row states the expected decision and
    impact-proportional proof envelope for review.
14. The optional project profile stores only durable, freshness-checked inputs;
    it never grants authority, caches live operation state, or changes as a side
    effect of unrelated Git work.
15. The installed skill needs no runtime package installation and ships no
    mutating scripts, persistent state engine, credential flow, or background
    service.
16. Skill structure, Markdown checks, and relative links pass; the repository
    contains no `ptlam-git` tests, fixtures, or forward-evaluation artifacts,
    and every unavailable or unverified check is disclosed rather than counted
    as passed.

## Risks and mitigations

| Risk                                            | Mitigation                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| The skill becomes a long command cookbook       | Keep `SKILL.md` as the routing interface; move conditional detail into focused references and review principles against PRD scenarios |
| “Generic” becomes vague and non-actionable      | Require capability patterns with explicit preconditions, decisions, invariants, postconditions, recovery, and proof                   |
| Hosted service behavior drifts                  | Resolve it from current project tools and documentation only when the task requires it                                                |
| Agents over-consolidate history                 | Require the full semantic ownership test and preserve independent review, rationale, and rollback units                               |
| Agents rewrite an open but shared change        | Treat publication as the boundary; check custody and every known dependency before rewrite                                            |
| Background fetch makes a shorthand lease unsafe | Bind compare-and-swap to the exact object ID observed immediately before the update                                                   |
| The skill steals control from another workflow  | Enforce single mutating custody and evidence-bearing handoffs                                                                         |
| Safety rules make the skill stop too often      | Scope uncertainty to impact; continue reversible discovery and locally proven work                                                    |
| Validation checks wording but not reasoning     | Use PRD scenario prompts during review and inspect decisions and proof envelopes, not phrase matching alone                           |
| Current paths or tools become stale             | Express universal algorithms and capability rules; mark concrete names as illustrations                                               |
| A profile becomes stale or hidden policy        | Treat it as a verified cache, link canonical sources, reject live state and permission grants, and report contradictions              |

## Primary references

- [Git workflows: separate changes and workflow principles](https://git-scm.com/docs/gitworkflows)
- [Git status porcelain for automation](https://git-scm.com/docs/git-status)
- [Git repository and revision discovery](https://git-scm.com/docs/git-rev-parse)
- [Git configuration scopes](https://git-scm.com/docs/git-config#SCOPES)
- [Git worktrees](https://git-scm.com/docs/git-worktree)
- [Git push leases](https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-with-leaseltrefnamegtltexpectgt)
- [Git range comparison](https://git-scm.com/docs/git-range-diff)
- [Git reflog recovery](https://git-scm.com/docs/git-reflog)
