---
schema_version: 1
skill: ptlam-testing
context_id: plugin-compiler
updated_at: 2026-08-05
---

# Plugin compiler testing context

- Runtime: Node.js 22 or newer, ESM package.
- Package manager: npm with the committed lockfile.
- Framework: Vitest for tests, lifecycle, spies, and mocks.
- Test roots: `unit-tests/` for one public unit and `integration-tests/` for
  filesystem or collaborator workflows.
- Test structure: explicit `GIVEN`, `WHEN`, and `THEN` comments.
- Suite structure: every test is nested in an explicit `describe` suite, even
  when it is the suite's only test.
- Parameterization: use `test.each`, `test.for`, `describe.each`, or
  `describe.for` when cases share one behavior contract and data shape.
- Lifecycle: register temporary-resource cleanup with Vitest hooks;
  `onTestFinished` is the default for resources created by reusable helpers.
- Doubles: keep reusable semantic fakes beside the nearest integration scope;
  use `vi.fn` or `vi.spyOn` for one-off observable interactions.
- Static analysis: `npm run typecheck` using strict `tsc --noEmit`.
- Lint and format: `npm run code:check` and `npm run code:format` using Biome.
- Coverage: `npm run test:coverage` using `@vitest/coverage-v8`; global gates
  are 90% statements, lines, and functions and 80% branches.
- Full local gate: code check, typecheck, coverage, catalog validation/check,
  and Markdown checks.
