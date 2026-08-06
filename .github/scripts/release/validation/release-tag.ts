const SEMVER_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export interface ReleaseTag {
  readonly prerelease: boolean;
  readonly value: string;
  readonly version: string;
}

/** Parse and validate the release identity shared by validation and publication. */
export function parseReleaseTag(
  value: string,
  expectedVersion?: string,
): ReleaseTag {
  if (!value.startsWith("v") || !SEMVER_PATTERN.test(value.slice(1))) {
    throw new Error(
      `Release tag ${value} must use the form v<semantic-version>.`,
    );
  }

  const version = value.slice(1);
  if (expectedVersion !== undefined && version !== expectedVersion) {
    throw new Error(
      `Release tag ${value} must equal plugin version v${expectedVersion}.`,
    );
  }

  return Object.freeze({
    prerelease: version.split("+", 1)[0]?.includes("-") ?? false,
    value,
    version,
  });
}
