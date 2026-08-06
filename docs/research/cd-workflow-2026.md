# Tag-triggered CD workflow research (2026)

- Research date: 2026-08-06
- Repository: `fam-tung-lam/ptlam-skills`
- Scope: research, recommendation, and the implemented workflow contract.

## Executive recommendation

The proposed gates are sound, but a trustworthy release needs a tag-integrity
gate before them and publication-integrity controls after them:

```text
tag gate -> plugin verification -> code quality -> tests + coverage archive
                                                     |
                                                     v
                                               plugin package
                                                     |
                                                     v
                                         provenance + checksums
                                                     |
                                                     v
                                     release -> assets -> verify
```

Plugin verification and code analysis are independent read-only checks, but the
implemented graph keeps the requested stage order explicit. This costs one job
startup compared with parallel checks and makes each failed gate's position in
the release sequence unambiguous.

The implementation keeps `ci.yml` and `cd.yml` as orchestration callers. Shared
capabilities live in imperative `_reusable-*.yml` workflows; Node setup lives in
local composite actions; release logic lives in tested TypeScript under
`.github/scripts/`.

The explicit release assets should be:

- an installable plugin archive from the exact triggering commit;
- a coverage archive containing Vitest HTML and JSON summary reports;
- optionally, `SHA256SUMS` for convenient offline verification.

GitHub already adds `Source code (zip)` and `Source code (tar.gz)` links for the
release tag. Do not upload duplicate source code unless stable outer archive
bytes are an explicit requirement. GitHub guarantees stable extracted contents
while the tag stays on the same commit, but compression can change. See
[About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
and
[source archive stability](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives#stability-of-source-code-archives).

Do not enable automatic publication until the repository-setting prerequisites
below are complete.

## Repository snapshot before implementation

The repository already has good release inputs:

- `.github/workflows/ci.yml` runs plugin validation/drift detection, type and
  code checks, Markdown checks, and Vitest coverage;
- `.github/actions/set-up-node/action.yml` uses `npm ci`, caches from
  `package-lock.json`, and pins `actions/setup-node` by full commit SHA;
- CI pins `actions/checkout` by full commit SHA and uses
  `persist-credentials: false`;
- `vitest.config.ts` emits text, JSON summary, and HTML coverage, with minimums
  of 90% for statements, lines, and functions and 80% for branches;
- `plugin/plugin.yml` is the plugin-version source of truth and currently says
  `0.1.0`;
- `npm run plugin:check` proves the committed `.claude-plugin/`, `skills/`, and
  generated README content match authored sources.

Read-only GitHub checks on 2026-08-06 found:

| State                      | Current value | Release implication                                          |
| -------------------------- | ------------- | ------------------------------------------------------------ |
| Visibility                 | Public        | Artifact attestations are available.                         |
| Releases and tags          | None          | Establish `v<manifest-version>` as the contract.             |
| Immutable releases         | Disabled      | Tags and assets are not protected after publication.         |
| Repository rulesets        | None          | No protected `v*` creation/update/deletion policy exists.    |
| `main` protection          | None          | A tag cannot be assumed to point to reviewed history.        |
| Default Actions token      | Read          | Good baseline; publication still needs explicit write scope. |
| Required action SHA policy | Disabled      | Full-SHA pinning is conventional, not enforced.              |

The immutable-release check uses the endpoint documented in
[REST API endpoints for repositories](https://docs.github.com/en/rest/repos/repos?apiVersion=2026-03-10#check-if-immutable-releases-are-enabled-for-a-repository).
Rulesets are described in
[About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets).

## Required repository settings before first release

### Enable immutable releases

After an immutable release is published, GitHub locks its tag and assets and
automatically creates a release attestation covering the tag, commit SHA, and
assets. GitHub recommends draft, attach all assets, then publish. This setting
applies only to future releases, so enable it before the first one. See
[Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
and
[Preventing release changes](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes).

### Add a tag ruleset for `v*`

An `on.push.tags` workflow reacts to tag ref updates, not only creation. Require
a genuinely new, non-deleted, non-forced tag, and prevent unauthorized tag
creation, update, and deletion. See the
[push webhook payload](https://docs.github.com/en/webhooks/webhook-events-and-payloads#push)
and
[available ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

At minimum, target `v*`, restrict creation to the release authority, restrict
updates and deletions, and keep bypass access narrow. GitHub does not create tag
push events when more than three tags are pushed at once, so push one release
tag at a time. See
[Events that trigger workflows: push](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#push).

### Protect the tagged history

Use a `main` ruleset with required CI, or otherwise restrict tag creation to a
trusted release authority. CD should still prove that the tagged commit is an
ancestor of `origin/main`. This catches accidental tags on feature or detached
history.

Repository policy matters because GitHub loads a push-triggered workflow from
the commit/ref associated with the event. A check inside `cd.yml` cannot itself
establish trust in a workflow taken from an untrusted tag. See
[Workflows](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflows).

### Decide whether publication needs approval

For a single-maintainer repository, pushing a protected tag is already an
explicit publication decision, so another click is optional. If separation of
duties is needed, put only the final job behind a preconfigured `release`
environment with selected `v*` tags, reviewers, and appropriate bypass rules.
Naming an environment in YAML does not configure approval; this repository has
no release environment today. See
[Deployments and environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).

## Assessment of the proposed stages

| Stage                      | Verdict               | Required detail                                                             |
| -------------------------- | --------------------- | --------------------------------------------------------------------------- |
| Trigger on new tag         | Keep with guardrails  | Filter `v*`; require created, not deleted, and not forced.                  |
| Plugin verification        | Keep                  | Run `plugin:validate` and `plugin:check` on the exact tag commit.           |
| Code quality               | Keep                  | Reuse CI type, Biome, and Markdown checks without tool drift.               |
| Tests with coverage        | Keep                  | Keep thresholds; archive `coverage/` after success.                         |
| Coverage workflow artifact | Keep                  | Pre-pack one file, fail if absent, and pass artifact ID/digest.             |
| Build plugin               | Clarify               | Package committed installable outputs from `github.sha`; do not regenerate. |
| Create Release             | Keep, transact safely | Draft, upload all assets, publish once, then verify.                        |
| Release contains source    | Already automatic     | No duplicate source ZIP/tar unless byte stability is required.              |
| Release pinned to tag      | Verify explicitly     | `target_commitish` is ignored if the tag already exists.                    |

## Tag and commit integrity contract

1. Trigger with `push.tags: ["v*"]`.
2. Require `created == true`, `deleted == false`, and `forced == false`.
3. Require `github.ref_type == "tag"`.
4. Require the tag to equal `v` plus the validated top-level `plugin/plugin.yml`
   version. The current valid first tag is `v0.1.0`.
5. Peel annotated tags and require the tag commit to equal `github.sha`.
6. Require the commit to be reachable from `origin/main`.
7. Check out the full `github.sha` in every job, never a moving branch.
8. Re-resolve the remote tag immediately before publication.

GitHub defines `github.ref_name` as the short tag name and `github.sha` as the
tip commit pushed to the ref. See the
[variables reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
and
[events reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#push).

Do not rely on `--target "$GITHUB_SHA"` to pin an existing tag. The Releases API
says `target_commitish` is unused when the tag exists. Use the event tag and
`gh release create "$TAG_NAME" --verify-tag` after independently checking its
peeled SHA. See
[Create a release](https://docs.github.com/en/rest/releases/releases?apiVersion=2026-03-10#create-a-release)
and [`gh release create`](https://cli.github.com/manual/gh_release_create).

Pass tag/ref values through `env`; do not interpolate contexts directly into a
`run` script. This avoids script injection from crafted ref names. See the
[secure use reference](https://docs.github.com/en/actions/reference/security/secure-use#understanding-the-risk-of-script-injections).

## Recommended jobs and permissions

| Job                  | Needs         | Runs repository dependencies? | Permissions                                                   | Output                      |
| -------------------- | ------------- | ----------------------------- | ------------------------------------------------------------- | --------------------------- |
| `verify_release_tag` | —             | No                            | `contents: read`                                              | trusted tag, version, SHA   |
| `verify_plugin`      | tag check     | Yes                           | `contents: read`                                              | gate result                 |
| `analyze_code`       | plugin check  | Yes                           | `contents: read`                                              | gate result                 |
| `test_code`          | code analysis | Yes                           | `contents: read`                                              | coverage artifact ID/digest |
| `build_plugin`       | tests         | No package script needed      | `contents: read`                                              | plugin artifact ID/digest   |
| `attest`             | tests, build  | No                            | `actions: read`, `contents: read`, OIDC and attestation write | provenance                  |
| `release`            | attest        | No                            | `actions: read`, `contents: write`                            | immutable Release           |

At workflow level, declare only `contents: read`; unspecified permissions become
`none`. Grant write permission only where needed. See
[workflow permissions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions).

The isolated `attest` job downloads already-produced files and gains OIDC and
attestation permissions only after repository code and dependencies finish.
`actions/attest` can establish build provenance for the plugin and coverage
archives. See
[Using artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
and [`actions/attest`](https://github.com/actions/attest).

Immutable releases also generate a release attestation. Build provenance says
which workflow produced the files; release attestation binds the final tag,
commit, and assets. If v1 must be smaller, immutable releases are the minimum;
the isolated build attestation is recommended defense in depth.

## Artifact contract

### Coverage

After `npm run test:coverage` succeeds:

1. create one archive such as `ptlam-skills-v0.1.0-coverage.tar.gz`;
2. upload it with a tag/SHA-specific artifact name;
3. set `if-no-files-found: error`;
4. retain it for 14 days, because the release asset is the durable copy;
5. expose `artifact-id` and `artifact-digest` as outputs;
6. download by artifact ID in downstream privileged jobs.

GitHub supports coverage artifacts and per-artifact retention, returns a SHA-256
digest on upload, and validates the digest on download. See
[Store and share workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data#validating-artifacts)
and
[Workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts).

Current `actions/upload-artifact` v7 and `actions/download-artifact` v8 can
carry one pre-packed file with `archive: false`, preserving the exact bytes that
later become a release asset; download v8 defaults digest mismatches to an
error. See [`upload-artifact`](https://github.com/actions/upload-artifact) and
[`download-artifact`](https://github.com/actions/download-artifact).

### Plugin package

Build the installable archive directly from the triggering commit with
`git archive`, including at least:

```text
.claude-plugin/
skills/
README.md
LICENSE
```

Target the full commit SHA rather than copying the mutable runner worktree. This
excludes `node_modules/`, coverage, repository tooling, and runner-created
files. Use a filename such as `ptlam-skills-v0.1.0.tar.gz`.

Do not run `plugin:compile` and package new bytes in CD. If the tag has
generated drift, `plugin:check` must fail; fix it in a new commit and tag.

### Checksums

An optional `SHA256SUMS` should cover the plugin and coverage assets, not
GitHub's on-demand source archives. GitHub says those source downloads cannot be
checked with `gh release verify-asset` because they are generated on request.
See
[Verifying release integrity](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/verify-release-integrity).

## Safe publication and reruns

Release creation has no idempotency key and is not an upsert. Query by tag
before acting. See
[Get a release by tag name](https://docs.github.com/en/rest/releases/releases?apiVersion=2026-03-10#get-a-release-by-tag-name).

| Existing state      | Rerun behavior                                                                         |
| ------------------- | -------------------------------------------------------------------------------------- |
| No release          | Create draft with `--verify-tag`, upload assets, publish.                              |
| Draft               | Recheck tag SHA; add only missing assets; accept matching digests; fail on mismatches. |
| Published immutable | Verify release/assets; no-op success only when all match.                              |
| Published mutable   | Fail for manual review; never overwrite it automatically.                              |

Avoid `gh release upload --clobber`: it deletes the previous asset before
uploading, so failure can leave no asset. See
[`gh release upload`](https://cli.github.com/manual/gh_release_upload).

Immediately before publishing, recheck tag SHA, expected assets, and digests.
After publishing, require `isImmutable == true`, run
`gh release verify "$TAG_NAME"`, and run `gh release verify-asset` for every
explicit asset. See
[`gh release verify`](https://cli.github.com/manual/gh_release_verify).

## Concurrency and cancellation

Never cancel an in-progress publication. Use at least:

```yaml
concurrency:
  group: cd-${{ github.ref }}
  cancel-in-progress: false
```

This blocks duplicate runs for one tag while allowing other tags to validate. If
all publications must serialize, put a global concurrency group on the final
release job and preserve its pending queue. See
[Control workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

CI may cancel stale branch/PR runs because they are replaceable. CD must not
copy that policy: cancellation between draft creation and publication leaves a
partial release.

## Action and runtime integrity

GitHub states that a full commit SHA is the only immutable action reference. Pin
every external action to 40 hexadecimal characters, keep a version comment, and
consider enforcing the repository SHA policy. See
[Secure use](https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions)
and
[Actions repository settings](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository).

Official release pins observed on 2026-08-06 are time-sensitive:

| Action                      | Release | Full commit SHA                            |
| --------------------------- | ------- | ------------------------------------------ |
| `actions/upload-artifact`   | v7.0.1  | `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` |
| `actions/download-artifact` | v8.0.1  | `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` |
| `actions/attest`            | v4.2.2  | `1e69f48acb82d1966a394da916b4c1698aa569d6` |

The latest observed checkout/setup releases were `actions/checkout` v7.0.1 and
`actions/setup-node` v7.0.0, but CI currently pins v6. Reuse the existing local
setup for the first CD workflow. Upgrade shared CI/CD setup separately so the
release toolchain does not drift from CI.

Node 22 remains inside the repository's `>=22.6.0` engine contract. `npm ci` is
correct because it requires a lockfile, removes existing `node_modules`, and
does not rewrite the lockfile. See
[`npm ci`](https://docs.npmjs.com/cli/v11/commands/npm-ci/).

## Rollout order

1. Enable immutable releases.
2. Add `main` and `v*` rulesets; enforce full-SHA actions.
3. Configure the optional `release` environment.
4. Add tag/version/SHA/reachability gates.
5. Add exact coverage and plugin artifacts.
6. Add isolated build attestations.
7. Add draft/resume/publish/verify logic.
8. Validate YAML and commands without creating a tag or release.
9. Create the first protected annotated tag, `v0.1.0`, only after the manifest,
   generated outputs, and CI are current.

## Final decision

Adopt the proposed flow with these corrections:

- make tag trust and version parity the first gate;
- package committed outputs rather than regenerating unpublished bytes;
- distinguish temporary workflow artifacts from durable release assets;
- use artifact IDs/digests and build provenance between jobs;
- rely on GitHub's automatic source archives unless byte-stable archives are
  explicitly required;
- publish draft -> complete assets -> immutable release;
- implement explicit rerun behavior and never cancel publication;
- grant `contents: write` only to the final release job.

Without tag protection and immutable releases, the YAML would automate a release
but would not establish a trustworthy pinned release. With those controls, tag,
commit, plugin package, coverage evidence, and Release form one verifiable
chain.
