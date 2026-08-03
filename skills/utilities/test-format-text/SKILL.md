---
name: test-format-text
description: Normalize user-provided text into plain prose, bullets, or a checklist without adding facts or changing meaning. Use when the user asks to clean up, reformat, or standardize text while preserving its original information.
---

# Test Format Text

Normalize only the text the user supplies.

## Workflow

1. Identify the requested format: `plain`, `bullets`, or `checklist`. Ask for the format if it is missing.
2. Preserve every name, number, constraint, qualification, uncertainty, and relationship from the source.
3. Remove formatting noise, repeated whitespace, and accidental duplication. Keep intentional repetition when it affects meaning.
4. Apply the selected format:
   - `plain`: use concise sentences and paragraphs without list markers.
   - `bullets`: place each distinct source point in a `-` list item.
   - `checklist`: use `- [ ]` for actions. Keep non-actionable facts as ordinary `-` items instead of inventing tasks.
5. Return only the normalized text unless the user asks for commentary.

Do not add examples, explanations, conclusions, assumptions, or missing details. Do not make uncertain claims definite. If the source is ambiguous, preserve the ambiguity rather than resolving it.
