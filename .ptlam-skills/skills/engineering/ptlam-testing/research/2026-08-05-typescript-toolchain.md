---
schema_version: 1
skill: ptlam-testing
research_id: typescript-toolchain
verified_at: 2026-08-05
---

# TypeScript toolchain compatibility

Verified exact development dependencies in `package.json` and
`package-lock.json`:

- TypeScript 7.0.2
- Vitest and `@vitest/coverage-v8` 4.1.10
- Biome 2.5.7
- `tsx` 4.23.7
- Vite 6.4.3, selected because the project supports Node 22 from its initial
  release rather than requiring a newer Node 22 minor
- Node types 22.20.1, aligned with the CI runtime line

Primary references:

- [Vitest migration guidance](https://main.vitest.dev/guide/migration)
- [Vitest describe guidance](https://vitest.dev/api/describe)
- [Vitest hooks guidance](https://vitest.dev/api/hooks.html)
- [Vitest coverage guidance](https://main.vitest.dev/guide/coverage)
- [Vitest mocking guidance](https://main.vitest.dev/guide/mocking)
- [Biome configuration](https://biomejs.dev/reference/configuration/)
- [TypeScript 7 release guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

Refresh this snapshot when Node support, package versions, or the compiler
execution model changes.
