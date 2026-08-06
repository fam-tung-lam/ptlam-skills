---
name: ptlam-grilling
description:
  Stress-test a plan, decision, or idea through one user-owned decision at a
  time. Use when the user explicitly asks to be grilled, challenged, or
  interviewed deeply before action, or wants to expose hidden assumptions,
  dependencies, contradictions, risks, and trade-offs. Research discoverable
  facts independently, recommend an answer for every decision, wait after each
  question, persist a resumable project-local decision record, resume prior
  grilling sessions when requested, and do not act until shared understanding is
  confirmed.
---

# PTLam Grilling

Stress-test a plan, decision, or idea through a deliberate sequence of user-owned
decisions. Resolve evidence independently, expose trade-offs, and keep the user
in control of consequential choices.

## Persist the grilling session

Resolve the project root before the first substantive question. Prefer the
repository root that owns the subject; otherwise use the task's workspace root.
Ask only when multiple plausible roots would place the session in different
projects. Store every grilling session at:

```text
<project-root>/.ptlam-skills/skills/ptlam-grilling/sessions/<YYYY-MM-DD>_<title>.md
```

Use the session's creation date and a short, filesystem-safe, descriptive title.
Prefer words that identify the actual decision over generic titles such as
`planning` or `discussion`. Create the directory and file once the topic and
intended outcome are clear, then tell the user the path. Keep updating the same
file; do not create one file per turn.

Before starting a new file, inspect existing session filenames and relevant
contents when the user asks to resume, refers to an earlier grilling session, or
names a topic that may already exist. Resume the one clear match. If several
sessions plausibly match, ask the user which one to continue. Read the complete
file, recheck drift-prone evidence, and continue from its next unresolved
decision without repeating settled questions.

Before creating or updating a session file, read and follow the canonical
[grilling session schema](references/grilling-session-schema.md). Keep the file
concise, readable without chat history, and sufficient for a new agent to
continue.

Record conclusions and evidence, not a turn-by-turn transcript or hidden
reasoning. Never persist secrets, credentials, or unrelated personal data.

Use judgment about useful checkpoints, but never let the file lag behind a
materially changed decision map. Update it after a consequential answer or new
evidence changes the map, before yielding with the next substantive question,
before a summary or handoff, and when the session becomes confirmed, deferred,
blocked, or complete. If persistence fails, report the failed path and reason
instead of silently claiming the session is resumable.

## Establish the decision map

1. State the intended outcome, known constraints, and the artifact or action the
   discussion would eventually enable.
2. Inspect repository files, tools, prior decisions, and other available
   evidence for discoverable facts. Do not ask the user to retrieve facts that
   can be checked safely.
3. Build an internal decision tree. Mark prerequisites, downstream effects,
   assumptions, conflicts, and branches that are already resolved.
4. Separate user-owned choices from reversible implementation mechanics. State
   a reasonable default for low-impact mechanics instead of spending a question
   on each one.

## Interview one decision at a time

1. Select the highest-impact unresolved decision whose prerequisites are known.
2. Ask exactly one question. Include:
   - why the decision matters now;
   - the recommended answer and its rationale;
   - the strongest material alternative; and
   - the main trade-off or consequence.
3. Wait for the user's answer before asking another question.
4. Record the answer, update the decision tree, and identify what it resolves or
   invalidates downstream. Persist the updated checkpoint before yielding with
   the next question.
5. Challenge contradictions with evidence. Reopen an earlier branch when a new
   answer makes it inconsistent; never smooth over incompatible decisions.
6. Continue until every outcome-changing branch is resolved or explicitly
   deferred with an owner and consequence.

Keep questions concrete. Use scenarios and counterexamples when an abstract
answer could hide different interpretations. Recommend decisively, but never
present the recommendation as the user's decision.

## Reach shared understanding

Summarize the outcome, non-goals, resolved decisions, accepted assumptions,
risks, deferred decisions, and next authorized action. Ask whether this is the
shared understanding and wait for confirmation. Persist the summary before
asking for confirmation, then record the user's confirmation or corrections.

Do not implement, publish, create resources, or otherwise act on the result
until the user confirms shared understanding or separately authorizes that
action.
