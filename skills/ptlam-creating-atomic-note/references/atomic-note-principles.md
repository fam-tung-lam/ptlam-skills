# Atomic-note principles

Use these rules to decide what belongs in one atomic note and how to keep it
reusable. Local vault conventions own representation; this reference owns the
knowledge-quality decisions.

## Atomicity is conceptual

An atomic note develops exactly one independently addressable idea. Length is a
diagnostic, not the definition.

Apply three tests:

1. **Title test:** Can one sharp declarative title or precise concept name the
   note?
2. **Completeness test:** Would removing any remaining passage make the idea
   incomplete, and is any required context still missing?
3. **Independent-link test:** Would different readers reasonably link to two
   parts for different reasons? If so, those parts probably belong in separate
   notes.

A title containing `and` or `with` is a warning, not automatic proof of two
ideas. A single relational claim can legitimately name two concepts.

Split when two claims can stand alone and develop different connection
profiles. Do not split a coherent idea merely to make it short. Merge only when
two notes state the same claim or maintain redundant connections; topic overlap
alone is insufficient.

## Write for future understanding

- Express the idea in language the user understands instead of copying source
  wording.
- Preserve attribution and citations separately from the paraphrased claim.
- Include the context needed to understand the idea without the source,
  conversation, or surrounding note.
- Distinguish a source's position, the user's interpretation, and established
  fact when the distinction affects meaning.
- Prefer a concrete mechanism, implication, or boundary over generic summary.

Use a deliberate quotation only when its exact wording matters. Mark it as a
quotation, retain its source, and ensure the note still explains the idea in
fresh words.

## Use precise titles

Prefer titles such as:

- `Spaced retrieval strengthens long-term recall by interrupting forgetting`
- `Annotated links preserve why two notes are connected`

Avoid topic buckets and vague process labels such as:

- `Spaced repetition`
- `Thoughts about links`
- `Notes from the book`

The title should let another note link to this claim with clear intent.

## Connect notes with meaning

Every included link needs a short relationship annotation:

```markdown
- [[Retrieval practice strengthens recall]] — supplies the active-recall
  mechanism used by this scheduling strategy.
```

Search the user's available note collection before claiming that a target
exists. If no collection is available, use a clearly labeled section such as
`Suggested connections` and do not imply that the targets are real files.

Aim to give each permanent note at least one meaningful connection. If no
collection is available, offer one or two annotated suggestions. An orphan note
can still be an honest draft; do not invent a verified target merely to satisfy
a quota.

## Distinguish note roles

| Role | Purpose | Treatment |
| --- | --- | --- |
| Fleeting capture | Preserve a thought before it disappears | Keep visibly provisional; process or discard later. |
| Literature note | Record what a source contributes | Paraphrase faithfully and retain source context. |
| Permanent note | Add one reusable idea to the user's knowledge network | Make it atomic, self-contained, and meaningfully connected. |

Unless the user requests another role, treat an atomic-note request as a draft
permanent note. “Permanent” means designed for durable use, not frozen forever.

## Use the local shape or the portable fallback

When verified local conventions exist, follow them. Otherwise return:

```markdown
# <Declarative claim or precise concept>

> <One-sentence canonical claim.>

<Enough explanation, mechanism, evidence, or boundary to make the claim
self-contained.>

## Connections

- [[Existing note]] — <why this relationship matters>.

## Source

- <Source or attribution, when one exists.>
```

Omit empty sections. Use `## Suggested connections` when targets have not been
verified. If the user requests a file and no naming convention exists, derive a
short lowercase hyphenated slug from the claim and use `.md`; do not invent a
folder taxonomy or metadata schema.

## Review checklist

| Check | Pass condition |
| --- | --- |
| One idea | The note has one independently linkable claim. |
| Sharp title | The title states the claim or precise concept, not a broad topic. |
| Complete | The claim makes sense without missing context. |
| Focused | Removing adjacent material does not weaken the claim. |
| Fresh wording | Source material is paraphrased or deliberately quoted and attributed. |
| Meaningful links | Each real or suggested link explains the relationship. |
| Honest status | Drafts, suggestions, and verified local facts are distinguishable. |

Reject collector behavior: copied highlights without synthesis, broad topic
buckets, bare links, premature fragmentation, and metadata work that replaces
thinking about the idea.
