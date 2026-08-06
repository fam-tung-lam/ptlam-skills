import { type CommandRunner, SystemCommandRunner } from "./command-runner.ts";
import {
  type PublishGitHubReleaseRequest,
  type PublishGitHubReleaseResult,
  publishGitHubRelease,
} from "./publication/github-release.ts";
import {
  generateReleaseChecksums,
  type PackageReleaseAssetRequest,
  packageCoverageAsset,
  packagePluginAsset,
} from "./publication/package-release-assets.ts";
import {
  type ValidateReleaseTagRequest,
  type ValidateReleaseTagResult,
  validateReleaseTag,
} from "./validation/validate-release-tag.ts";

export interface ReleaseAssetResult {
  readonly path: string;
}

interface ReleaseAutomationDependencies {
  readonly commands?: CommandRunner;
}

/**
 * Own the complete release workflow behind one interface. Callers do not
 * coordinate Git validation, archive construction, recovery, or verification.
 */
export class ReleaseAutomation {
  readonly #commands: CommandRunner;

  constructor({
    commands = new SystemCommandRunner(),
  }: ReleaseAutomationDependencies = {}) {
    this.#commands = commands;
  }

  /** Validate the release tag against the manifest, checkout, and main. */
  async validateRelease(
    request: ValidateReleaseTagRequest,
  ): Promise<ValidateReleaseTagResult> {
    return validateReleaseTag(request, this.#commands);
  }

  /** Package the generated coverage report for artifact promotion. */
  async packageCoverage(
    request: PackageReleaseAssetRequest,
  ): Promise<ReleaseAssetResult> {
    return Object.freeze({ path: await packageCoverageAsset(request) });
  }

  /** Package committed installable plugin outputs for artifact promotion. */
  async packagePlugin(
    request: PackageReleaseAssetRequest,
  ): Promise<ReleaseAssetResult> {
    return Object.freeze({ path: await packagePluginAsset(request) });
  }

  /** Generate the checksum manifest for the promoted archives. */
  async generateChecksums(
    assetsDirectory: string,
  ): Promise<ReleaseAssetResult> {
    return Object.freeze({
      path: await generateReleaseChecksums(assetsDirectory),
    });
  }

  /** Publish or safely resume an immutable, fully verified GitHub Release. */
  async publishRelease(
    request: PublishGitHubReleaseRequest,
  ): Promise<PublishGitHubReleaseResult> {
    return publishGitHubRelease(request, this.#commands);
  }
}
