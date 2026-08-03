# PTLam Skills

PTLam Skills is a curated collection of portable agent skills.

The project is intentionally similar in scope to the local `skills` reference:
it authors, documents, validates, and distributes skills while delegating
installation and updates to existing agent and plugin ecosystems.

## Product boundary

- Skills are the product.
- Keep repository tooling small and collection-focused.
- Prefer established installers and native plugin managers.
- Do not build a custom transactional installer, package manager, target
  registry, or installation-state engine without a separate explicit product
  decision.

## Layout

Skills live at:

```text
skills/<category>/<skill-name>/SKILL.md
```

## Initial test collection

| Category | Skill | Purpose |
| --- | --- | --- |
| Engineering | `test-review-change` | Review a small change and return risks, checks, and a verdict. |
| Productivity | `test-plan-task` | Turn one goal into a 3–5 step actionable plan. |
| Utilities | `test-format-text` | Reformat text without adding or changing facts. |

These skills are intentionally simple. They prove collection discovery,
installation, metadata, and invocation before real skills are introduced.

## Install locally

List the available skills:

```bash
DISABLE_TELEMETRY=1 npx skills@latest add /absolute/path/to/ptlam-skills --list
```

From a target project, install all three for Codex:

```bash
DISABLE_TELEMETRY=1 npx skills@latest add /absolute/path/to/ptlam-skills \
  --skill '*' --agent codex --copy --yes
```

Install one skill by replacing `'*'` with its name. The external `skills` CLI
owns discovery and installation; this repository does not implement an
installer.
