# Contributing to ptlam-skills

Thank you for considering a contribution. This project welcomes focused bug
reports, documentation improvements, skill changes, and improvements to its
compiler or release tooling.

The skills are the product. Installation and updates belong to existing agent
and plugin ecosystems. Proposals for a custom installer, installation-state
engine, or broad host-management layer are outside the current project scope
unless the maintainer explicitly accepts that direction first.

## Before you start

1. Read the [project README](README.md) and
   [development guide](docs/DEVELOPMENT.md).
2. Search existing [issues](https://github.com/fam-tung-lam/ptlam-skills/issues)
   and [pull requests](https://github.com/fam-tung-lam/ptlam-skills/pulls) to
   avoid duplicate work.
3. Open an issue before investing in a substantial new skill, schema change,
   generated target, or architectural change. Small fixes can go directly to a
   pull request.
4. Keep each contribution focused on one problem or cohesive outcome.

Do not include credentials, personal data, proprietary material, or content you
do not have permission to contribute.

## Report a problem

A useful bug report includes:

- the affected skill, command, or documentation path;
- the exact repository revision or released version;
- the agent, host, operating system, and Node.js version when relevant;
- minimal reproduction steps;
- expected and actual behavior; and
- logs or screenshots with secrets and personal data removed.

For a skill proposal, describe the user problem, intended trigger conditions,
why an existing skill does not cover it, and one or two representative requests.

## Make a change

1. Fork the repository if you do not have write access. Collaborators should use
   a short-lived branch in the main repository.
2. Branch from current `main` and use a descriptive branch name.
3. Run `npm ci` from the repository root.
4. Edit authored sources, tests, or documentation. Do not edit generated files
   by hand.
5. Add or update tests for behavior changes.
6. Run focused checks while working, then the complete
   [quality gates](docs/DEVELOPMENT.md#quality-gates).
7. If the authored catalog changed, include the reviewed output from
   `npm run plugin:compile` in the same pull request.

Do not change the plugin version during normal feature or maintenance work. The
maintainer prepares version changes through the documented release flow.

If automation or generative AI helped produce the change, review every line and
artifact yourself. You remain responsible for correctness, licensing, privacy,
tests, and an accurate pull request description.

## Commits and pull requests

Write concise commit titles that state the outcome. Prefer a conventional type
and a meaningful scope when it improves the history, for example:

```text
feat(ptlam-skills): introduce <skill-name> skill to <purpose>
fix(plugin-compiler): reject duplicate authored skill paths
docs: separate contributor and development guidance
```

A pull request should explain:

- the problem and why the change is needed;
- the chosen solution and important trade-offs;
- user-visible or generated-file effects;
- validation performed, including exact commands; and
- related issues, if any.

Before requesting review, confirm that:

- [ ] the change is focused and contains no unrelated files;
- [ ] authored and generated files are in sync;
- [ ] tests cover changed behavior;
- [ ] all local quality gates pass;
- [ ] documentation and examples match the implemented behavior; and
- [ ] the pull request contains no secrets or private data.

Draft pull requests are welcome for early, concrete feedback. A contribution may
need revision and is not guaranteed to be merged. The maintainer may close work
that conflicts with project scope, duplicates another solution, or cannot be
maintained safely.

## Review and licensing

Be respectful, specific, and patient in issues and reviews. Resolve feedback
with code, tests, or documented reasoning; do not mark review threads resolved
until the concern is addressed or the reviewer agrees with the outcome.

By contributing, you agree that your contribution is provided under the
project's [MIT License](LICENSE).
