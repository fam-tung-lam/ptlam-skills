---
schema_version: 1
skill: ptlam-testing
decision_id: plugin-compiler-typescript-toolchain
updated_at: 2026-08-05
---

# Plugin compiler TypeScript toolchain

## Decision

Use strict TypeScript with `tsc --noEmit`, `tsx` for the repository-private CLI,
Vitest for the compiler tests and mocks, `@vitest/coverage-v8` for coverage, and
Biome for TypeScript formatting and linting.

Use explicit `describe` suites for all tests, Vitest parameterization for shared
scenario matrices, and Vitest lifecycle hooks for resource cleanup.

Keep Prettier and markdownlint as the owners of Markdown. Do not emit or commit
transpiled JavaScript.

## Rationale

This stack adds static contracts and one TypeScript-native test and quality
workflow while preserving the compiler's direct repository execution model. Tool
ownership does not overlap: `tsc` analyzes types, `tsx` executes the CLI, Vitest
tests behavior, V8 measures coverage, and Biome checks TypeScript style.

## Alternatives not selected

- A committed build output adds artifacts without a repository consumer need.
- Keeping Node's test runner would not satisfy the selected Vitest mocking and
  coverage workflow.
- Giving Biome ownership of Markdown would overlap with the established Prettier
  and markdownlint workflow.
