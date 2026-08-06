# Development guide

This guide is the canonical development and maintenance workflow for
`ptlam-skills`. For contribution scope, collaboration expectations, and pull
request guidance, see [CONTRIBUTION.md](../CONTRIBUTION.md).

The skills are the product. The repository compiler validates and publishes the
authored catalog for supported agent ecosystems; it is not an installer or a
standalone package.

## Prerequisites

- Git.
- Node.js 22.6.0 or newer.
- npm, using the committed `package-lock.json`.

Install the exact development dependencies from the repository root:

```bash
npm ci
```

Use `npm ci` after switching branches or pulling a lockfile change. Do not
manually edit `node_modules/` or commit it.

## Authored and generated files

```text
plugin/
├── plugin.yml                         # authored catalog
└── skills/
    └── <skill-id>/                    # authored skill
        ├── SKILL.md
        └── {agents,assets,references,scripts}/

.claude-plugin/
├── plugin.json                       # generated host metadata
└── marketplace.json                  # generated host metadata

README.md                              # generated catalog region only
skills/
└── <public-skill-id>/                 # generated public skill
    ├── SKILL.md
    └── references/required-skills/
```

Edit `plugin/plugin.yml` and `plugin/skills/`. The compiler owns the two host
manifests, the marked catalog region in the root README, and the whole root
`skills/` tree. Never edit those generated surfaces manually.

Both authored and generated skill directories are flat. `category_id` is
metadata, not a path segment. The
[plugin manifest v1 guide](../tools/plugin-compiler/docs/plugin-manifest-v1.md)
defines the authored data contract; its JSON Schema is the machine-readable
source of truth.

## Standard development flow

1. Create a focused branch from current `main`.
2. Change the smallest appropriate authored source, test, or documentation
   surface.
3. Run focused tests while developing.
4. If authored catalog data changed, run `npm run plugin:compile`.
5. Review every generated change. Unexpected generated changes are defects to
   investigate, not files to accept automatically.
6. Run the full local quality gates before opening a pull request.
7. Commit only the files that belong to the change.

During normal active development, keep the plugin version unchanged. Version
changes belong to an intentional release preparation.

## Commands

Run all commands from the repository root.

| Command                   | Purpose                                               | Writes |
| ------------------------- | ----------------------------------------------------- | ------ |
| `npm run plugin:validate` | Validate catalog data and authored skill sources      | No     |
| `npm run plugin:compile`  | Validate and replace stale compiler-owned outputs     | Yes    |
| `npm run plugin:check`    | Report generated-output drift                         | No     |
| `npm run plugin:verify`   | Run validation and generated-output drift checks      | No     |
| `npm run code:typecheck`  | Run strict TypeScript analysis without emitting files | No     |
| `npm run code:check`      | Check formatting, lint rules, and imports with Biome  | No     |
| `npm run code:format`     | Apply Biome fixes                                     | Yes    |
| `npm run markdown:check`  | Check Markdown formatting and lint rules              | No     |
| `npm run markdown:format` | Format project Markdown                               | Yes    |
| `npm test`                | Run the Vitest suite once                             | No     |
| `npm run test:coverage`   | Run tests and enforce coverage thresholds             | Yes\*  |
| `npm run test:watch`      | Run Vitest in watch mode                              | No     |

\* `test:coverage` refreshes the ignored local `coverage/` report.

`plugin:compile` invokes the compiler's generate operation and is the only
plugin command that may replace compiler-owned outputs. Check and validate are
read-only.

## Quality gates

Run the same gates used by continuous integration:

```bash
npm run plugin:verify
npm run code:typecheck
npm run code:check
npm run markdown:check
npm run test:coverage
git diff --check
```

Run focused tests first when practical, but do not substitute them for the full
pre-pull-request gates. Test paths put the source scope before the test level,
for example `tests/tools/plugin-compiler/unit-tests/` and
`tests/tools/plugin-compiler/integration-tests/`.

The ignored `local/` directory contains reference material and is intentionally
outside project-wide formatting, linting, and publication.

## Maintainer workflows

### Add or move a skill

1. Create or move `plugin/skills/<skill-id>/`.
2. Add one body-only `SKILL.md` with exactly one required-skills marker.
3. Add or update the matching entry in `plugin/plugin.yml`.
4. Run `npm run plugin:compile` and review every generated change.
5. Run all [quality gates](#quality-gates).

### Change the plugin version

1. Choose the version as part of release preparation.
2. Update the quoted top-level `version` in `plugin/plugin.yml`.
3. Keep `schema_version` unchanged unless the manifest shape becomes
   incompatible.
4. Compile, review, and verify all committed outputs.
5. Follow the [plugin release runbook](RELEASE_PLUGIN_FLOW.md).

The root `package.json` version belongs to repository tooling and does not need
to match the plugin version.

### Evolve the manifest schema

Update the schema, models, validation operations, fixtures, and
[manifest guide](../tools/plugin-compiler/docs/plugin-manifest-v1.md) together.
Never accept an unknown schema version silently.

### Add a generated target

Start with a pure renderer. Add its bytes and directory expectations to the
publication plan so check and generate share one definition of current output.
Add a generic provider seam only after two real providers expose a stable shared
contract.

### Change release automation

Keep workflow YAML focused on triggers, ordering, permissions, and artifact
hand-offs. Put release behavior in the tested TypeScript module documented in
the [release automation architecture](../.github/scripts/release/README.md). Run
the release unit and integration tests as well as the full quality gates.

## Development dependencies

`package.json` is strict JSON and cannot contain comments. This table records
why each direct development dependency exists. Compiler runtime packages remain
development dependencies because the compiler is private repository tooling, not
a published standalone package.

| Dependency                 | Usage in this project                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `@biomejs/biome`           | Formats, lints, and organizes imports in TypeScript source, tests, and configuration.    |
| `@types/node`              | Supplies TypeScript declarations for Node.js APIs used by source and tests.              |
| `@vitest/coverage-v8`      | Collects V8 coverage and enforces configured thresholds.                                 |
| `ajv`                      | Validates `plugin/plugin.yml` against the JSON Schema 2020-12 manifest contract.         |
| `markdownlint-cli2`        | Enforces Markdown structure and style rules outside Prettier's responsibility.           |
| `mdast-util-from-markdown` | Parses Markdown syntax for source inspection and link validation.                        |
| `prettier`                 | Formats authored Markdown, generated README content, and YAML frontmatter.               |
| `string-width`             | Measures Unicode display width for aligned generated Markdown tables.                    |
| `tsx`                      | Executes repository TypeScript command-line tools directly.                              |
| `typescript`               | Runs strict, no-emit static analysis over source, tests, and configuration.              |
| `vite`                     | Provides the pinned transformation and configuration engine used by Vitest.              |
| `vitest`                   | Runs unit and integration tests and supplies their test APIs.                            |
| `yaml`                     | Parses source YAML with location-aware nodes and serializes generated skill frontmatter. |

When adding, removing, or changing a direct dependency, update `package.json`,
`package-lock.json`, and this rationale together.

## Architecture references

- [Plugin compiler](../tools/plugin-compiler/README.md)
- [Plugin manifest v1](../tools/plugin-compiler/docs/plugin-manifest-v1.md)
- [Release automation](../.github/scripts/release/README.md)
- [Plugin release runbook](RELEASE_PLUGIN_FLOW.md)
