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

<!-- BEGIN GENERATED:PLUGIN-CATALOG:SKILLS -->

## Available skills

| Skill                        | Category     | Purpose                                                                  |
| ---------------------------- | ------------ | ------------------------------------------------------------------------ |
| `ptlam-git`                  | Engineering  | Guide safe, adaptable Git workflows through evidence-first rules.        |
| `ptlam-testing`              | Engineering  | Run universal test workflows with durable project-local profiles.        |
| `ptlam-explain-with-analogy` | Productivity | Teach connected ideas through one visual, interactive real-life analogy. |
| `ptlam-visualization`        | Productivity | Create polished HTML and pinned Mermaid visual artifacts.                |

<!-- END GENERATED:PLUGIN-CATALOG:SKILLS -->

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

## Maintaining the catalog

The root [`plugin.yml`](plugin.yml) is the authored source for the plugin
version, marketplace listing, ordered categories, skill membership, display
summaries, and required-skill IDs. Each `SKILL.md` remains authoritative for
that skill's name, description, and instructions.

| Source               | Owns                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `plugin.yml`         | Plugin/release metadata, marketplace listing, categories, membership, order, summaries, kind, and required skill IDs |
| `SKILL.md`           | Skill name, description, standard metadata, and runtime instructions                                                 |
| `agents/openai.yaml` | OpenAI-specific display and tool dependency metadata for one skill                                                   |
| Generated files      | Host-native and documentation projections of the authored sources                                                    |

To add or move a skill:

1. Create or move `skills/<category>/<skill-id>/` and keep the `SKILL.md` name
   equal to `<skill-id>`.
2. Add or update the matching `skills` entry in `plugin.yml`; its category
   determines the directory path. Add a category record first when needed.
3. Add any hard prerequisites to `required_skill_ids`.
4. Run `npm run catalog:generate`, then the checks below, and review all
   generated diffs.

Validate the authored catalog and all referenced skill files:

```bash
npm run catalog:validate
```

Regenerate the Claude plugin files and the marker-bounded catalog sections in
both README files:

```bash
npm run catalog:generate
```

CI uses the non-mutating drift check:

```bash
npm run catalog:check
```

`required_skill_ids` contains hard prerequisites within the same plugin release.
Every referenced ID must exist, self-dependencies are invalid, and the graph
must remain acyclic. Required-skill IDs do not become Claude plugin
dependencies.

Generated files are projections for specific consumers, not another authored
catalog or an aggregate source of truth. Edit their source fields in
`plugin.yml` or `SKILL.md` and regenerate instead of hand-editing a projection.

The compiler architecture, model contracts, data flows, safety rules, and
extension guidance live in
[`tools/plugin-compiler/README.md`](tools/plugin-compiler/README.md).

For a release, change `plugin.version` in `plugin.yml`, regenerate, and review
the committed projections. `package.json.version` belongs to repository tooling
and is intentionally independent. Version 1 has no `plugin.lock.yml`: the
catalog does not resolve external version ranges, commits, or integrity hashes,
so a lockfile would claim guarantees that do not exist.

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
