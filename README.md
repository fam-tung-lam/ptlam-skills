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

<!-- BEGIN GENERATED:PLUGIN-CATALOG:SKILLS -->

## Available skills

| Skill                           | Category     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Status | Replacement |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| `ptlam-git`                     | Engineering  | Plan, inspect, execute, review, diagnose, or recover Git workflows safely across repositories and collaboration models. Use for status and diffs; staging and commits; branches, worktrees, and refs; fetch, pull, merge, rebase, cherry-pick, revert, and history editing; pushes and deletions; tags; pull or merge request lifecycle work; conflicts, interrupted operations; recovery; and optional project-local Git profiles. Resolve repository policy, authority, custody, targets, and proof before mutation instead of assuming a topology or convention. | Active | —           |
| `ptlam-testing`                 | Engineering  | Design, write, update, run, review, and diagnose automated tests at unit, integration, and end-to-end levels. Use when an agent needs to select a test level, add or repair tests, improve testability, assess test quality, audit test code for compliance, maintain or refresh a project-local testing profile, resolve a project's testing environment, select or recommend compatible test tools, or follow an explicitly requested test-first or Red-Green-Refactor workflow. Do not infer TDD merely from a request for tests or integration testing.         | Active | —           |
| `ptlam-grilling`                | Productivity | Stress-test a plan, decision, or idea through one user-owned decision at a time. Use when the user explicitly asks to be grilled, challenged, or interviewed deeply before action, or wants to expose hidden assumptions, dependencies, contradictions, risks, and trade-offs. Research discoverable facts independently, recommend an answer for every decision, wait after each question, persist a resumable project-local decision record, resume prior grilling sessions when requested, and do not act until shared understanding is confirmed.               | Active | —           |
| `ptlam-explaining-with-analogy`    | Productivity | Explain an unfamiliar, abstract, or complex concept through one coherent real-life analogy, a stable mapping table, a short story, and explicit caveats. Use whenever the user wants to understand a concept, including requests such as explain, what is, how does it work, ELI5, break this down, help me understand, or give me an analogy. Use even when the user does not explicitly request an analogy.                                                                                                                                                       | Active | —           |
| `ptlam-visualization-with-html` | Productivity | Create portable, polished, interactive HTML explainers and learning artifacts with native HTML, CSS, JavaScript, SVG, and one Material 3 Expressive design system. Use when Codex needs to visualize architecture, workflows, state changes, sequences, entity relationships, semantic zoom, real-life analogy twins, or step-by-step system behavior in an HTML file; when a learner should manipulate or observe a diagram rather than read long prose; or when a top-to-bottom visual field guide, simulator, or validation artifact is requested.               | Active | —           |

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

## Development

The [plugin compiler guide](tools/plugin-compiler/README.md) owns the authored
and generated layout, commands, architecture, maintenance workflows, schema
contract, development dependencies, and verification instructions.
