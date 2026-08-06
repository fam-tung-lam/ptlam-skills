---
schema_version: 1
skill: ptlam-testing
context_id: project-code
updated_at: 2026-08-06
---

# Project code testing context

- Scope: TypeScript production code and tests across the repository.
- Runtime: Node.js 22.6 or newer, ESM package. The visualization skill's
  portable TypeScript tools use Node's native type stripping, introduced in
  Node.js 22.6.
- Package manager: npm with the committed root lockfile.
- Framework: Vitest for tests, lifecycle, spies, and mocks.
- Test root: `tests/`; use `unit-tests/` for one public unit and
  `integration-tests/` for filesystem or collaborator workflows within each
  capability scope.
- Test structure: explicit `GIVEN`, `WHEN`, and `THEN` comments.
- Suite structure: every test is nested in an explicit `describe` suite, even
  when it is the suite's only test.
- Parameterization: use `test.each`, `test.for`, `describe.each`, or
  `describe.for` when cases share one behavior contract and data shape.
- Lifecycle: register temporary-resource cleanup with Vitest hooks;
  `onTestFinished` is the default for resources created by reusable helpers.
- Doubles: keep reusable semantic fakes beside the nearest integration scope;
  use `vi.fn` or `vi.spyOn` for one-off observable interactions.
- Static analysis: `npm run code:typecheck` checks repository TypeScript using
  strict `tsc --noEmit` and the root `tsconfig.json`.
- Lint and format: `npm run code:check` and `npm run code:format` discover all
  repository TypeScript, TSX, schema JSON, and Biome-owned root JSON files.
- Test discovery: `npm test` and `npm run test:coverage` discover
  `tests/**/*.test.ts`.
- Coverage: `npm run test:coverage` measures canonical project TypeScript under
  `plugin/` and `tools/`. It excludes tests, configuration, and
  compiler-generated `skills/` copies because `plugin:check` verifies those
  against the tested `plugin/skills` sources. Global gates are 90% statements,
  lines, and functions and 80% branches.
- Full gate order: run plugin validation and generated-output checks, then
  project typecheck, code and Markdown checks, then coverage as explicit
  commands.
