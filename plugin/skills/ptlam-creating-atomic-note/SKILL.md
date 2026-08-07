# PTLam Creating Atomic Notes

Create, review, split, or merge durable notes that each express one reusable
idea. Keep the skill concerned with note semantics; let the user's knowledge
system own storage, metadata, filenames, and link syntax.

<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->

## 1. Resolve the operation, local contract, and note role

Identify whether the user wants to:

- create notes from an idea, source, quote, highlight, or rough capture;
- review or improve an existing note;
- split one note into independently useful claims; or
- merge notes that express the same claim.

When the user supplies a vault, note directory, or target file, inspect the
nearby notes and configuration needed to learn its conventions. Follow verified
local rules for filenames, frontmatter, headings, tags, links, and source
citations.

Use these roles to resolve how the result participates in the knowledge system:

| Role | Purpose | Treatment |
| --- | --- | --- |
| Fleeting capture | Preserve a thought before it disappears | Keep visibly provisional; process or discard later. |
| Literature note | Record what a source contributes | Paraphrase faithfully and retain source context. |
| Permanent note | Add one reusable idea to the user's knowledge network | Make it atomic, self-contained, and meaningfully connected. |

Unless the user requests another role, treat an atomic-note request as a draft
permanent note. “Permanent” means designed for durable use, not frozen forever.

When no verified local shape exists, use this portable fallback:

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
target note and local link syntax are verified. Then use `Connections` and
render each target with the verified local syntax. If the user requests a file
and no naming convention exists, derive a short lowercase hyphenated slug from
the claim and use `.md`; do not invent a folder taxonomy or metadata schema.

Ask only when a missing choice would materially change the knowledge captured
or the destination. Otherwise, make reversible presentation choices and
continue. Return a Markdown draft in the response unless the user explicitly
asks to create or update files.

Complete this step when the operation, note role, and requested output are known,
every applicable destination and local convention is resolved, and file
authority is unambiguous.

## 2. Distill and test each idea

An atomic note develops exactly one independently addressable idea. Length is a
diagnostic, not the definition. Apply three tests:

1. **Title test:** Can one sharp declarative title or precise concept name the
   note?
2. **Completeness test:** Would removing any remaining passage make the idea
   incomplete, and is any required context still missing?
3. **Independent-link test:** Would readers reasonably link to two parts for
   different reasons? If so, those parts probably belong in separate notes.

A title containing `and` or `with` is a warning, not proof of two ideas. A
single relational claim can legitimately name two concepts.

Split when two claims can stand alone and develop different connection
profiles. Keep a coherent idea together when splitting would only make it
shorter. Merge only when notes state the same claim or maintain redundant
connections; topic overlap alone is insufficient.

### Write for future understanding

1. Separate the user's idea from source wording, examples, supporting evidence,
   and adjacent claims.
2. Preserve attribution and citations separately from the paraphrased claim,
   and express the idea in language the user understands. Distinguish the
   source's position, the user's interpretation, and established fact when that
   distinction affects meaning.
3. State the idea as one sharp declarative title or precise concept.
4. Apply all three tests. If the input contains several claims, produce separate
   drafts when plural notes are authorized; otherwise present the proposed
   titles before changing files.
5. Write enough context for the note to make sense without the conversation or
   source, prefer a concrete mechanism, implication, or boundary over generic
   summary, and remove material that belongs to another claim.

Use a deliberate quotation only when its exact wording matters. Mark and
attribute it, retain its source, and explain the idea in fresh words as well.

### Use precise titles

Prefer titles such as:

- `Spaced retrieval strengthens long-term recall by interrupting forgetting`
- `Annotated links preserve why two notes are connected`

Avoid topic buckets and vague process labels such as:

- `Spaced repetition`
- `Thoughts about links`
- `Notes from the book`

The title should let another note link to this claim with clear intent.

### Connect notes with meaning

Search the user's available note collection before claiming that a target
exists. Add links only to verified notes, use the verified local syntax, and
annotate why every relationship matters. For example:

```markdown
- <verified local link to "Retrieval practice strengthens recall"> — supplies
  the active-recall mechanism used by this scheduling strategy.
```

When no collection is available, use `Suggested connections`, keep targets as
plain titles, and do not imply that they are real files. Aim to give each
permanent note at least one meaningful connection. If none can be verified,
offer one or two annotated suggestions. An honest orphan draft remains valid;
do not invent a target to satisfy a quota.

Use an analogy, diagram, category hierarchy, or fixed length only when it
clarifies the idea or matches the user's established system. Prefer meaningful
connections over decorative links.

Produce synthesized knowledge rather than copied highlights, broad topic
buckets, bare links, premature fragments, or metadata work that replaces
thinking about the idea.

Complete this step when every proposed note passes the three tests, makes its
source status clear, contains enough context to stand alone, and distinguishes
verified links from suggestions with an annotated relationship.

## 3. Complete the selected operation

### Create

Produce one complete note per independent claim. Keep source summaries distinct
from the user's permanent claim when that distinction matters. If the user asks
to save the result, resolve the exact path before writing and report every file
created or changed.

Complete creation when each authorized claim has one self-contained draft or
saved note and every requested file effect is reported.

### Review

Evaluate the note against the verification criteria below. Lead with the
verdict, give evidence for every failed criterion, and propose corrections.
Provide or apply a rewritten note only when the user requests it.

Complete review when the verdict, supporting evidence, and applicable
corrections account for every verification criterion.

### Split

Split only when the parts can stand alone and attract meaningfully different
links. Give each result enough context to remain self-contained. Preserve
sources and distribute existing links by their actual relationship. Update
backlinks only when the user authorized file changes and the targets are known.

Complete splitting when every retained claim, citation, and connection has an
explicit destination and each resulting note is independently useful.

### Merge

Merge only when notes express the same claim or one is redundant with the
other. Keep the sharper title, unique evidence, source attribution, and distinct
link context. Keep separate notes that merely share a topic.

Return a merged draft unless the user explicitly requests file changes. Before
writing, resolve the destination note and preserve every source note by default.
Delete, archive, redirect, or rewrite backlinks only when the user separately
authorizes that effect and the affected targets are known. Report the
disposition of every affected file.

Complete merging when the result is complete and every applicable destination,
source-note disposition, and backlink treatment is unambiguous and authorized.

## 4. Verify the result

Before returning, confirm that every produced or revised note passes these
criteria. For a review, name each criterion that fails instead of claiming the
note passes.

- its title identifies one claim or precise concept;
- its body contains everything needed for that idea and no adjacent idea;
- source wording is paraphrased unless a deliberate quotation is clearly
  marked and attributed;
- the note is understandable without the original chat or source;
- every included link states why the relationship matters and follows verified
  local syntax;
- suggestions are distinguishable from verified existing notes;
- local storage and metadata conventions were preserved; and
- every file effect was authorized and reported.

Complete the task only when the output passes these criteria or the review
identifies the failures with evidence and corrections.
