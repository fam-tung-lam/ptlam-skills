# Epic: Deliver `ptlam-explain-with-analogy` v1

## Status

- Status: Implemented and validated
- Date: 2026-08-04
- PRD: [Product requirements](../prds/ptlam-explain-with-analogy-v1-prd.md)
- Target branch: `codex/ptlam-explain-with-analogy`

## Outcome

Introduce a portable productivity skill that teaches unfamiliar topics through
one coherent real-life analogy, progressive visual scenes, and meaningful
interaction while remaining independent of any built-in visualization engine.

The finished change is delivered as one reviewed GitHub pull request with a
small skill package, deterministic catalog integration, executable contract
tests, and forward-validation evidence.

## Scope

- Add `ptlam-explain-with-analogy/SKILL.md` and OpenAI UI metadata.
- Encode literal-first modeling, one stable analogy world, combined learning
  mechanisms, progressive scenes, interaction, boundaries, and literal recap.
- Prefer an available visualizer such as `$ptlam-visualization` without a hard
  dependency.
- Provide a complete host-native fallback.
- Register the skill once in the plugin catalog and generated manifests.
- Add focused contract and integration checks.
- Run repository validation and isolated forward tests.

## Out of scope

- A visualization engine, renderer, runtime, script, asset bundle, or installer
- A required dependency on `ptlam-visualization`
- Hosting, sharing, or persistent learning sessions
- A metaphor library or topic-specific curriculum

## Issues

1. [ISSUE-001: Implement the analogy reasoning contract](../issues/ptlam-explain-with-analogy/001-analogy-reasoning-contract.md)
2. [ISSUE-002: Route progressive visual learning without an engine](../issues/ptlam-explain-with-analogy/002-progressive-visual-routing.md)
3. [ISSUE-003: Register the skill in portable catalogs](../issues/ptlam-explain-with-analogy/003-catalog-registration.md)
4. [ISSUE-004: Verify contract behavior and fallback paths](../issues/ptlam-explain-with-analogy/004-contract-and-forward-validation.md)

## Dependency graph

```text
ISSUE-001 ─┐
           ├── ISSUE-004 ── final integration ── PR
ISSUE-002 ─┘

ISSUE-003 ────────────────── final integration ── PR
```

ISSUE-001 and ISSUE-002 share `SKILL.md` ownership and are implemented by one
agent to avoid conflicting edits. ISSUE-003 and the executable portion of
ISSUE-004 use separate files and may proceed in parallel.

## Parallel delivery plan

### Workstream A: Skill contract

Owns:

- `skills/productivity/ptlam-explain-with-analogy/SKILL.md`
- `skills/productivity/ptlam-explain-with-analogy/agents/openai.yaml`

Implements ISSUE-001 and ISSUE-002.

### Workstream B: Contract tests

Owns:

- `tests/skills/productivity/ptlam-explain-with-analogy/**`

Implements executable checks from ISSUE-004 against the PRD, independently of
the skill author's wording choices.

### Workstream C: Catalog integration

Owns:

- `plugin.yml`
- generated catalog and plugin projections
- any existing repository integration matcher that must become table-width safe

Implements ISSUE-003.

### Coordinating agent

Owns planning documents, integration, conflict prevention, full validation,
forward tests, final diff review, commit, push, and pull request creation.

## Definition of done

- All four issues meet their acceptance criteria.
- The package contains no visualization engine or hard dependency.
- Catalog projections are current and register the skill once.
- Structural, Markdown, catalog, targeted, and full repository checks pass.
- Independent forward tests cover a compatible-visualizer path and a fallback
  path without leaked expected output.
- The branch contains only intended changes.
- One intentional feature commit is pushed.
- A draft pull request targets the current default branch and names the skill
  and purpose.
