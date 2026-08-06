---
schema_version: 1
skill: ptlam-testing
canonical_path: skills/ptlam-testing
updated_at: 2026-08-06
---

# Project Testing Context

## Project profile

- Scope: TypeScript production code and tests across the repository, including
  release automation under `.github/scripts/release/`, authored plugin sources
  under `plugin/`, and repository tooling under `tools/`.
- Runtime: Node.js 22.6 or newer in an ESM package. Use npm with the committed
  root lockfile. TypeScript entry points executed directly by Node use erasable
  syntax supported by the strip-only runtime.
- The [development guide](../../../docs/DEVELOPMENT.md) owns authored and
  generated boundaries, test placement, commands, and local quality gates.
- [`package.json`](../../../package.json),
  [`tsconfig.json`](../../../tsconfig.json),
  [`vitest.config.ts`](../../../vitest.config.ts), and
  [`biome.json`](../../../biome.json) own the active runtime, toolchain, test,
  coverage, type-checking, lint, and formatting configuration.
- Revalidate this context when any governing file, CI workflow, supported Node
  version, test root, or quality command changes.

## Project testing contexts

### Repository TypeScript

- Applies to canonical TypeScript under `.github/scripts/release/`, `plugin/`,
  and `tools/`, with tests under `tests/`. Compiler-generated `skills/` copies
  are validated through plugin drift checks rather than counted as a second
  tested implementation.
- Use strict `tsc --noEmit` for static analysis, Vitest for tests, lifecycle,
  spies, and mocks, V8 for coverage, and Biome for TypeScript linting and
  formatting. The root package manifest and lockfile own exact versions.
- Put the production or capability scope before the test level. Use the
  repository names `unit-tests/` and `integration-tests/`, then mirror deeper
  capability folders such as `validation/` or `publication/` when useful. This
  documented repository layout is an explicit project-local override of the
  TypeScript specialization's general source-adjacent placement preference.
- Use explicit `GIVEN`, `WHEN`, and `THEN` comments in every test.
- Keep reusable semantic fakes beside their nearest common test scope. Use
  `vi.fn` or `vi.spyOn` for one-off observable interactions.
- `npm test` runs `tests/**/*.test.ts`; `npm run test:coverage` measures the
  canonical TypeScript roots with global minimums of 90% for statements, lines,
  and functions and 80% for branches.
- Run the full gate sequence in repository order: `npm run plugin:verify`,
  `npm run code:typecheck`, `npm run code:check`, `npm run markdown:check`,
  `npm run test:coverage`, and `git diff --check`.
- CI runs plugin verification, project analysis, then tests and coverage on pull
  requests and pushes to `main`.

## Testing preferences

For TypeScript production code and tests across the repository:

- Group every test in an explicit `describe` suite, including a suite with one
  test.
- Declare cases and modifiers with `it`, such as `it.each`; do not use the
  equivalent `test` alias.
- Prefer Vitest parameterized APIs when multiple cases exercise the same
  behavior contract and data shape.
- Use Vitest hooks for lifecycle setup and cleanup. Prefer `onTestFinished` for
  a resource created during one test or by a reusable fixture helper.
- Review generated tests for meaningful observable assertions, edge and failure
  cases, excessive mocking, correct Vitest APIs, mock cleanup, concise behavior
  names, and non-watch execution.
