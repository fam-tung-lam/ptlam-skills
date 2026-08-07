# Note roles and fallback shapes

Read this reference only when the note role is ambiguous or no verified local
output shape exists. The user's knowledge system owns representation; these
fallbacks prevent a missing convention from blocking the knowledge work.

## Select the note role

| Role | Purpose | Treatment |
| --- | --- | --- |
| Fleeting capture | Preserve a thought before it disappears | Keep visibly provisional; process or discard later. |
| Literature note | Record what a source contributes | Paraphrase faithfully and retain source context. |
| Permanent note | Add one reusable idea to the user's knowledge network | Make it atomic, self-contained, and meaningfully connected. |

Unless the user requests another role, treat an atomic-note request as a draft
permanent note. “Permanent” means designed for durable use, not frozen forever.

## Use the portable Markdown fallback

When no local shape exists, return:

```markdown
# <Declarative claim or precise concept>

> <One-sentence canonical claim.>

<Enough explanation, mechanism, evidence, or boundary to make the claim
self-contained.>

## Suggested connections

- <Note title> — <why this relationship matters>.

## Source

- <Source or attribution, when one exists.>
```

Omit empty sections. Keep connection suggestions as plain titles until both the
target note and the local link syntax are verified. Then use `Connections` and
render each target with the verified local syntax.

If the user requests a file and no naming convention exists, derive a short
lowercase hyphenated slug from the claim and use `.md`. Do not invent a folder
taxonomy or metadata schema.
