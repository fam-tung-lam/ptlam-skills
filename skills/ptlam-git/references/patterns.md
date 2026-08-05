# Git capability patterns

Use only the patterns needed for the requested outcome. Apply the operation
kernel and proof envelope in [principles](principles.md) to every selected
pattern; repository policy chooses the concrete mechanism.

## Select a pattern

| Outcome                                      | Pattern                  |
| -------------------------------------------- | ------------------------ |
| Explain state or diagnose a problem          | `inspect-diagnose`       |
| Separate task changes from foreign state     | `isolate-index`          |
| Create or use a branch/worktree boundary     | `branch-worktree`        |
| Form meaningful commits                      | `coherent-commit`        |
| Observe and compare histories                | `fetch-compare`          |
| Merge, replay, select, or reverse history    | `integrate-history`      |
| Fold a correction into its semantic owner    | `semantic-consolidation` |
| Publish a local ref                          | `publish-ref`            |
| Move or delete a significant ref             | `high-impact-ref`        |
| Resolve an interrupted or mistaken operation | `recover-operation`      |

<!-- markdownlint-disable MD024 -->

## `inspect-diagnose`

### Use

Explain repository state, diagnose a problem, or collect facts for another
pattern.

### Decide

- Keep inspection read-only; diagnosis does not authorize repair.
- Separate observed facts, interpretation, and unknown external state.
- Inspect the exact objects, refs, configuration, linked worktrees, index,
  worktree, conflicts, and sequencer state relevant to the question.

### Result

Report the scoped answer and the unknowns that limit it.

## `isolate-index`

### Use

Prepare task-owned paths or hunks while unrelated state exists.

### Decide

- Prove the index is not owned by another operation.
- Select paths only when ownership is uniform; otherwise select hunks.
- Block inseparable overlap instead of relocating foreign work.

### Result

The staged patch contains exactly one intended unit and foreign state is
unchanged. If selection is wrong, reverse only the task-owned index change while
preserving worktree content.

## `branch-worktree`

### Use

Create or select a branch/worktree boundary without taking another worktree's
custody.

### Decide

- Resolve the start object, target ref, location, common Git directory, and
  linked worktrees.
- Treat an occupied ref or worktree as collaboration state, not an obstacle to
  bypass.
- Build an isolated candidate on a detached object or task-owned ref; never move
  a ref that remains checked out under another worktree's custody.
- Keep start point, base, upstream, and push destination distinct.
- Do not switch when local state cannot be preserved exactly.

### Result

The worktree is attached to the intended ref or explicit detached object. If an
owning worktree's local ref must converge, require its handoff and preserve its
state; otherwise report that ref as unchanged. Remove only task-created
boundaries with no unique or dependent work, and only when cleanup is
authorized.

## `coherent-commit`

### Use

Turn a task-only patch into meaningful review, recovery, bisect, blame, and
revert units.

### Decide

- Apply P4 to the staged patch and its dependency order.
- Derive message, trailer, signing, and issue syntax from applicable policy and
  verified profile preferences; the skill defines no format.
- Rewrite only a proven unpublished range under single custody; otherwise
  correct additively.

### Result

Each commit is understandable and, where practical, valid at its boundary. The
change range contains every intended change and no foreign work.

## `fetch-compare`

### Use

Refresh remote observations and compare content, ancestry, identity, or patch
series before another operation.

### Decide

- Resolve the remote repository, source refspecs, and local destination refs.
- Remember that remote-tracking refs are shared across linked worktrees. Fetch
  only destinations this workflow may update.
- When local ref mutation is unauthorized, use a read-only remote observation if
  available or report that transfer is blocked.
- Compare final trees, ancestry, object identity, and patch series separately.

### Result

Record exact objects, freshness, destination impact, and comparison results.
Authentication failure or unexpected movement leaves local work unchanged and
limits conclusions to observed facts.

## `integrate-history`

### Use

Combine, replay, select, or reverse proven histories.

### Decide

- Resolve every source, destination, base, dependency, and active change range.
- Let policy and intended history semantics choose the method.
- Do not start while another sequencer owns the repository.
- Treat semantic conflict ambiguity as an owner decision, not a mechanical fix.

### Result

Verify content, ancestry, patch boundaries, conflict resolutions, and checks.
Keep the original destination reachable and use the active operation's supported
continue or abort path.

## `semantic-consolidation`

### Use

Reduce corrective noise within an authorized rewrite-safe change range while
preserving meaningful units.

### Decide

Fold a correction only when every answer is proven:

| Question                                                                                       | Required |
| ---------------------------------------------------------------------------------------------- | -------- |
| Does it only complete the owning unit's open intent?                                           | yes      |
| Does it have independent behavior, rationale, review, dependency, recovery, or rollback value? | no       |
| Are both commits inside the same authorized range under one custody owner?                     | yes      |
| Is the range rewrite-safe and free of external object-ID dependents?                           | yes      |
| Will the resulting unit remain coherent?                                                       | yes      |
| Can intended final content and patch-series equivalence be proven?                             | yes      |

Otherwise keep it separate or block the rewrite. Author, subject, tool,
timestamp, provenance, position, and an open review never determine semantic
ownership or permission.

### Result

Record each fold/keep/block decision and prove final content and patch-series
equivalence. Use `publish-ref` for published history; preserve both histories on
conflict, rejection, or failed equivalence.

## `publish-ref`

### Use

Publish a local object to, or delete, an exact remote branch or tag.

### Decide

- Resolve the intended state: an exact local source object or ref absence for
  deletion, plus the fully qualified remote destination.
- For first publication, freshly prove absence and use a create-only guard when
  available; otherwise stop if concurrent creation cannot be detected safely.
- For an existing destination, bind the update or deletion to its freshly
  observed object ID.
- Prefer fast-forward. Require explicit rewrite authority and dependency
  coordination for non-fast-forward publication.
- Treat mismatch or rejection as concurrent state to inspect.

### Result

Verify that the remote ref equals the intended object, or is absent after
deletion, and no concurrent update was overwritten. Keep local work reachable on
failure; reversing a shared update is a new publication decision.

## `high-impact-ref`

### Use

Move or delete a protected, integration, release, published, or
recovery-significant branch or tag.

### Decide

- Resolve the exact ref, current object, intended state, protection, landed
  status when applicable, active worktrees, unique reachable work, and known
  dependencies.
- Treat local and remote cleanup as separate effects.
- Do not infer safety from name, age, matching refs, or apparent merge status.
- Combine with `publish-ref` for remote mutation.

### Result

Verify the resulting ref and reachability of intended work. Retain the prior
object and a recovery route whose lifetime matches the impact.

## `recover-operation`

### Use

Resolve an interrupted sequencer, conflict, rejected publication, or mistaken
local history edit without losing reachable work.

### Decide

- Diagnose `HEAD`, refs, index stages, sequencer metadata, reflog, task-owned
  and foreign state, and last safe objects.
- Continue or abort through the active operation's supported path.
- Preserve unique work before identity-changing recovery.
- After rejected publication, refresh remote state and re-plan instead of
  cleaning or forcing.
- Ask the owner when evidence cannot determine the intended semantic result.

### Result

Return to a named safe boundary or finish the intended operation. Keep candidate
tips reachable at identity-changing steps and stop at the latest understood
state if evidence diverges from the plan.

<!-- markdownlint-enable MD024 -->
