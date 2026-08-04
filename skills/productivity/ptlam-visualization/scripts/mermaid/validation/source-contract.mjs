import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { manifestPath, skillRoot } from "../internal/capsule.mjs";
import { MermaidCommandError } from "../internal/command-error.mjs";

const schemaPath = join(
  skillRoot,
  "references/mermaid/11.16.0/schemas/config.schema.yaml",
);
const repositoryRoot = resolve(skillRoot, "../../..");
export const EXPECTED_MERMAID_VERSION = "11.16.0";
export const MAXIMUM_SOURCE_BYTES = 50_000;
export const MAXIMUM_EDGES = 500;

// Source contract: normalize, identify, and statically inspect canonical Mermaid.
function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeMermaidSource(bytes) {
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new MermaidCommandError(
      "source-encoding",
      "Mermaid source must be valid UTF-8.",
    );
  }
  if (source.startsWith("\uFEFF")) source = source.slice(1);
  source = source.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  source = source.normalize("NFC").replace(/\n+$/u, "");
  return `${source}\n`;
}

export function sourceSha256(source) {
  return sha256(Buffer.from(source, "utf8"));
}

async function hashFile(path) {
  return sha256(await readFile(path));
}

export async function loadActiveManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (
    manifest.capsule?.mermaidVersion !== EXPECTED_MERMAID_VERSION ||
    manifest.cli?.version !== EXPECTED_MERMAID_VERSION ||
    manifest.resolvedRuntime?.mermaid?.version !== EXPECTED_MERMAID_VERSION ||
    manifest.resolvedRuntime?.mermaidCli?.version !== EXPECTED_MERMAID_VERSION
  ) {
    throw new MermaidCommandError(
      "manifest-version",
      `Active manifest must resolve Mermaid core and CLI exactly to ${EXPECTED_MERMAID_VERSION}.`,
    );
  }
  const identity = manifest.capsuleIdentity?.value;
  if (!/^[a-f0-9]{64}$/u.test(identity ?? "")) {
    throw new MermaidCommandError(
      "manifest-capsule",
      "Active manifest has no valid capsule identity.",
    );
  }
  const withoutIdentity = { ...manifest };
  delete withoutIdentity.capsuleIdentity;
  const computed = sha256(JSON.stringify(canonicalize(withoutIdentity)));
  if (computed !== identity) {
    throw new MermaidCommandError(
      "manifest-capsule",
      "Active manifest capsule identity does not match its canonical content.",
    );
  }
  for (const input of [
    [
      manifest.runtimeInputs?.packagePath,
      manifest.runtimeInputs?.packageSha256,
    ],
    [manifest.runtimeInputs?.lockPath, manifest.runtimeInputs?.lockSha256],
  ]) {
    const [path, expectedHash] = input;
    if (!path || !/^[a-f0-9]{64}$/u.test(expectedHash ?? "")) {
      throw new MermaidCommandError(
        "manifest-runtime-input",
        "Active manifest runtime input metadata is incomplete.",
      );
    }
    if ((await hashFile(resolve(repositoryRoot, path))) !== expectedHash) {
      throw new MermaidCommandError(
        "manifest-runtime-input",
        `Runtime input hash does not match the active manifest: ${path}`,
      );
    }
  }
  if (!Array.isArray(manifest.catalog) || manifest.catalog.length !== 31) {
    throw new MermaidCommandError(
      "manifest-catalog",
      "Active Mermaid manifest must contain exactly 31 diagram families.",
    );
  }
  return manifest;
}

function extractFrontmatter(source) {
  if (!source.startsWith("---\n")) return { frontmatter: "", body: source };
  const end = source.indexOf("\n---\n", 4);
  if (end < 0) {
    throw new MermaidCommandError(
      "frontmatter",
      "Mermaid frontmatter is not terminated.",
    );
  }
  return {
    frontmatter: source.slice(4, end),
    body: source.slice(end + 5),
  };
}

async function schemaConfigKeys() {
  const schema = await readFile(schemaPath, "utf8");
  const properties = schema.slice(schema.indexOf("\nproperties:\n") + 13);
  const end = properties.search(/^\S/mu);
  const block = end >= 0 ? properties.slice(0, end) : properties;
  return new Set(
    [...block.matchAll(/^ {2}([A-Za-z][A-Za-z0-9_-]*):/gmu)].map(
      (match) => match[1],
    ),
  );
}

function frontmatterConfigKeys(frontmatter) {
  const lines = frontmatter.split("\n");
  const start = lines.findIndex((line) => /^config:\s*$/u.test(line));
  if (start < 0) return [];
  const keys = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/u.test(line)) break;
    const match = line.match(/^ {2}([A-Za-z][A-Za-z0-9_-]*):/u);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function detectFamily(body, catalog) {
  const declarationLine = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line !== "" && !line.startsWith("%%"));
  if (!declarationLine) {
    throw new MermaidCommandError(
      "diagram-declaration",
      "Mermaid source has no diagram declaration.",
    );
  }
  for (const entry of catalog) {
    for (const declaration of entry.declarations) {
      if (
        declarationLine === declaration ||
        declarationLine.startsWith(`${declaration} `) ||
        (declaration === "stateDiagram" &&
          declarationLine.startsWith("stateDiagram-v2"))
      ) {
        return entry;
      }
    }
  }
  throw new MermaidCommandError(
    "diagram-family",
    `Diagram declaration is not in the active ${EXPECTED_MERMAID_VERSION} catalog.`,
  );
}

function meaningfulAccessibilityText(value, label) {
  const text = value?.trim();
  if (
    !text ||
    text.length < 3 ||
    text.length > 500 ||
    /[\u0000-\u001F\u007F]/u.test(text)
  ) {
    throw new MermaidCommandError(
      "accessibility",
      `${label} must contain one meaningful printable line of 3 through 500 characters.`,
    );
  }
  return text;
}

function accessibilityMetadata(source, family) {
  const nativeTitles = [...source.matchAll(/^\s*accTitle:\s*(.*)$/gmu)].map(
    (match) => match[1],
  );
  const nativeDescriptions = [
    ...source.matchAll(/^\s*accDescr:\s*(.*)$/gmu),
  ].map((match) => match[1]);
  const adapterTitles = [
    ...source.matchAll(/^[\t ]*%% ptlam-acc-title: (.*)$/gmu),
  ].map((match) => match[1]);
  const adapterDescriptions = [
    ...source.matchAll(/^[\t ]*%% ptlam-acc-description: (.*)$/gmu),
  ].map((match) => match[1]);
  const mode = family.accessibilityMode ?? "native";
  if (
    !new Set(["native", "adapter-comments", "native-postprocess"]).has(mode)
  ) {
    throw new MermaidCommandError(
      "manifest-accessibility-mode",
      `Unsupported accessibility mode for ${family.id}: ${mode}`,
    );
  }
  const selectedTitles =
    mode === "adapter-comments" ? adapterTitles : nativeTitles;
  const selectedDescriptions =
    mode === "adapter-comments" ? adapterDescriptions : nativeDescriptions;
  if (selectedTitles.length > 1 || selectedDescriptions.length > 1) {
    throw new MermaidCommandError(
      "accessibility-duplicate",
      "Mermaid source contains duplicate accessibility title or description metadata.",
    );
  }
  if (mode === "adapter-comments") {
    if (nativeTitles.length > 0 || nativeDescriptions.length > 0) {
      throw new MermaidCommandError(
        "accessibility-mode",
        "Adapter-comment families must not include grammar-level accTitle or accDescr directives.",
      );
    }
  } else if (adapterTitles.length > 0 || adapterDescriptions.length > 0) {
    throw new MermaidCommandError(
      "accessibility-mode",
      "Native accessibility families must not include PTLam adapter comments.",
    );
  }
  if (selectedTitles.length !== 1 || selectedDescriptions.length !== 1) {
    const required =
      mode === "adapter-comments"
        ? "exactly one %% ptlam-acc-title and %% ptlam-acc-description comment"
        : "exactly one accTitle and accDescr directive";
    throw new MermaidCommandError(
      "accessibility",
      `Mermaid source must contain ${required}.`,
    );
  }
  return {
    mode,
    family: family.id,
    title: meaningfulAccessibilityText(
      selectedTitles[0],
      "Accessibility title",
    ),
    description: meaningfulAccessibilityText(
      selectedDescriptions[0],
      "Accessibility description",
    ),
  };
}

export async function inspectMermaidSource(source, manifest) {
  if (Buffer.byteLength(source, "utf8") > MAXIMUM_SOURCE_BYTES) {
    throw new MermaidCommandError(
      "source-limit",
      `Mermaid source exceeds ${MAXIMUM_SOURCE_BYTES} UTF-8 bytes.`,
    );
  }
  if (/%%\{(?:init|config)\s*:/iu.test(source)) {
    throw new MermaidCommandError(
      "deprecated-directive",
      "Deprecated Mermaid configuration directives are not allowed; use frontmatter.",
    );
  }
  if (
    /(?:https?:|file:|data:|javascript:|src\s*=|href\s*=|<img\b|<iframe\b)/iu.test(
      source,
    )
  ) {
    throw new MermaidCommandError(
      "remote-resource",
      "Remote or embedded resources are forbidden in Mermaid source.",
    );
  }
  const { frontmatter, body } = extractFrontmatter(source);
  const allowedKeys = await schemaConfigKeys();
  const configKeys = frontmatterConfigKeys(frontmatter);
  const unknownKeys = configKeys.filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new MermaidCommandError(
      "config-key",
      `Unknown Mermaid config key: ${unknownKeys.join(", ")}.`,
    );
  }
  const protectedKeys = new Set([
    "securityLevel",
    "secure",
    "startOnLoad",
    "htmlLabels",
    "dompurifyConfig",
    "suppressErrorRendering",
    "maxTextSize",
    "maxEdges",
  ]);
  const overrides = configKeys.filter((key) => protectedKeys.has(key));
  if (overrides.length > 0) {
    throw new MermaidCommandError(
      "secure-config",
      `Diagram frontmatter may not override secure site config: ${overrides.join(", ")}.`,
    );
  }
  const deterministic =
    /deterministicIds:\s*true/u.test(frontmatter) &&
    /deterministicIDSeed:\s*[^\s]+/u.test(frontmatter);
  const familySeed = /^\s+seed:\s*[^\s]+/mu.test(frontmatter);
  if (!deterministic && !familySeed) {
    throw new MermaidCommandError(
      "determinism",
      "Mermaid frontmatter must provide deterministic IDs/seed.",
    );
  }
  const edgeCount = (body.match(/-->|---|==>|-.->|--\s|\s--/gu) ?? []).length;
  if (edgeCount > MAXIMUM_EDGES) {
    throw new MermaidCommandError(
      "edge-limit",
      `Mermaid source exceeds ${MAXIMUM_EDGES} detected edges.`,
    );
  }
  const family = detectFamily(body, manifest.catalog);
  const accessibility = accessibilityMetadata(source, family);
  return {
    family: family.id,
    declaration: family.declarations[0],
    maturity: family.maturity,
    accessibility,
    edgeCount,
  };
}
