# Release the plugin

Releasing a plugin version normally requires three developer actions and one
approval in GitHub. CI and CD perform the validation, testing, packaging,
attestation, tag creation, release creation, and verification.

## Release a new version

### 1. Update the plugin version

Change the top-level `version` in `plugin/plugin.yml`. It must be a Semantic
Version that is newer than every existing `v*` release tag.

For example:

```yaml
version: "0.2.0-alpha.1"
```

The resulting release tag will be `v0.2.0-alpha.1`. Do not change the root
`package.json` version; that version belongs to repository tooling.

### 2. Compile and commit the generated plugin

Run:

```sh
npm run plugin:compile
git status --short
```

Review and commit `plugin/plugin.yml` together with the compiler-owned changes
under `.claude-plugin/`, `README.md`, and `skills/`:

```sh
git add -- \
  plugin/plugin.yml \
  .claude-plugin/plugin.json \
  .claude-plugin/marketplace.json \
  README.md \
  skills

git commit -m "chore(release): prepare 0.2.0-alpha.1"
```

Replace the example version in the commit message. Do not include unrelated
changes.

### 3. Merge or push the commit to `main`

Publish the version commit through the repository's normal development flow.
Once it reaches `main`, no developer-created tag or GitHub Release is needed.

## What GitHub automates

The push to `main` starts [CI](../.github/workflows/ci.yml):

```text
Verify plugin -> Analyze code -> Test code and collect coverage
```

After CI succeeds, [CD](../.github/workflows/cd.yml) starts automatically and
plans the release:

- If the manifest version already has an immutable release, CD ends without
  publishing anything.
- If the version is not newer than the latest Semantic Version tag, CD fails.
- If the version is new, CD pins the successful CI commit and continues.

CD then runs:

```text
Plan release
  -> Verify plugin
  -> Analyze code
  -> Test code and package coverage
  -> Build plugin
  -> Attest release assets
  -> Wait for release approval
```

## Approve the release

After the automated jobs pass:

1. Open **Actions > CD** in GitHub.
2. Open the run for the prepared version.
3. Review the commit, derived tag, test result, and generated artifacts.
4. Click **Review deployments**.
5. Select the `release` environment.
6. Click **Approve and deploy**.

After approval, CD automatically:

1. rechecks that the environment requires a reviewer;
2. creates `v<plugin-version>` at the exact successful CI commit;
3. creates a draft release and uploads all assets;
4. publishes the immutable GitHub Release;
5. verifies the tag, release, and every promoted asset.

The completed release contains:

- GitHub-generated source code archives;
- `ptlam-skills-v<version>.tar.gz`;
- `test-coverage-v<version>.tar.gz`;
- `SHA256SUMS`;
- build-provenance and immutable-release attestations.

## Tag trust model

The tag is created by GitHub Actions after approval, so it is an automated
lightweight tag rather than a developer-signed annotated tag. Its integrity is
provided by the protected `release` environment, the successful CI commit SHA,
the immutable GitHub Release, and GitHub's release attestation tying together
the tag, commit, and assets.

Do not create, move, or delete the release tag manually. Do not create a release
through **Draft a new release**.

## References

- [Release automation architecture](../.github/scripts/release/README.md)
- [Reviewing GitHub deployments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments)
- [GitHub environments and required reviewers](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
