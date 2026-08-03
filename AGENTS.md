# PTLam Skills agent guide

## Start with the original goal

The original goal is a collection of skills similar to `local/skills`.
Preserve that product boundary in every design and implementation decision.

Before adding collection structure, packaging, or distribution behavior,
inspect the local reference when it is available and adapt only the patterns
that fit this project.

## Scope guardrails

- Treat skill payloads and their documentation as the product.
- Keep validation, release, and repository scripts small and focused on the
  collection.
- Delegate installation and updates to established agent/plugin mechanisms.
- Do not introduce a custom installer CLI, transaction engine, installation
  state, recovery protocol, target-profile registry, or host filesystem engine
  without an explicit product decision from the owner.
- A scope expansion must be discussed before implementation.

## Skill layout

Store each skill under `skills/<category>/<skill-name>/` with `SKILL.md` as its
entrypoint. Keep supporting references, scripts, examples, and templates local
to that skill unless they are genuinely shared collection infrastructure.

## Distribution invariants

- Every installable skill must be listed in `.claude-plugin/plugin.json`'s
  `skills` array. Explicit paths preserve the category layout while keeping the
  shipped set intentional.
- Keep `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
  valid with `claude plugin validate . --strict`.
- Bump the plugin manifest version when releasing plugin changes.
- Keep `npx skills@latest add fam-tung-lam/ptlam-skills` as the portable path
  for Codex and other Agent Skills-compatible hosts.
- Do not add repository-owned installation or update state.
