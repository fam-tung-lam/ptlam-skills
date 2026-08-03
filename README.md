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

## Installation

Choose one installation route per agent. Installing the Claude Code plugin and
also copying the same skills into Claude Code with the `skills` CLI would expose
duplicates.

### Claude Code

Add this repository as a marketplace, then install its plugin:

```bash
claude plugin marketplace add fam-tung-lam/ptlam-skills
claude plugin install ptlam-skills
```

Or run the equivalent commands inside a Claude Code session:

```text
/plugin marketplace add fam-tung-lam/ptlam-skills
/plugin install ptlam-skills
/reload-plugins
```

Unlike a plugin in Claude Code's official marketplace, this self-hosted plugin
needs the one-time marketplace command first.

Update the installed plugin with Claude Code's plugin manager:

```bash
claude plugin update ptlam-skills
```

Restart Claude Code to apply the update.

### Codex and other agents

Use the standard Agent Skills installer:

```bash
npx skills@latest add fam-tung-lam/ptlam-skills
```

Choose the skills and target agents interactively. For a non-interactive Codex
project install of the whole collection:

```bash
npx skills@latest add fam-tung-lam/ptlam-skills \
  --skill '*' --agent codex --copy --yes
```

The `skills` CLI owns the project installation and its source tracking. Refresh
installations later with:

```bash
npx skills@latest update
```

### Local development

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

Validate or try the Claude Code plugin directly from this checkout:

```bash
claude plugin validate . --strict
claude --plugin-dir .
```
