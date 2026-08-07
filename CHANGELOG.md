# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html). Versions refer to
the plugin version in `plugin/plugin.yml` and its matching `v<version>` release
tag, not the private tooling version in `package.json`.

<!-- markdownlint-disable MD024 -->

## [Unreleased]

### Added

- Added authored acknowledgements for the external Vitest API references and the
  inspiration behind `ptlam-grilling`.

### Changed

- Refined `ptlam-grilling` with explicit interactive invocation, one predictable
  workspace-local session record, checkable workflow completion, and a confirmed
  shared-understanding gate before action.
- Refined `ptlam-creating-atomic-note` with explicit operation outcomes, safe
  merge-file handling, syntax-neutral connection fallbacks, and conditional
  note-shape guidance.
- Refined `ptlam-visualization-with-html` with explicit completion criteria,
  direct reference routing, conditional analogy ownership, one canonical
  scaffold baseline, responsive overflow guidance, and classic/module script
  validation.
- Changed `ptlam-explaining-with-analogy` to auto-select a fully validated
  analogy, revalidate deeper follow-ups, preserve explicit learner choices, and
  separate explanation semantics from rendering.

## [0.1.0-alpha.2] - 2026-08-07

_Pre-release._

### Added

- Added `ptlam-testing-typescript`, a testing skill for framework-free,
  browser-free TypeScript projects using Vite, Vitest, and V8 coverage.
- Added contribution, development, and plugin-release guides.

### Changed

- Changed `ptlam-git` and `ptlam-testing` to maintain durable project knowledge
  in one project-local `CONTEXT.md` file per skill.
- Changed release promotion to detect a new plugin version after successful
  `main` CI and create the approved tag and immutable GitHub Release
  automatically.

### Fixed

- Hardened plugin publication checks to reject unexpected directories and
  invalid external HTTPS links.

## [0.1.0-alpha.1] - 2026-08-06

_Pre-release._

### Added

- Published the first prerelease of the plugin with seven portable skills:
  `ptlam-git`, `ptlam-testing`, `ptlam-creating-skill`, `ptlam-grilling`,
  `ptlam-creating-atomic-note`, `ptlam-explaining-with-analogy`, and
  `ptlam-visualization-with-html`.
- Added compiled Claude Code plugin metadata and standalone public skill output
  for other Agent Skills-compatible ecosystems.

[unreleased]:
  https://github.com/fam-tung-lam/ptlam-skills/compare/v0.1.0-alpha.2...HEAD
[0.1.0-alpha.2]:
  https://github.com/fam-tung-lam/ptlam-skills/compare/v0.1.0-alpha.1...v0.1.0-alpha.2
[0.1.0-alpha.1]:
  https://github.com/fam-tung-lam/ptlam-skills/releases/tag/v0.1.0-alpha.1
