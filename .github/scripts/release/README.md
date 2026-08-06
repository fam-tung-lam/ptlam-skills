# Release automation

This module detects a new plugin version after successful CI, packages promoted
artifacts, and publishes one approved, verified immutable GitHub Release. GitHub
workflow YAML owns only triggers, ordering, permissions, the protected
environment, and artifact hand-offs.

## Commands

GitHub Actions invokes one TypeScript CLI with an imperative command:

| Command              | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `plan-release`       | Detect and pin a new version from successful `main` CI. |
| `package-coverage`   | Package the generated coverage report.                  |
| `package-plugin`     | Package committed installable plugin outputs.           |
| `generate-checksums` | Create `SHA256SUMS` for promoted archives.              |
| `publish-release`    | Create or recover, publish, and verify the release.     |

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
facade results. `validation/` owns manifest version planning, Semantic Version
ordering, CI commit identity, `main` ancestry, and existing tag/release state.
`publication/` owns the complete release-asset plan, archive construction,
checksum generation, approval-protection verification, automated tag creation,
GitHub draft recovery, publication, and post-publication verification.

Only interfaces consumed across production modules are exported. File-local
parsers and command builders stay private and are tested through their owning
public operation.

Action modules use imperative filenames. Files that own a cohesive concept,
facade, seam, or invariant keep noun names. The command-runner seam has two real
adapters: the production process runner and deterministic test doubles.
