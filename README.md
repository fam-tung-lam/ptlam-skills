# Pham Tung Lam's Agent Skill Catalog

This repository is the personal catalog of agent skills used and maintained by
[Pham Tung Lam](https://github.com/fam-tung-lam).

It provides one centralized place to manage:

- Available skills.
- Skill organization and categories.
- Published catalog versions.
- Additions, updates, and retirements over time.

Keeping this state in one version-controlled repository makes changes visible
and repeatable across the agents and projects that Lam uses.

## Layout

Skills live at:

```text
skills/<category>/<skill-name>/SKILL.md
```

## Current test collection

| Skill                | Category     | Purpose                                                        |
| -------------------- | ------------ | -------------------------------------------------------------- |
| `test-review-change` | Engineering  | Review a small change and return risks, checks, and a verdict. |
| `test-plan-task`     | Productivity | Turn one goal into a 3–5 step actionable plan.                 |
| `test-format-text`   | Utilities    | Reformat text without adding or changing facts.                |

These skills are intentionally simple. They prove collection discovery,
installation, metadata, and invocation before real skills are introduced.

## Using the catalog

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
claude plugin update ptlam-skills@ptlam
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

## Markdown quality

Install the pinned development tools:

```bash
npm ci
```

Format all project Markdown, including skill files:

```bash
npm run markdown:format
```

Run the same formatting and lint checks used in continuous integration:

```bash
npm run markdown:check
```

The ignored `local/` directory contains reference material and is intentionally
outside the project-wide formatting scope.
