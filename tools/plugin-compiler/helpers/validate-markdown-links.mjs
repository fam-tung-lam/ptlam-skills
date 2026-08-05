import path from "node:path";

const INLINE_LINK_PATTERN = /!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/gu;
const REFERENCE_DEFINITION_PATTERN =
  /^[ \t]{0,3}\[[^\]]+\]:[ \t]*(<[^>]+>|\S+)/gmu;

function linkTargets(source) {
  return [
    ...[...source.matchAll(INLINE_LINK_PATTERN)].map((match) => match[1]),
    ...[...source.matchAll(REFERENCE_DEFINITION_PATTERN)].map(
      (match) => match[1],
    ),
  ];
}

/** Validate every supported local Markdown link against one isolated file set. */
export function validateMarkdownLinks({
  source,
  markdownPath,
  sourceFiles,
  skillPath,
}) {
  const diagnostics = [];
  for (const matchedTarget of linkTargets(source)) {
    const rawTarget = matchedTarget.replace(/^<|>$/gu, "");
    if (rawTarget.startsWith("#") || rawTarget.startsWith("https://")) continue;
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(rawTarget)) {
      diagnostics.push(
        `${skillPath}/${markdownPath}: unsupported link scheme in "${rawTarget}"; only https links are allowed externally`,
      );
      continue;
    }

    const targetWithoutFragment = rawTarget.split(/[?#]/u, 1)[0];
    if (targetWithoutFragment === "") continue;
    let decodedTarget;
    try {
      decodedTarget = decodeURIComponent(targetWithoutFragment);
    } catch {
      diagnostics.push(
        `${skillPath}/${markdownPath}: invalid encoded link "${rawTarget}"`,
      );
      continue;
    }
    if (decodedTarget.startsWith("/") || decodedTarget.startsWith("~")) {
      diagnostics.push(
        `${skillPath}/${markdownPath}: local link must be skill-relative: "${rawTarget}"`,
      );
      continue;
    }

    const resolved = path.posix.normalize(
      path.posix.join(path.posix.dirname(markdownPath), decodedTarget),
    );
    if (resolved === ".." || resolved.startsWith("../")) {
      diagnostics.push(
        `${skillPath}/${markdownPath}: local link escapes the skill: "${rawTarget}"`,
      );
    } else if (!sourceFiles.has(resolved)) {
      diagnostics.push(
        `${skillPath}/${markdownPath}: local link target does not exist: "${rawTarget}"`,
      );
    }
  }
  return diagnostics;
}
