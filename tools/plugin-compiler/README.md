# Plugin compiler

The plugin compiler validates the authored v1 catalog in
[`plugin/`](../../plugin/) and produces deterministic, self-contained public
skills and host metadata. It is a repository-internal build tool; skills remain
the product.

The compiler does not install skills, resolve external versions, publish a
release, or maintain installation state. Agent and plugin ecosystems own those
responsibilities.

See the [development guide](../../docs/DEVELOPMENT.md) for setup, authored and
generated file ownership, commands, maintenance workflows, dependencies, and
verification. The [plugin manifest v1 guide](docs/plugin-manifest-v1.md) defines
the authored data contract; its JSON Schema is the machine-readable source of
truth.

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
- Missing and unexpected directories, including empty nested directories,
  produce drift.
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
