---
name: test-review-change
description:
  Review a brief description of a small code or product change, identify likely
  risks, propose focused checks, and give a clear verdict. Use when a user asks
  to sanity-check a narrowly scoped change before implementation, review, or
  merge.
---

# Review a Small Change

Review the supplied description without inventing missing implementation details
or claiming that checks ran.

1. Restate the intended behavior and affected area in plain language.
2. Identify concrete failure modes, compatibility concerns, and unclear
   assumptions. Match the depth to the size of the change.
3. Propose the smallest useful set of checks. Prefer observable behavior and
   boundary cases over generic advice.
4. Choose one verdict: `Ready`, `Ready with conditions`, `Needs clarification`,
   or `Do not proceed`.

Return exactly these sections:

## Summary

Give a concise description of the change and its scope.

## Risks

List specific risks or write `No material risks apparent from the description.`

## Checks

Provide a short checklist. Distinguish checks already evidenced by the user from
checks still needed.

## Verdict

State one verdict and justify it in one or two sentences. Treat missing critical
context as `Needs clarification`; do not silently assume it.
