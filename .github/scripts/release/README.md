# Release automation

This module validates tag-triggered releases, packages promoted artifacts, and
publishes one verified immutable GitHub Release. GitHub workflow YAML owns only
triggers, ordering, permissions, and artifact hand-offs.

## Commands

GitHub Actions invokes one TypeScript CLI with an imperative command:

| Command              | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `validate-tag`       | Validate version, checkout SHA, and membership in `main`. |
| `package-coverage`   | Package the generated coverage report.                    |
| `package-plugin`     | Package committed installable plugin outputs.             |
| `generate-checksums` | Create `SHA256SUMS` for promoted archives.                |
| `publish-release`    | Create or recover, publish, and verify the release.       |

## Architecture

```text
release-automation-cli.ts
        |
        v
release-automation.ts  (public workflow facade)
        |
        +----> validation/
        |
        +----> publication/
        |
        +----> command-runner.ts
```

`release-automation.ts` is the interface used by callers and tests. The CLI only
validates command options, writes the requested workflow output, and presents
facade results. `validation/` owns release-tag trust. `publication/` owns the
complete release-asset plan, archive construction, checksum generation, GitHub
draft recovery, publication, and post-publication verification.

Only interfaces consumed across production modules are exported. File-local
parsers and command builders stay private and are tested through their owning
public operation.

Action modules use imperative filenames. Files that own a cohesive concept,
facade, seam, or invariant keep noun names. The command-runner seam has two real
adapters: the production process runner and deterministic test doubles.
