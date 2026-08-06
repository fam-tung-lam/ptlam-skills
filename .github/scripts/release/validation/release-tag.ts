const SEMVER_PATTERN =
  /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export interface ReleaseTag {
  readonly prerelease: boolean;
  readonly value: string;
  readonly version: string;
}

type VersionOrder = -1 | 0 | 1;

interface SemanticVersion {
  readonly core: readonly bigint[];
  readonly prerelease: readonly string[] | null;
}

function order(left: bigint | string, right: bigint | string): VersionOrder {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function semanticVersion(version: string): SemanticVersion {
  const precedence = version.split("+", 1)[0];
  if (precedence === undefined) {
    throw new Error(`Could not compare semantic version ${version}.`);
  }
  const separator = precedence.indexOf("-");
  const core = separator === -1 ? precedence : precedence.slice(0, separator);
  const prerelease =
    separator === -1 ? null : precedence.slice(separator + 1).split(".");
  return Object.freeze({
    core: Object.freeze(core.split(".").map((part) => BigInt(part))),
    prerelease: prerelease === null ? null : Object.freeze(prerelease),
  });
}

function comparePrereleaseIdentifiers(
  left: string,
  right: string,
): VersionOrder {
  const leftNumeric = /^[0-9]+$/u.test(left);
  const rightNumeric = /^[0-9]+$/u.test(right);
  if (leftNumeric && rightNumeric) return order(BigInt(left), BigInt(right));
  if (leftNumeric) return -1;
  if (rightNumeric) return 1;
  return order(left, right);
}

function comparePrereleases(
  left: readonly string[] | null,
  right: readonly string[] | null,
): VersionOrder {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left[index];
    const rightIdentifier = right[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    const identifierOrder = comparePrereleaseIdentifiers(
      leftIdentifier,
      rightIdentifier,
    );
    if (identifierOrder !== 0) return identifierOrder;
  }
  return 0;
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

/** Compare two validated release tags according to Semantic Versioning. */
export function compareReleaseTags(
  left: ReleaseTag,
  right: ReleaseTag,
): VersionOrder {
  const leftVersion = semanticVersion(left.version);
  const rightVersion = semanticVersion(right.version);
  for (let index = 0; index < leftVersion.core.length; index += 1) {
    const coreOrder = order(
      leftVersion.core[index] ?? 0n,
      rightVersion.core[index] ?? 0n,
    );
    if (coreOrder !== 0) return coreOrder;
  }
  return comparePrereleases(leftVersion.prerelease, rightVersion.prerelease);
}
