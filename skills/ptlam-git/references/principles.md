# PTLam Git principles and operation kernel

This file owns the stable rules for every Git task. Capability patterns may add
preconditions and evidence, but may not weaken these rules.

## Vocabulary

| Term                 | Meaning                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Change intent**    | The user-authorized outcome and its proven file, history, and collaboration scope.                            |
| **Change range**     | The commits and tree delta for one active change relative to its resolved base.                               |
| **Meaningful unit**  | A commit with one rationale and useful independent review, recovery, or rollback value.                       |
| **Correction**       | Work that completes an open implementation intent by repairing or completing its meaningful unit.             |
| **Publication**      | Making an object ID or ref observable by another clone, worktree, automation, reviewer, or downstream branch. |
| **Shared target**    | A ref, review, queue, tag, release boundary, or other state that another actor may observe or mutate.         |
| **Custody**          | Exclusive authority to mutate one named target during a bounded workflow phase.                               |
| **Dependency**       | A human or system that relies on an object ID or ref.                                                         |
| **Compare-and-swap** | An update guarded by the shared target's explicitly observed prior identity or state token.                   |
| **Proof envelope**   | The minimal evidence connecting intent, prior state, action boundary, result, and checks.                     |

## Core principles

### P1. Establish context before action

Before mutation, resolve the repository root, common Git directory, worktree,
repository kind, exact `HEAD`, branch or detached state, in-flight operation,
index, working tree, untracked and conflicted state, relevant configuration, and
linked repositories or worktrees. Discovery is read-only. Ambiguous context
permits inspection, not repair.

### P2. Resolve authority and mode

Apply this authority order:

1. Runtime and host safety is non-overridable.
2. Explicit user intent caps scope and effect; silence is not permission.
3. Applicable repository or collaboration policy may narrow authority or add
   preconditions, but cannot expand the user's authorization.
4. Verified project Git context may narrow or select otherwise unconstrained
   mechanics. It cannot override current evidence or policy, or expand the
   user's authorization.
5. Skill defaults fill only unconstrained mechanics.

Use host-supported instruction scope, then specificity within the same authority
class. A lower authority cannot override a higher one. Block only the mutation
controlled by an unresolved conflict and continue safe discovery.

Resolve one mode before changing state:

| Mode          | Authorized effect                                                      |
| ------------- | ---------------------------------------------------------------------- |
| **Inspect**   | Observe and explain without mutation.                                  |
| **Prepare**   | Select local changes, stage, commit, or edit safe unpublished history. |
| **Integrate** | Synchronize or combine histories under applicable policy.              |
| **Publish**   | Update a shared ref or review surface.                                 |
| **Recover**   | Preserve reachable work and return to a proven boundary.               |

One request may authorize several mode transitions while intent, target, and
effect remain unchanged. Obtain new authority for expanded scope or a shared or
destructive effect not authorized by the original request.

### P3. Preserve scope

Classify every affected path and mixed hunk:

| Class            | Rule                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| **Task-owned**   | Proven necessary for the authorized change intent.                              |
| **Pre-existing** | Present before the task and not proven task-owned.                              |
| **Generated**    | Task-owned only when applicable policy and a proven source change require it.   |
| **Unknown**      | Treat as foreign until ownership is established.                                |
| **Foreign**      | Outside the change intent, including pre-existing and unresolved unknown state. |

Never clean, stash, reset, format, rewrite, stage, commit, or move foreign state
for convenience. If path-level selection cannot isolate mixed ownership, block
only the overlapping mutation.

### P4. Prefer meaningful units

Design commits around behavior, rationale, dependency, review, recovery, and
rollback value—not file count, elapsed time, author, subject, tool, timestamp,
or process chronology. Different file kinds belong together when they make one
unit complete; split work that has independent value.

### P5. Treat publication as a shared contract

Edit unpublished, single-writer history only when it improves meaning. Treat an
identity visible to another clone, linked worktree, automation, reviewer, or
downstream branch as published. A published rewrite requires authority, current
policy, custody, dependency analysis, recovery, and verification of every
collaboration surface that exists.

Before changing a shared target, observe its exact prior identity or strongest
state token and use compare-and-swap. Use an expected remote object ID only for
a remote ref and hosted review checks only when that surface exists. Stop on a
mismatch; never replace the guard with an unconditional overwrite.

### P6. Consolidate by semantic ownership

Semantic ownership, not provenance, decides whether a correction folds. Apply
the `semantic-consolidation` pattern; any unproven required condition keeps the
unit separate or blocks the rewrite.

### P7. Enforce single mutation custody

Allow at most one workflow to mutate a named shared target:

| Custody state                | Decision                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------- |
| Proven unowned               | An authorized workflow may claim it against the current target identity.                |
| Owned by this workflow       | Continue only within the authorized action while the observed identity remains current. |
| Owned by another workflow    | Inspect until that owner supplies a current explicit handoff.                           |
| Unknown, ambiguous, or stale | Inspect until custody and target evidence are refreshed.                                |
| Owned and work is complete   | Release it or hand it to a named owner with resulting identity and evidence.            |

A handoff records the target, prior and new owner when applicable, current
identity or token, allowed next action, completed checks, and recovery boundary.
Do not invent inapplicable actors. Missing, mismatched, or stale fields block
only the dependent mutation.

### P8. Close with impact-proportional evidence

Do not equate command success with completion. Build the relevant parts of this
proof envelope and report unavailable or stale evidence:

- **Prior state:** repository, intent, target, custody, policy, and exact shared
  identity or token.
- **Action boundary:** mode, included scope, excluded foreign state,
  preconditions, chosen action, and recovery point.
- **Result:** resulting target identity and observed local or shared state.
- **Content:** intended diff, absence of foreign changes or conflict markers,
  and required generated artifacts.
- **History:** parentage, ancestry, meaningful units, required signatures or
  trailers, and patch-series comparison after a rewrite.
- **Repository checks:** applicable hooks, tests, lint, formatting, build, and
  policy gates.
- **Shared checks:** guarded prior state, resulting state, and evidence that no
  concurrent update was overwritten.
- **Review checks:** current head/base, diff, discussions, approvals,
  mergeability, queue state, and checks when a review surface exists.
- **Recovery:** retained boundary, restoration route, and cleanup state.

Lead with the outcome, targets, and mutations. Then summarize evidence,
recovery, remaining risks, blockers, and gaps; do not substitute a command
transcript for proof.

## Operation decision kernel

Apply this sequence before and after mutation:

1. Restate the change intent, exclude merely discussed outcomes, and select the
   mode under P2.
2. Establish context under P1 and resolve branch, base, upstream, push
   destination, remote, and publication target as separate identities.
3. Classify scope under P3 and action impact by effect, reversibility,
   collaborators, dependencies, custody, uncertainty, and required evidence.
4. Choose the least-impact pattern consistent with P4-P7 whose preconditions are
   proven.
5. Record the original tips and create an inspectable recovery boundary before
   multi-step integration, rewrite, or destructive ref work when policy permits.
6. Mutate only explicit task-owned targets while custody and observations remain
   current.
7. Verify and report through P8; retain recovery until verification passes and
   clean up only when authorized.

Continue read-only discovery and proven reversible local work when an unknown
does not control the next action. Fail closed before an affected shared,
destructive, or identity-changing action if authority, custody, target,
dependency, policy, expected state, or recovery remains unknown.

Use an active operation's own continue or abort path. Treat reflog data as a
recovery aid, not a durable backup or proof of shared safety.

Report a blocker with the missing fact, affected action, safe checks attempted,
and smallest input that can unblock it. Do not turn scoped uncertainty into a
global stop while independent safe work remains.
