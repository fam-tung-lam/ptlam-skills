# Pham Tung Lam's Agent Skill Catalog

This repository is the personal catalog of agent skills used and maintained by
[Pham Tung Lam](https://github.com/fam-tung-lam).

It provides one centralized place to manage:

- Available skills.
- Skill organization and categories.
- Published catalog versions.
- Additions, updates, and retirements over time.

Keeping this state in one version-controlled repository makes changes visible
and repeatable across the agents and projects that Lam uses.

## Layout

Authored plugin sources live under `plugin/`. The root `skills/` directory is a
committed, compiler-owned publication output:

```text
plugin/
├── plugin.yml
└── skills/
    └── <skill-id>/
        ├── SKILL.md
        └── ...

skills/
└── <published-skill-id>/
    ├── SKILL.md
    └── ...
```

Source and generated skill directories are flat. Categories are manifest
metadata and do not create directory levels. Edit only `plugin/plugin.yml` and
`plugin/skills/`; regenerate `skills/` instead of editing it directly.

<!-- BEGIN GENERATED:PLUGIN-CATALOG:SKILLS -->

## Available skills

| Skill                           | Category     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Status | Replacement |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| `ptlam-git`                     | Engineering  | Plan, inspect, execute, review, diagnose, or recover Git workflows safely across repositories and collaboration models. Use for status and diffs; staging and commits; branches, worktrees, and refs; fetch, pull, merge, rebase, cherry-pick, revert, and history editing; pushes and deletions; tags; pull or merge request lifecycle work; conflicts, interrupted operations; recovery; and optional project-local Git profiles. Resolve repository policy, authority, custody, targets, and proof before mutation instead of assuming a topology or convention. | Active | —           |
| `ptlam-testing`                 | Engineering  | Design, write, update, run, review, and diagnose automated tests at unit, integration, and end-to-end levels. Use when an agent needs to select a test level, add or repair tests, improve testability, assess test quality, audit test code for compliance, maintain or refresh a project-local testing profile, resolve a project's testing environment, select or recommend compatible test tools, or follow an explicitly requested test-first or Red-Green-Refactor workflow. Do not infer TDD merely from a request for tests or integration testing.         | Active | —           |
| `ptlam-explain-with-analogy`    | Productivity | Teach an unfamiliar, abstract, or complex topic through one coherent real-life analogy with stable concept mappings, connected context, progressive visual scenes, and meaningful interaction. Use when the user asks how something works, wants a simple or intuitive visual explanation, asks for an analogy or metaphor, or needs to understand architecture, relationships, workflow, structure, lifecycle, ownership, cardinality, comparison, or cause and effect. Use even for one concept when its role depends on surrounding components.                  | Active | —           |
| `ptlam-visualization-with-html` | Productivity | Create portable, polished, interactive HTML explainers and learning artifacts with native HTML, CSS, JavaScript, SVG, and one Material 3 Expressive design system. Use when Codex needs to visualize architecture, workflows, state changes, sequences, entity relationships, semantic zoom, real-life analogy twins, or step-by-step system behavior in an HTML file; when a learner should manipulate or observe a diagram rather than read long prose; or when a top-to-bottom visual field guide, simulator, or validation artifact is requested.               | Active | —           |

<!-- END GENERATED:PLUGIN-CATALOG:SKILLS -->

## Using the catalog

Choose one installation route per agent. Installing the Claude Code plugin and
also copying the same skills into Claude Code with the `skills` CLI would expose
duplicates.

### Claude Code

Add this repository as a marketplace, then install its plugin:

```bash
claude plugin marketplace add fam-tung-lam/ptlam-skills
claude plugin install ptlam-skills
```

Or run the equivalent commands inside a Claude Code session:

```text
/plugin marketplace add fam-tung-lam/ptlam-skills
/plugin install ptlam-skills
/reload-plugins
```

Unlike a plugin in Claude Code's official marketplace, this self-hosted plugin
needs the one-time marketplace command first.

Update the installed plugin with Claude Code's plugin manager:

```bash
claude plugin update ptlam-skills@ptlam
```

Restart Claude Code to apply the update.

### Codex and other agents

Use the standard Agent Skills installer:

```bash
npx skills@latest add fam-tung-lam/ptlam-skills
```

Choose the skills and target agents interactively. For a non-interactive Codex
project install of the whole collection:

```bash
npx skills@latest add fam-tung-lam/ptlam-skills \
  --skill '*' --agent codex --copy --yes
```

The `skills` CLI owns the project installation and its source tracking. Refresh
installations later with:

```bash
npx skills@latest update
```

## Maintaining the catalog

[`plugin/plugin.yml`](plugin/plugin.yml) is the authored manifest for plugin
identity, release version, marketplace metadata, ordered categories, skill
descriptions, lifecycle, visibility, and compile-time dependencies. A source
`plugin/skills/<id>/SKILL.md` owns only that skill's runtime instructions and
contains no YAML frontmatter; the compiler generates frontmatter from the
manifest's `id` and `description`.

| Source                                      | Owns                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `plugin/plugin.yml`                         | Plugin metadata, categories, skill identity and description, lifecycle, and dependencies   |
| `plugin/skills/<id>/SKILL.md`               | Authored runtime instructions and the required-skills insertion marker                     |
| `plugin/skills/<id>/agents/openai.yaml`     | OpenAI-specific display and tool dependency metadata for one source skill                  |
| `skills/<id>/` and host/documentation files | Complete generated public skills and consumer-specific projections of the authored sources |

To add or move a skill:

1. Create or move `plugin/skills/<skill-id>/` and add a body-only `SKILL.md`
   containing exactly one `<!-- PLUGIN-COMPILER:REQUIRED-SKILLS -->` marker.
2. Add or update the matching `skills` entry in `plugin/plugin.yml`. Reference
   an existing category through `category_id`; categories do not affect paths.
3. Set both `visibility` (`internal` or `public`) and lifecycle `status`
   (`draft`, `active`, `deprecated`, or `archived`).
4. Add compile-time prerequisites as `required_skills` objects. Each edge must
   provide `skill_id`, `reason`, and agent-facing `instructions`.
5. Run `npm run catalog:generate`, then the checks below, and review all
   generated diffs.

Validate the authored catalog and all referenced skill files:

```bash
npm run catalog:validate
```

Regenerate the Claude plugin files, the root README catalog, and the complete
compiler-owned `skills/` directory:

```bash
npm run catalog:generate
```

CI uses the non-mutating drift check:

```bash
npm run catalog:check
```

`required_skills` contains ordered compile-time dependencies within one plugin
release. Every referenced ID must exist, self-dependencies are invalid, and the
graph must remain acyclic. For each public `active` or `deprecated` skill, the
compiler replaces the source marker with the direct dependencies' verbatim
`reason` and `instructions`, then recursively embeds complete dependency trees
under `references/required-skills/<skill-id>/`. The generated skill therefore
has no runtime dependency on a sibling installation.

`visibility` controls separate publication; `status` controls lifecycle. Public
`active` and `deprecated` skills are emitted under `skills/`. Internal, draft,
and archived skills are not emitted as root skills, although eligible internal
or public skills can be embedded as dependencies. Deprecation metadata appears
in the generated public catalog, not generated runtime instructions; archive
metadata remains manifest-only maintenance information.

Generated files are projections for specific consumers, not another authored
catalog or an aggregate source of truth. Edit their source fields in
`plugin/plugin.yml` or `plugin/skills/<id>/SKILL.md` and regenerate instead of
hand-editing a projection.

The compiler architecture, model contracts, data flows, safety rules, and
extension guidance live in
[`tools/plugin-compiler/README.md`](tools/plugin-compiler/README.md).

For a release, change the quoted top-level `version` in `plugin/plugin.yml`,
regenerate, and review the committed projections. `schema_version` identifies
the manifest format and changes only when that contract becomes incompatible.
`package.json.version` belongs to repository tooling and is intentionally
independent. Schema version 2 has no lockfile: the catalog composes same-release
source skills and does not resolve external version ranges, commits, or
integrity hashes.

## Development dependencies

`package.json` cannot contain comments because it is strict JSON. The table
below documents why every direct development dependency exists in this private
repository. Packages used by the compiler at runtime remain development
dependencies because the compiler is repository tooling and is not published as
a standalone package.

| Dependency            | Usage in this project                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `@biomejs/biome`      | Formats, lints, and organizes imports in the plugin compiler, its tests, and the Vitest configuration.            |
| `@types/node`         | Supplies TypeScript declarations for the Node.js APIs used by the compiler and tests.                             |
| `@vitest/coverage-v8` | Collects V8 coverage for compiler source files and enforces the configured coverage thresholds.                   |
| `ajv`                 | Validates `plugin/plugin.yml` data against the plugin manifest JSON Schema using JSON Schema 2020-12.             |
| `markdownlint-cli2`   | Enforces Markdown structure and style rules that are outside Prettier's formatting responsibility.                |
| `prettier`            | Formats authored Markdown plus compiler-generated README content and YAML frontmatter.                            |
| `string-width`        | Measures Unicode display width so generated Markdown catalog tables remain visually aligned.                      |
| `tsx`                 | Executes the TypeScript plugin-compiler CLI directly for catalog validation, generation, and drift checks.        |
| `typescript`          | Runs strict, no-emit static analysis over the compiler, tests, and Vitest configuration.                          |
| `vite`                | Provides the pinned transformation and configuration engine used internally by Vitest.                            |
| `vitest`              | Runs unit and integration tests and provides assertions, mocks, suites, parameterized tests, and lifecycle hooks. |
| `yaml`                | Parses source YAML with location-aware nodes and serializes generated skill frontmatter.                          |

## Markdown quality

Install the pinned development tools:

```bash
npm ci
```

Format all project Markdown, including skill files:

```bash
npm run markdown:format
```

Run the same formatting and lint checks used in continuous integration:

```bash
npm run markdown:check
```

The ignored `local/` directory contains reference material and is intentionally
outside the project-wide formatting scope.
