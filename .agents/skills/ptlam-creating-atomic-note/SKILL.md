---
name: ptlam-creating-atomic-note
description:
  Create, review, split, or merge atomic notes for Zettelkasten, evergreen
  notes, Obsidian, and other personal knowledge systems. Use when the user wants
  to capture an idea or source as a durable note, turn highlights or rough
  writing into self-contained notes, sharpen a vague note title, assess whether
  a note contains one independently linkable claim, split a broad note, or merge
  duplicate notes. Preserve local vault conventions, paraphrase source material
  with attribution, and annotate why links exist. Do not use for meeting
  minutes, task lists, project status notes, general journaling, or note-app
  support without knowledge-development intent.
---

# PTLam Creating Atomic Notes

Create, review, split, or merge durable notes that each express one reusable
idea. Keep the skill concerned with note semantics; let the user's knowledge
system own storage, metadata, filenames, and link syntax.

## Load the atomic-note rules

Read and follow [atomic-note principles](references/atomic-note-principles.md)
for every task. It owns the atomicity tests, note types, default Markdown shape,
and quality checks.

## Resolve the task and local contract

Identify whether the user wants to:

- create notes from an idea, source, quote, highlight, or rough capture;
- review or improve an existing note;
- split one note into independently useful claims; or
- merge notes that express the same claim.

When the user supplies a vault, note directory, or target file, inspect only the
nearby notes and configuration needed to learn its conventions. Follow verified
local rules for filenames, frontmatter, headings, tags, links, and source
citations. Treat the defaults in the reference as fallbacks, not a competing
schema.

Ask only when a missing choice would materially change the knowledge captured
or the destination. Otherwise, make reversible presentation choices and
continue. Return a Markdown draft in the response unless the user explicitly
asks to create or update files.

## Distill the idea

1. Separate the user's idea from source wording, examples, supporting evidence,
   and adjacent claims.
2. Preserve known attribution, but express the idea in fresh language the user
   can understand. Never turn copied text into an unattributed claim.
3. State the idea as one sharp declarative title or precise concept.
4. Apply the independent-link test from the reference. If the input contains
   several claims, produce separate drafts when plural notes are authorized;
   otherwise present the proposed titles before changing files.
5. Write enough context for the note to make sense without the conversation or
   source, and remove material that belongs to another claim.
6. Add only verified links to existing notes. Explain the relationship beside
   every link. For a new permanent-note draft, include at least one meaningful
   connection when possible; label unverified link ideas as suggestions rather
   than pretending the target exists.

Do not force an analogy, diagram, fixed word count, category hierarchy, or
decorative links. Use those only when they clarify this particular idea or
match the user's established system.

## Handle each operation

### Create

Produce one complete note per independent claim. Keep source summaries distinct
from the user's permanent claim when that distinction matters. If the user asks
to save the result, resolve the exact path before writing and report every file
created or changed.

### Review

Evaluate the note against the reference checklist. Lead with the verdict and
specific evidence. Suggest edits unless the user also asks to apply them.

### Split

Split only when the parts can stand alone and attract meaningfully different
links. Give each result enough context to remain self-contained. Preserve
sources and distribute existing links by their actual relationship. Update
backlinks only when the user authorized file changes and the targets are known.

### Merge

Merge only when notes express the same claim or one is redundant with the
other. Keep the sharper title, unique evidence, source attribution, and distinct
link context. Never merge merely because two notes share a topic.

## Verify the result

Before returning or saving a note, confirm that:

- its title identifies one claim or precise concept;
- its body contains everything needed for that idea and no adjacent idea;
- source wording is paraphrased unless a deliberate quotation is clearly
  marked and attributed;
- the note is understandable without the original chat or source;
- every included link states why the relationship matters;
- suggested links are distinguishable from verified existing notes; and
- local storage and metadata conventions were preserved.
