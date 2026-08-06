---
schema_version: 1
skill: ptlam-testing
decision_id: project-wide-typescript-validation
updated_at: 2026-08-06
---

# Project-wide TypeScript validation

## Decision

Apply the root TypeScript, Biome, Vitest, and CI configuration to all canonical
TypeScript sources. Coverage includes the `plugin/` and `tools/` source roots
and excludes compiler-generated `skills/` copies; plugin verification proves
that generated content matches its tested source. Keep plugin validation as its
own plugin-specific gate.

CI runs on every pull request and every push to `main`, in this order:

1. Plugin verification.
2. Project-wide code quality.
3. Project-wide tests and coverage.

## Rationale

The repository is becoming fully TypeScript. Root-wide type checking, linting,
and test discovery make new project code and tests enter validation
automatically. Coverage names the two canonical source roots so generated
publication copies are not counted as an untested second implementation.
