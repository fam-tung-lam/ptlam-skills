---
schema_version: 1
skill: ptlam-testing
updated_at: 2026-08-05
---

# Testing preferences

For `tools/plugin-compiler/**` and `tests/tools/plugin-compiler/**`:

- Always group tests with an explicit `describe` suite, including a suite with
  one test.
- Prefer Vitest's parameterized APIs when multiple cases exercise the same
  behavior contract.
- Use Vitest hooks for lifecycle setup and cleanup. Use `onTestFinished` for a
  resource created during one test or by a reusable fixture helper.
- Review generated tests for meaningful observable assertions, edge and failure
  cases, excessive mocking, correct Vitest APIs, mock cleanup, concise behavior
  names, and non-watch execution.
