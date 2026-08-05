# PRD: Plugin compiler TypeScript migration v1

## Document status

- Status: Approved for implementation
- Date: 2026-08-05
- Product: `ptlam-skills`
- Scope: `tools/plugin-compiler/` and `tests/tools/plugin-compiler/`

## Summary

Migrate the plugin compiler and its automated tests from ESM JavaScript to
strict TypeScript without changing compiler behavior or generated artifacts. The
migration introduces one coherent code-quality stack:

- TypeScript `tsc` performs static analysis with no emitted build artifacts;
- `tsx` executes the repository-private TypeScript CLI directly;
- Vitest runs unit and integration tests and provides mocks, spies, and stubs;
- `@vitest/coverage-v8` measures source coverage with V8; and
- Biome formats and lints TypeScript and the TypeScript tool configuration.

The compiler remains a repository-internal build tool. The skills are still the
product, and the migration does not create a distributable JavaScript package or
a new installation system.

## Problem

The compiler currently relies on `.mjs` modules and JSDoc annotations. Runtime
validation protects the YAML boundary, but module contracts inside the
validator, domain models, composer, generator, checker, CLI, fixtures, and test
doubles are not verified consistently before execution.

This creates avoidable risks:

- broad `object` annotations hide the normalized plugin shape;
- injected collaborators can drift from the methods their consumers require;
- filesystem errors are read as though every caught value were a Node error;
- output-plan entries combine nullable text and binary content without one
  explicit contract;
- refactors depend on manually updating ESM paths and architecture assertions;
- the existing Node test runner has assertions but no shared mocking framework;
  and
- coverage is not measured across every compiler source file.

## Goals

1. Replace every `.mjs` file under the production and test scope with `.ts`.
2. Enable strict static analysis with `tsc --noEmit`.
3. Preserve ESM semantics and the current repository-root CLI behavior.
4. Treat parsed YAML as untrusted until AJV validates it.
5. Give the normalized domain model, output plan, diagnostics, CLI, and injected
   collaborators explicit TypeScript contracts.
6. Migrate unit and integration tests to Vitest.
7. Use Vitest's `vi` API for justified mocks, spies, and stubs while retaining
   real collaborators where integration behavior is the risk.
8. Collect V8 coverage for every TypeScript file under `tools/plugin-compiler/`.
9. Use Biome as the TypeScript linter and formatter.
10. Preserve all existing compiler output, diagnostics, exit codes, safety
    checks, test placement, and generated catalog bytes.
11. Make the full quality gate reproducible locally and in GitHub Actions.

## Non-goals

- Migrating Python skill utilities or inline JavaScript in standalone HTML
  assets
- Converting Markdown or YAML content to TypeScript
- Replacing AJV runtime validation with compile-time types
- Generating TypeScript types for consumers outside this repository
- Publishing the compiler as an npm package
- Committing transpiled JavaScript or a `dist/` directory
- Reorganizing the established unit/integration test hierarchy
- Rewriting compiler behavior or the v2 manifest schema
- Replacing the existing Markdown-specific Prettier and markdownlint checks

## Users and jobs

### Compiler maintainer

The maintainer needs safe refactors, precise contracts, fast feedback, and one
command that rejects formatting, lint, type, test, coverage, or catalog drift.

### Skill author

The skill author needs the existing `catalog:validate`, `catalog:generate`, and
`catalog:check` commands to retain their behavior and diagnostics.

### CI

CI needs deterministic pinned dependencies and separate diagnostics for code
quality, static analysis, catalog drift, and behavioral tests.

## Product decisions

1. TypeScript source files use `.ts`; `.mts` is unnecessary because the root
   package declares ESM semantics.
2. Relative TypeScript imports use explicit `.ts` extensions. `tsx` and Vitest
   execute them directly, while `tsc` performs no emit.
3. `tsc` is the sole static type analyzer and runs with strict checks.
4. `tsx` is only the CLI execution adapter. It does not replace `tsc` and does
   not own testing.
5. Vitest owns test discovery, lifecycle hooks, mocks, spies, and stubs for this
   scope. Existing `node:assert/strict` assertions remain to avoid unrelated
   assertion-style churn.
6. Every test belongs to an explicit `describe` suite, including files with a
   single test. Suite names identify the public function, class, capability, or
   architecture contract under test.
7. Repeated data-driven scenarios use Vitest parameterization such as
   `test.each` so every case is independently named and reported.
8. Unit tests continue to isolate one public function or class. Integration
   tests continue to exercise real filesystem and compiler collaboration.
9. Every test uses explicit Given, When, and Then comments because Vitest has no
   native Given-When-Then API.
10. Existing semantic fakes remain fakes when they model a reusable boundary;
    one-off callbacks and collaborator observations use `vi.fn` or `vi.spyOn`.
11. Vitest restores or clears mocks between tests to prevent shared state.
12. Temporary resources register cleanup with Vitest lifecycle hooks. Reusable
    fixture helpers use `onTestFinished`; manual `try/finally` cleanup is not
    used.
13. V8 coverage includes all `tools/plugin-compiler/**/*.ts` files, including
    files that no test imports.
14. Coverage thresholds are global: 90% lines, 90% statements, 90% functions,
    and 80% branches. The branch threshold captures the migration baseline and
    can only be ratcheted upward as behavior-focused tests are added.
15. Coverage produces terminal, JSON summary, and local HTML reports. Generated
    reports are ignored by Git.
16. Biome owns formatting, linting, and import organization for TypeScript
    source, tests, and TypeScript configuration.
17. Existing Prettier and markdownlint commands remain the owners of Markdown.
18. Dependency versions are exact in `package.json` and `package-lock.json`.
19. Generated catalog outputs must remain byte-for-byte unchanged.

## Technical design

### Execution flow

```text
plugin/plugin.yml and plugin/skills/
              |
              v
        parse as unknown
              |
              v
       AJV runtime validation
              |
              v
 typed immutable Plugin domain model
              |
       +------+-------+
       |              |
       v              v
   generator        checker
       |              |
       +------+-------+
              v
       CLI through tsx
```

TypeScript begins after the trust boundary. AJV remains responsible for proving
that external YAML matches the runtime schema.

### Static-analysis contract

The root `tsconfig.json` includes the compiler, its tests, and Vitest
configuration. It uses Node ESM resolution, explicit Node types, `strict`,
unchecked-index protection, exact optional properties, unused-code detection,
and no emit.

### Testing contract

Vitest discovers `tests/tools/plugin-compiler/**/*.test.ts` in the Node
environment. Test locations retain the existing capability-first layout:

```text
tests/tools/plugin-compiler/
├── unit-tests/
└── integration-tests/
```

Test doubles stay at the nearest common scope. Integration tests use real local
filesystems and clean temporary directories with `onTestFinished`. Explicit
`describe` suites own every test, and repeated scenario tables use `test.each`.

### Quality commands

```text
npm run code:check
npm run typecheck
npm test
npm run test:coverage
npm run catalog:validate
npm run catalog:check
```

`npm run code:format` applies Biome formatting and safe fixes intentionally.

## Migration plan

1. Add exact tool dependencies and configuration.
2. Add TypeScript domain and boundary types.
3. Rename and migrate immutable domain models and pure helpers.
4. Migrate the composer, validator, generator, checker, and CLI.
5. Rename tests, replace Node test imports with Vitest, preserve Given-When-Then
   structure, and type fixtures and doubles.
6. Update package scripts, CI path filters, CI steps, documentation, and
   architecture filename assertions.
7. Format with Biome and resolve every lint and type diagnostic.
8. Run unit and integration tests, then coverage and catalog checks.
9. Run catalog generation and require an empty generated-output diff.

## Acceptance criteria

- No `.mjs` file remains under `tools/plugin-compiler/` or
  `tests/tools/plugin-compiler/`.
- `npm run code:check` passes with no warnings or errors.
- `npm run typecheck` passes with strict TypeScript settings.
- `npm test` passes under Vitest.
- Every test file has an explicit `describe` suite with no top-level tests.
- Temporary filesystem cleanup is registered through Vitest lifecycle hooks.
- `npm run test:coverage` passes all global thresholds.
- `npm run catalog:validate` and `npm run catalog:check` pass.
- A fresh `npm run catalog:generate` leaves generated files unchanged.
- GitHub Actions runs code quality, typechecking, catalog drift, and coverage.
- Runtime validation still rejects malformed external input.
- CLI success messages, diagnostics, and exit codes remain unchanged except
  source filenames shown in usage text change from `.mjs` to `.ts`.

## Risks and mitigations

### Compile-time/runtime trust confusion

TypeScript types could imply YAML is already safe. Keep parser output `unknown`
and narrow it only through the AJV validation function.

### ESM execution differences

Renaming `.mjs` can change module interpretation. Declare the root package as
ESM, use explicit TypeScript import extensions, and retain direct-execution
tests for the CLI.

### Mock-heavy tests

Vitest makes mocking convenient but internal mocks can create false confidence.
Use real collaborators by default and mock only injected boundaries whose
observable interaction is part of the unit contract.

### Coverage gaming

A numeric threshold can encourage incidental assertions. Keep behavior-focused
tests and use coverage to identify unexecuted risk, not as a substitute for test
quality.

### Formatter ownership conflict

Biome and Prettier can disagree when both own one file. Biome owns TypeScript;
Prettier and markdownlint retain Markdown ownership, with non-overlapping
commands.

## Verified tool compatibility

Verified on 2026-08-05 against the project's Node `>=22` runtime:

- [Vitest migration guidance](https://main.vitest.dev/guide/migration) supports
  Node 20 and newer.
- [Vitest describe guidance](https://vitest.dev/api/describe) documents explicit
  suites and suite-scoped lifecycle hooks.
- [Vitest hooks guidance](https://vitest.dev/api/hooks.html) documents
  `onTestFinished` for per-test resources and reusable fixture helpers.
- [Vitest coverage guidance](https://main.vitest.dev/guide/coverage) documents
  the V8 provider and explicit source inclusion.
- [Vitest mocking guidance](https://main.vitest.dev/guide/mocking) documents the
  `vi` API and mock cleanup requirements.
- [Biome configuration](https://biomejs.dev/reference/configuration/) supports
  scoped formatting and linting for TypeScript.
- [TypeScript 7 release guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
  supports `tsc` as the command-line analyzer without requiring the compiler
  API.
