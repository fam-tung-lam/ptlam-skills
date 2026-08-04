import { lstat, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { isComplex, starts } from "./html-source.mjs";

const ASSET_WARNING_BYTES = 10 * 1024 * 1024;
const DEPENDENCY_LINK_RELS = new Set([
  "apple-touch-icon",
  "icon",
  "manifest",
  "mask-icon",
  "modulepreload",
  "preload",
  "stylesheet",
]);

// Resource contract: decode, classify, and safely inspect artifact references.
function decodeAttributeValue(value) {
  let unknownEntity = false;
  const decoded = value.replace(
    /&(#(?:x[0-9A-Fa-f]+|[0-9]+)|[A-Za-z][A-Za-z0-9]+);/g,
    (entity, body) => {
      if (body[0] === "#") {
        const hexadecimal = body[1]?.toLowerCase() === "x";
        const digits = body.slice(hexadecimal ? 2 : 1);
        const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
        if (Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff) {
          return String.fromCodePoint(codePoint);
        }
        unknownEntity = true;
        return entity;
      }

      const named = {
        amp: "&",
        apos: "'",
        colon: ":",
        gt: ">",
        lt: "<",
        quot: '"',
      }[body.toLowerCase()];
      if (named === undefined) {
        unknownEntity = true;
        return entity;
      }
      return named;
    },
  );

  return { decoded, unknownEntity };
}

function classifyReference(value) {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("#")) {
    return { kind: "fragment" };
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return { kind: "invalid", reason: "contains control characters" };
  }

  const schemeMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9+.-]*):/);
  const scheme = schemeMatch?.[1].toLowerCase();
  if (trimmed.startsWith("//") || scheme === "http" || scheme === "https") {
    return { kind: "remote" };
  }
  if (scheme === "data") {
    return { kind: "inline" };
  }
  if (scheme === "blob") {
    return { kind: "runtime" };
  }
  if (scheme) {
    return { kind: "scheme", scheme };
  }
  return { kind: "local" };
}

function relationTokens(token) {
  return new Set(
    (token.attributes.get("rel") ?? "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
  );
}

function collectHtmlReferences(scan, report) {
  const references = [];
  const links = [];

  function addAttribute(token, attribute, kind) {
    const value = token.attributes.get(attribute);
    if (value === undefined || value === null || value.trim() === "") {
      return;
    }
    if (isComplex(value)) {
      return;
    }
    const decoded = decodeAttributeValue(value);
    if (decoded.unknownEntity) {
      report.unverified(
        "reference-entity",
        `The ${attribute} reference in <${token.name}> contains an entity the static validator does not decode.`,
      );
      return;
    }
    references.push({
      value: decoded.decoded,
      context: `<${token.name}> ${attribute}`,
      kind,
    });
  }

  function addSrcset(token) {
    const value = token.attributes.get("srcset");
    if (
      value === undefined ||
      value === null ||
      value.trim() === "" ||
      isComplex(value)
    ) {
      return;
    }
    if (/\bdata:/i.test(value)) {
      report.unverified(
        "srcset-syntax",
        `A data URL in <${token.name}> srcset cannot be split reliably by the static validator.`,
      );
      return;
    }
    const candidates = value.split(",");
    for (const candidate of candidates) {
      const parts = candidate.trim().split(/\s+/);
      if (!parts[0]) {
        report.unverified(
          "srcset-syntax",
          `An empty <${token.name}> srcset candidate is ambiguous.`,
        );
        continue;
      }
      if (
        parts.length > 2 ||
        (parts[1] && !/^\d+(?:\.\d+)?[wx]$/.test(parts[1]))
      ) {
        report.unverified(
          "srcset-syntax",
          `The <${token.name}> srcset candidate "${candidate.trim()}" has ambiguous descriptors.`,
        );
      }
      references.push({
        value: parts[0],
        context: `<${token.name}> srcset`,
        kind: "asset",
      });
    }
  }

  for (const token of scan.tokens) {
    if (token.type !== "start") {
      continue;
    }

    if (
      (token.name === "a" || token.name === "area") &&
      token.attributes.has("href")
    ) {
      const href = token.attributes.get("href");
      if (href !== null && href.trim() !== "" && !isComplex(href)) {
        const decoded = decodeAttributeValue(href);
        if (decoded.unknownEntity) {
          report.unverified(
            "link-entity",
            `A <${token.name}> href contains an entity the static validator does not decode.`,
          );
        } else {
          links.push({ token, value: decoded.decoded });
        }
      }
    }

    if (token.name === "script") addAttribute(token, "src", "asset");
    if (token.name === "img") {
      addAttribute(token, "src", "asset");
      addSrcset(token);
    }
    if (token.name === "source") {
      addAttribute(token, "src", "asset");
      addSrcset(token);
    }
    if (token.name === "video") {
      addAttribute(token, "src", "asset");
      addAttribute(token, "poster", "asset");
    }
    if (["audio", "track", "embed", "iframe"].includes(token.name)) {
      addAttribute(token, "src", "asset");
    }
    if (token.name === "object") addAttribute(token, "data", "asset");
    if (
      token.name === "input" &&
      token.attributes.get("type")?.toLowerCase() === "image"
    ) {
      addAttribute(token, "src", "asset");
    }
    if (token.name === "link") {
      const rels = relationTokens(token);
      if ([...rels].some((rel) => DEPENDENCY_LINK_RELS.has(rel))) {
        addAttribute(token, "href", "asset");
      }
    }
    if (
      (token.name === "a" || token.name === "area") &&
      token.attributes.has("download")
    ) {
      addAttribute(token, "href", "asset");
    }
  }

  return { references, links };
}

function collectCssReferences(scan, report) {
  const references = [];
  const cssSources = [];
  for (const token of scan.tokens) {
    if (token.type !== "start") continue;
    if (token.name === "style" && token.content !== undefined) {
      cssSources.push({ css: token.content, context: "<style>" });
    }
    const inlineStyle = token.attributes.get("style");
    if (inlineStyle !== undefined && inlineStyle !== null) {
      cssSources.push({ css: inlineStyle, context: `<${token.name}> style` });
    }
  }

  for (const { css, context } of cssSources) {
    const urlPattern =
      /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)'";][^)]*?))\s*\)/gi;
    let match;
    let matchCount = 0;
    while ((match = urlPattern.exec(css)) !== null) {
      matchCount += 1;
      const value = (match[1] ?? match[2] ?? match[3] ?? "").trim();
      if (value !== "" && !isComplex(value)) {
        references.push({ value, context: `${context} url()`, kind: "asset" });
      }
    }
    const openingCount = [...css.matchAll(/url\s*\(/gi)].length;
    if (openingCount !== matchCount) {
      report.unverified(
        "css-reference-syntax",
        `${context} contains url() syntax that cannot be resolved deterministically.`,
      );
    }

    const importPattern = /@import\s+(?!url\s*\()(?:"([^"]+)"|'([^']+)')/gi;
    while ((match = importPattern.exec(css)) !== null) {
      const value = match[1] ?? match[2];
      if (!isComplex(value)) {
        references.push({
          value,
          context: `${context} @import`,
          kind: "asset",
        });
      }
    }
  }

  return { references, cssSources };
}

function checkLinks(report, links, hasBaseElement) {
  for (const { token, value } of links) {
    const classification = classifyReference(value);
    if (classification.kind === "invalid") {
      report.error("unsafe-link", `Link "${value}" ${classification.reason}.`);
      continue;
    }
    if (classification.kind === "scheme") {
      if (
        classification.scheme === "mailto" ||
        classification.scheme === "tel"
      ) {
        continue;
      }
      report.error(
        "unsafe-link",
        `Link "${value}" uses disallowed ${classification.scheme}: syntax. Use a safe local, HTTPS, mailto, or tel target.`,
      );
      continue;
    }
    if (classification.kind === "inline" || classification.kind === "runtime") {
      report.error(
        "unsafe-link",
        `Link "${value}" uses a non-navigation ${classification.kind} URL.`,
      );
      continue;
    }
    if (classification.kind === "local" && hasBaseElement) {
      report.unverified(
        "link-base-url",
        `Relative link "${value}" cannot be classified statically while a <base> element is present.`,
      );
      continue;
    }
    if (classification.kind !== "remote") {
      continue;
    }

    const target = token.attributes.get("target");
    if (target === undefined || target === null || target.trim() === "") {
      continue;
    }
    if (isComplex(target)) {
      report.unverified(
        "external-link-opener",
        `External link "${value}" has a dynamic target.`,
      );
      continue;
    }
    const normalizedTarget = target.trim().toLowerCase();
    if (["_self", "_parent", "_top"].includes(normalizedTarget)) {
      continue;
    }
    const rels = relationTokens(token);
    const missing = ["noopener", "noreferrer"].filter((rel) => !rels.has(rel));
    if (missing.length > 0) {
      report.error(
        "external-link-opener",
        `External link "${value}" opens target="${target}" without rel="noopener noreferrer"; missing ${missing.join(" and ")}.`,
      );
    }
  }
}

function isWithin(base, candidate) {
  const pathFromBase = relative(base, candidate);
  return (
    pathFromBase === "" ||
    (!pathFromBase.startsWith(`..${sep}`) &&
      pathFromBase !== ".." &&
      !isAbsolute(pathFromBase))
  );
}

function localPathFromReference(value, baseDirectory) {
  if (value.includes("\\")) {
    return {
      error: "uses a backslash, which is not a portable local URL path",
    };
  }
  const withoutFragment = value.split("#", 1)[0];
  const withoutQuery = withoutFragment.split("?", 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return { error: "contains invalid percent-encoding" };
  }
  if (decoded === "") {
    return { fragment: true };
  }
  if (decoded.startsWith("/")) {
    return { outside: true };
  }
  const resolvedPath = resolve(baseDirectory, decoded);
  if (!isWithin(baseDirectory, resolvedPath)) {
    return { outside: true };
  }
  return { path: resolvedPath };
}

async function checkReferences(report, references, htmlPath, hasBaseElement) {
  const baseDirectory = resolve(dirname(htmlPath));
  let realBaseDirectory;
  try {
    realBaseDirectory = await realpath(baseDirectory);
  } catch (error) {
    report.error(
      "asset-context",
      `Cannot resolve artifact directory "${baseDirectory}": ${error.message}`,
    );
    return;
  }

  const seenRemote = new Set();
  const localReferences = new Map();
  for (const reference of references) {
    const classification = classifyReference(reference.value);
    if (
      classification.kind === "fragment" ||
      classification.kind === "inline"
    ) {
      continue;
    }
    if (classification.kind === "invalid") {
      report.error(
        "asset-reference",
        `${reference.context} reference "${reference.value}" ${classification.reason}.`,
      );
      continue;
    }
    if (classification.kind === "runtime") {
      report.unverified(
        "runtime-asset",
        `${reference.context} uses blob URL "${reference.value}"; availability requires a browser runtime.`,
      );
      continue;
    }
    if (classification.kind === "scheme") {
      report.error(
        "asset-reference",
        `${reference.context} uses unsupported ${classification.scheme}: URL "${reference.value}".`,
      );
      continue;
    }
    if (classification.kind === "remote") {
      const key = `${reference.context}\u0000${reference.value}`;
      if (!seenRemote.has(key)) {
        report.warning(
          "remote-dependency",
          `${reference.context} references remote dependency "${reference.value}"; it was not fetched. Inline it or obtain user consent.`,
        );
        seenRemote.add(key);
      }
      continue;
    }
    if (hasBaseElement) {
      report.unverified(
        "asset-base-url",
        `${reference.context} relative reference "${reference.value}" cannot be resolved safely while a <base> element is present.`,
      );
      continue;
    }

    const local = localPathFromReference(reference.value, baseDirectory);
    if (local.error) {
      report.error(
        "asset-reference",
        `${reference.context} reference "${reference.value}" ${local.error}.`,
      );
      continue;
    }
    if (local.outside) {
      report.error(
        "asset-outside-context",
        `${reference.context} reference "${reference.value}" resolves outside the artifact directory and was not followed.`,
      );
      continue;
    }
    if (local.fragment) {
      continue;
    }
    if (!localReferences.has(local.path)) {
      localReferences.set(local.path, reference);
    }
  }

  for (const [assetPath, reference] of localReferences) {
    let assetInfo;
    try {
      const linkInfo = await lstat(assetPath);
      const resolvedAsset = await realpath(assetPath);
      if (!isWithin(realBaseDirectory, resolvedAsset)) {
        report.error(
          "asset-outside-context",
          `${reference.context} reference "${reference.value}" resolves through a symlink outside the artifact directory and was not followed.`,
        );
        continue;
      }
      assetInfo = linkInfo.isSymbolicLink() ? await stat(assetPath) : linkInfo;
    } catch (error) {
      report.error(
        "missing-asset",
        `${reference.context} local asset "${reference.value}" is not readable: ${error.message}`,
      );
      continue;
    }

    if (!assetInfo.isFile()) {
      report.error(
        "invalid-asset",
        `${reference.context} local asset "${reference.value}" is not a regular file.`,
      );
      continue;
    }

    report.localAssetCount += 1;
    report.totalBytes += assetInfo.size;
    if (assetInfo.size > ASSET_WARNING_BYTES) {
      report.warning(
        "asset-size",
        `Local asset "${reference.value}" is ${assetInfo.size} bytes, above the 10 MB per-asset threshold.`,
      );
    }
  }
}

function checkOverflowHazards(report, cssSources) {
  const reported = new Set();
  for (const { css, context } of cssSources) {
    const blocks =
      context === "<style>"
        ? [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        : [[null, context, css]];
    for (const block of blocks) {
      const selector = block[1].trim();
      const declarations = block[2];
      if (context === "<style>" && !selector.includes(".ptv-")) {
        continue;
      }

      const minSizePattern =
        /(?:min-width|min-inline-size)\s*:\s*(\d+(?:\.\d+)?)px\b/gi;
      let match;
      while ((match = minSizePattern.exec(declarations)) !== null) {
        if (Number(match[1]) <= 320) continue;
        const message = `${selector} sets ${match[0]}, an obvious 320px overflow hazard in a bundled pattern.`;
        if (!reported.has(message)) {
          report.warning("overflow-hazard", message);
          reported.add(message);
        }
      }

      const hasResponsiveMaximum =
        /(?:max-width|max-inline-size)\s*:\s*(?:100%|min\(|clamp\(|calc\()/i.test(
          declarations,
        );
      if (hasResponsiveMaximum) continue;
      const fixedSizePattern =
        /(?:^|[;\s])(?:width|inline-size)\s*:\s*(\d+(?:\.\d+)?)px\b/gi;
      while ((match = fixedSizePattern.exec(declarations)) !== null) {
        if (Number(match[1]) <= 320) continue;
        const message = `${selector} sets ${match[0].trim()} without a responsive maximum, an obvious 320px overflow hazard in a bundled pattern.`;
        if (!reported.has(message)) {
          report.warning("overflow-hazard", message);
          reported.add(message);
        }
      }
    }
  }
}

export async function validateDocumentResources(report, scan, htmlPath) {
  const baseElements = starts(scan.tokens, "base");
  const hasBaseElement = baseElements.length > 0;
  if (hasBaseElement) {
    report.unverified(
      "base-url",
      "A <base> element changes relative URL semantics; relative links and assets require browser-DOM validation.",
    );
    for (const baseElement of baseElements) {
      const href = baseElement.attributes.get("href");
      if (
        href === undefined ||
        href === null ||
        href.trim() === "" ||
        isComplex(href)
      ) {
        continue;
      }
      const classification = classifyReference(href);
      if (classification.kind === "remote") {
        report.warning(
          "remote-base-url",
          `<base> references remote URL "${href}"; relative dependencies may become remote and were not fetched.`,
        );
      } else if (classification.kind === "scheme") {
        report.error(
          "base-url",
          `<base> uses unsupported ${classification.scheme}: URL "${href}".`,
        );
      }
    }
  }

  const htmlReferences = collectHtmlReferences(scan, report);
  const cssReferences = collectCssReferences(scan, report);
  checkLinks(report, htmlReferences.links, hasBaseElement);
  await checkReferences(
    report,
    [...htmlReferences.references, ...cssReferences.references],
    htmlPath,
    hasBaseElement,
  );
  checkOverflowHazards(report, cssReferences.cssSources);
}
