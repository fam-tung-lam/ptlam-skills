# Plugin compiler

The plugin compiler validates the authored v1 catalog in
[`plugin/`](../../plugin/) and produces deterministic, self-contained public
skills and host metadata. It is a repository-internal build tool; skills remain
the product.

The compiler does not install skills, resolve external versions, publish a
release, or maintain installation state. Agent and plugin ecosystems own those
responsibilities.

## Commands

Run commands from the repository root:

| Command                   | Purpose                                                  | Writes |
| ------------------------- | -------------------------------------------------------- | ------ |
| `npm run plugin:validate` | Validate the manifest, graph, and authored skill sources | No     |
| `npm run plugin:compile`  | Validate and replace stale compiler-owned outputs        | Yes    |
| `npm run plugin:check`    | Validate and report generated-output drift               | No     |

`generate` is the only command that may replace compiler-owned outputs. Run it
after changing authored catalog data, then review and commit the generated diff.

See the [plugin manifest v1 guide](docs/plugin-manifest-v1.md) for the authored
data contract. The JSON Schema is the machine-readable source of truth.

## Authored and generated layout

```text
plugin/
├── plugin.yml
└── skills/
    └── <skill-id>/
        ├── SKILL.md
        └── {agents,assets,references,scripts}/

.claude-plugin/
├── plugin.json
└── marketplace.json

README.md                              # compiler-owned catalog region
skills/
└── <public-skill-id>/
    ├── SKILL.md
    └── references/required-skills/
```

`plugin/plugin.yml` and `plugin/skills/` are authored sources. The compiler owns
the host manifests, the marked catalog region in the root `README.md`, and the
whole root `skills/` tree. Do not edit those generated surfaces manually.

Both authored and generated skill directories are flat. `category_id` is
metadata, not a path segment.

## Architecture

```text
plugin-compiler-cli.ts
        |
        v
plugin-compiler.ts  (public workflow facade)
        |
        +----> validation/ ----> models/
        |
        +----> publication/ ---> models/
```

```text
tools/plugin-compiler/
├── plugin-compiler.ts
├── plugin-compiler-cli.ts
├── models/
│   ├── category.ts
│   ├── plugin.ts
│   └── skill.ts
├── validation/
│   ├── validate-plugin.ts
│   ├── validate-plugin-manifest.ts
│   ├── validate-skill-graph.ts
│   ├── validate-skill-sources.ts
│   ├── validate-markdown-links.ts
│   ├── plugin-validation-error.ts
│   └── schemas/plugin-manifest-v1.schema.json
└── publication/
    ├── plugin-publication.ts
    ├── publication-plan.ts
    ├── compare-publications.ts
    ├── publication-filesystem.ts
    ├── compose-published-skills.ts
    ├── select-published-skills.ts
    ├── render-claude-plugin.ts
    └── render-plugin-readme.ts
```

The facade exposes three workflows:

- `validatePlugin` returns one immutable validated source snapshot and warnings;
- `checkPlugin` compares one expected publication with current outputs;
- `generatePlugin` compares that same expectation and safely commits changes.

`validation/` owns manifest parsing, graph rules, source inspection, and
Markdown-link rules. `publication/` owns skill selection and composition,
rendering, publication comparison, and filesystem mutation. `models/` owns the
shared immutable contracts and required-skills marker.

Action modules use imperative filenames (`validate-*`, `compose-*`, and
`render-*`). Files that own a cohesive concept, facade, or invariant keep noun
names. Capability-local request and result interfaces stay beside their
operation; there are no nested `validation/models/` or `publication/models/`
folders.

The CLI only validates commands and presents facade results. Compiler failures
become failure exit codes; exceptions from injected output adapters propagate to
their caller.

## Guarantees

### Validation

- YAML is parsed strictly and checked against the closed v1 schema.
- IDs, categories, dependencies, lifecycle transitions, replacements, cycles,
  and public reachability are checked before a snapshot is returned.
- Authored skill paths are one-to-one with manifest skills; path escapes,
  symlinks, unsupported file kinds, and the compiler-reserved resource namespace
  are rejected.
- Markdown links are discovered through a Markdown syntax tree, so examples in
  code, escaped syntax, and comments are not treated as real links.
- Each source file is read once and captured in an immutable snapshot.

### Publication

- Check and generate use the same expected bytes and explicit directory set.
- Missing directories differ from existing empty directories.
- Expected content is normalized to bytes once and ordered with a
  locale-independent comparator.
- Standalone files use temporary siblings and atomic replacement.
- The generated `skills/` tree is staged, verified, backed up, and swapped as
  one recoverable managed tree.
- Check is read-only. A validation or planning failure happens before the first
  write.

The complete multi-output publication is not a cross-file transaction. If a
later operating-system operation fails after an earlier standalone output was
replaced, rerun generation after resolving the filesystem error.

## Result contracts

| Operation        | Result                                               |
| ---------------- | ---------------------------------------------------- |
| `validatePlugin` | `{ plugin, warnings }`                               |
| `checkPlugin`    | `{ plugin, warnings, isCurrent, drift }`             |
| `generatePlugin` | `{ plugin, warnings, changedPaths, unchangedPaths }` |

Returned result objects and their array values are frozen at runtime. Validation
failures throw `PluginValidationError`, whose `errors` array contains the
deduplicated source violations.

## Maintainer workflows

### Add or move a skill

1. Create or move `plugin/skills/<skill-id>/`.
2. Add one body-only `SKILL.md` with exactly one required-skills marker.
3. Add or update the matching entry in `plugin/plugin.yml`.
4. Run `npm run plugin:compile` and review every generated change.
5. Run `npm run plugin:validate`, `npm run plugin:check`,
   `npm run code:typecheck`, `npm run code:check`, `npm run markdown:check`, and
   `npm run test:coverage`, in that order.

### Change the plugin version

1. Update the quoted top-level `version` in `plugin/plugin.yml`.
2. Keep `schema_version` unchanged unless the manifest shape becomes
   incompatible.
3. Generate, review, and verify all committed outputs before release.

### Evolve the schema

Update `validation/schemas/plugin-manifest-v1.schema.json`, the models,
validation operations, fixtures, and
[manifest guide](docs/plugin-manifest-v1.md) together. Never accept an unknown
schema version silently.

### Add a generated target

Start with a pure renderer. Add its bytes and directory expectations to the
publication plan so check and generate continue to share one definition of
current output. Add a generic provider seam only after two real providers expose
a stable shared contract.

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
| `tsx`                 | Executes the TypeScript plugin-compiler CLI directly for plugin validation, generation, and drift checks.         |
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
