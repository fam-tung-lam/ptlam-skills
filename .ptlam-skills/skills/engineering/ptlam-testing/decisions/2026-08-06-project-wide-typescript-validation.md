---
schema_version: 1
skill: ptlam-testing
decision_id: project-wide-typescript-validation
updated_at: 2026-08-06
---

# Project-wide TypeScript validation

## Decision

Apply the root TypeScript, Biome, Vitest, and CI configuration to the whole
repository rather than enumerating the current plugin compiler paths. Keep
plugin validation as its own plugin-specific gate.

CI runs on every pull request and every push to `main`, in this order:

1. Plugin verification.
2. Project-wide code quality.
3. Project-wide tests and coverage.

## Rationale

The repository is becoming fully TypeScript. Root-wide discovery makes new
project code and tests enter validation automatically and prevents path lists
from silently drifting as capabilities are added.
