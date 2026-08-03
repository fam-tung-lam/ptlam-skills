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

This repository is a fresh start. Its first skills and supported distribution
formats will be added deliberately.
