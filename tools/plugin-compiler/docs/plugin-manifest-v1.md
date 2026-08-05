# Plugin manifest v1

[`plugin/plugin.yml`](../../../plugin/plugin.yml) is the canonical authored
catalog. The compiler validates it against
[`validation/schemas/plugin-manifest-v1.schema.json`](../validation/schemas/plugin-manifest-v1.schema.json)
before applying semantic, graph, source-tree, and Markdown-link rules.

The schema is authoritative for field shape. This guide explains the human
meaning and the rules that depend on more than JSON Schema.

## Top-level metadata

The manifest begins with the schema version and one quoted plugin release
version:

```yaml
schema_version: 1
name: ptlam-skills
description: Portable skills authored and published by PTLam.
version: "0.1.0"
author:
  name: PTLam
  email: owner@example.com
  url: https://example.com
homepage: https://example.com/ptlam-skills
repository: https://github.com/example/ptlam-skills
license: MIT
keywords:
  - agent-skills
```

- `schema_version` identifies the manifest structure. Version 1 is the only
  accepted value.
- `version` is the release shared by the plugin and all generated skills. It
  must be a quoted semantic version; individual skills and dependency edges do
  not carry versions.
- `homepage`, `repository`, and `author.url`, when present, must be HTTPS URLs.
- `author.email`, when present, must have a valid email-address shape.
- Unknown properties are rejected.

YAML is parsed in strict 1.2 mode. Duplicate keys, anchors, aliases, merge keys,
explicit tags, interpolation syntax, and an unquoted release version are
rejected.

## Marketplace metadata

Marketplace fields describe the plugin listing independently of the repository
metadata:

```yaml
marketplace:
  name: ptlam-skills
  description: Portable skills for agent workflows.
  plugin_description: Install PTLam's public skills.
  category: development
  keywords:
    - agent-skills
```

The compiler renders these fields into the host marketplace output. It does not
infer missing listing text from other top-level fields.

## Categories

Categories are ordered manifest objects:

```yaml
categories:
  - id: engineering
    name: Engineering
    description: Skills for software engineering workflows.
```

Category IDs are unique. Every skill's `category_id` must reference one declared
category. Category order is preserved where the generated catalog presents
groups.

## Skills

Every directory under `plugin/skills/` has exactly one matching manifest entry:

```yaml
skills:
  - id: ptlam-testing
    description: Design and maintain automated tests.
    category_id: engineering
    visibility: internal
    status: active
    required_skills: []
```

The `id` is the flat source directory name and the generated skill frontmatter
`name`. `description` becomes generated frontmatter and catalog text.

`visibility` and `status` are independent:

| Visibility | Status       | Generated as root | Allowed below active root |
| ---------- | ------------ | ----------------- | ------------------------- |
| `internal` | `draft`      | No                | No                        |
| `internal` | `active`     | No                | Yes                       |
| `internal` | `deprecated` | No                | Yes, with a warning       |
| `internal` | `archived`   | No                | No                        |
| `public`   | `draft`      | No                | No                        |
| `public`   | `active`     | Yes               | Yes                       |
| `public`   | `deprecated` | Yes               | Yes, with a warning       |
| `public`   | `archived`   | No                | No                        |

Active internal skills that cannot be reached from a generated public root
produce a warning. Dependency lifecycle compatibility produces at most one error
for each invalid edge.

## Required skills

Dependencies are explicit ordered edges:

```yaml
required_skills:
  - skill_id: ptlam-testing
    reason: Provides universal testing rules.
    instructions: >-
      Read it first and apply its rules before project-specific overrides.
```

Each edge declares:

- `skill_id`: another skill in this manifest;
- `reason`: why the dependency exists;
- `instructions`: how the consumer applies it.

Order is reading and display order, not an implicit override rule. The graph
must be acyclic. A public generated skill may depend on an active or deprecated
skill allowed by the lifecycle table; it may not depend on a draft or archived
skill.

Every source `SKILL.md` contains exactly one insertion marker:

```markdown
<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->
```

Generation removes an unused marker or replaces it with direct dependency
context. Required skills are recursively embedded beneath
`references/required-skills/<skill-id>/`. A shared leaf is intentionally copied
under each branch so each published skill remains self-contained.

## Deprecation and archive metadata

A deprecated skill declares migration guidance:

```yaml
status: deprecated
deprecation:
  reason: Superseded by the focused replacement.
  instructions: Migrate new usage to the replacement skill.
  replacement_skill_id: replacement-skill
```

An archived skill declares why it is no longer usable:

```yaml
status: archived
archive:
  reason: The workflow is no longer supported.
  replacement_skill_id: replacement-skill
```

Replacement IDs are optional, but when supplied they must identify a different
active public skill. This guarantees that generated migration guidance points to
a skill consumers can install and use.

Deprecation guidance is rendered in public catalog documentation. Archive
metadata remains maintainer-facing in the manifest.

## Authored source tree

One skill may contain:

```text
plugin/skills/<skill-id>/
├── SKILL.md
├── agents/
├── assets/
├── references/
└── scripts/
```

`SKILL.md` is body-only; generated frontmatter comes from the manifest. The
compiler rejects source frontmatter, missing or duplicate insertion markers,
symlinks, path escapes, non-regular resources, and the reserved
`references/required-skills/` namespace.

Resource paths are relative to their skill root. Files are snapshotted once and
ordered with a locale-independent code-point comparator before publication.

## Markdown links

Local links and images in `SKILL.md` and Markdown resources must resolve within
the authored skill tree. The compiler validates inline links, images, and
reference definitions discovered by the Markdown parser.

Syntax inside fenced code, inline code, escaped Markdown, and comments is not a
link. External URI schemes are recognized case-insensitively, so forms such as
`HTTPS://example.com` are external rather than local filesystem paths.

## Changing the manifest contract

When the manifest shape becomes incompatible:

1. update `validation/schemas/plugin-manifest-v1.schema.json`;
2. update the TypeScript model and validation rules;
3. update fixtures and schema-binding tests;
4. update this guide;
5. choose a migration and increment `schema_version` deliberately.

Do not use the plugin release `version` as a substitute for the schema version.
