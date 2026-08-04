#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const skillDirectory = resolve(scriptDirectory, "../..");
const repositoryRoot = resolve(skillDirectory, "../../..");
const manifestPath = join(
  skillDirectory,
  "references/mermaid/11.16.0/MANIFEST.json",
);
const schemaPath = join(
  skillDirectory,
  "references/mermaid/11.16.0/schemas/config.schema.yaml",
);
const expectedVersion = "11.16.0";
const defaultTimeoutMs = 30_000;
const maximumTimeoutMs = 120_000;
const defaultSetupTimeoutMs = 11 * 60_000;
const maximumSourceBytes = 50_000;
const maximumEdges = 500;
const validateHelp = `Usage:
  validate.mjs <source.mmd> [--timeout-ms <100..120000>]
  validate.mjs --help

Validates normalized Mermaid source against the pinned 11.16.0 catalog,
verifies the locked runtime capsule, performs one SVG parse/render probe, and
writes JSON evidence to stdout. No output or evidence sidecar is created.
--timeout-ms bounds only the render probe; lazy runtime setup keeps its separate
installation deadline and cleanup grace.
`;

export class MermaidCommandError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

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
    manifest.capsule?.mermaidVersion !== expectedVersion ||
    manifest.cli?.version !== expectedVersion ||
    manifest.resolvedRuntime?.mermaid?.version !== expectedVersion ||
    manifest.resolvedRuntime?.mermaidCli?.version !== expectedVersion
  ) {
    throw new MermaidCommandError(
      "manifest-version",
      `Active manifest must resolve Mermaid core and CLI exactly to ${expectedVersion}.`,
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
    `Diagram declaration is not in the active ${expectedVersion} catalog.`,
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
  if (Buffer.byteLength(source, "utf8") > maximumSourceBytes) {
    throw new MermaidCommandError(
      "source-limit",
      `Mermaid source exceeds ${maximumSourceBytes} UTF-8 bytes.`,
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
  if (edgeCount > maximumEdges) {
    throw new MermaidCommandError(
      "edge-limit",
      `Mermaid source exceeds ${maximumEdges} detected edges.`,
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

function isWithin(root, candidate) {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== "..");
}

function runProcess(command, arguments_, options) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, arguments_, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > 1_000_000) child.kill("SIGKILL");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 1_000_000) child.kill("SIGKILL");
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectRun(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolveRun({ code, signal, stdout, stderr, timedOut });
    });
  });
}

export function sanitizeDiagnostic(value) {
  const lines = String(value ?? "")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .split("\n")
    .map((line) =>
      line.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, ""),
    )
    .filter((line) => line.trim() !== "")
    .slice(0, 20);
  const safe = [];
  for (const line of lines) {
    let decodedForDetection = line;
    for (let pass = 0; pass < 2; pass += 1) {
      decodedForDetection = decodedForDetection.replace(
        /%([\da-f]{2})/giu,
        (_, byte) => String.fromCharCode(Number.parseInt(byte, 16)),
      );
    }
    const containsLocalPath =
      /mermaid-cli-intercept\.invalid/iu.test(decodedForDetection) ||
      /file:\/{1,3}/iu.test(decodedForDetection) ||
      /\/(?:Users|home|private|root|tmp)(?:\/|$)/iu.test(decodedForDetection) ||
      /\/(?:var\/folders|Library\/Caches|\.cache|Caches|cache|runtime)(?:\/|$)/iu.test(
        decodedForDetection,
      ) ||
      /[a-z]:[\\/]/iu.test(decodedForDetection) ||
      /\\\\[^\\\s]+\\[^\s]*/u.test(decodedForDetection) ||
      /(?:^|[\s("'=])\/(?!\/)[^\s]*/u.test(decodedForDetection);
    const candidate = containsLocalPath
      ? "[local path redacted]"
      : line.trim().slice(0, 500);
    if (safe.at(-1) !== candidate) safe.push(candidate);
  }
  const diagnostic = safe.join("\n").slice(0, 2_000);
  return diagnostic || "Renderer failed without a path-safe diagnostic.";
}

export function errorDetailsForEvidence(details) {
  if (!details || typeof details !== "object") return undefined;
  const diagnostics = Object.values(details).filter(
    (value) => typeof value === "string" && value.trim() !== "",
  );
  if (diagnostics.length === 0) return undefined;
  return { diagnostic: sanitizeDiagnostic(diagnostics.join("\n")) };
}

export async function ensureVerifiedRuntime(manifest, options = {}) {
  const setupPath = resolve(
    options.setupPath ??
      process.env.PTLAM_MERMAID_SETUP_PATH ??
      join(scriptDirectory, "setup.mjs"),
  );
  await access(setupPath).catch(() => {
    throw new MermaidCommandError(
      "setup-unavailable",
      "Mermaid setup command is unavailable at the configured local path.",
    );
  });
  const result = await runProcess(process.execPath, [setupPath, "--ensure"], {
    cwd: skillDirectory,
    env: { ...process.env },
    timeoutMs: options.setupTimeoutMs ?? defaultSetupTimeoutMs,
  });
  if (result.timedOut) {
    throw new MermaidCommandError("setup-timeout", "Mermaid setup timed out.");
  }
  if (result.code !== 0) {
    throw new MermaidCommandError(
      "setup-failed",
      "Mermaid setup did not produce a verified runtime.",
      { diagnostic: sanitizeDiagnostic(result.stderr) },
    );
  }
  let runtime;
  try {
    runtime = JSON.parse(result.stdout.trim());
  } catch {
    throw new MermaidCommandError(
      "setup-contract",
      "Mermaid setup stdout must contain exactly one JSON result.",
    );
  }
  const expected = {
    schemaVersion: 1,
    status: "ready",
    capsuleIdentity: manifest.capsuleIdentity.value,
    mermaidVersion: expectedVersion,
    cliVersion: expectedVersion,
    browserVersion: manifest.browser.buildId,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (runtime[key] !== value) {
      throw new MermaidCommandError(
        "runtime-mismatch",
        `Verified runtime ${key} does not match the active capsule.`,
      );
    }
  }
  for (const key of ["runtimeRoot", "cliEntryPath", "browserExecutablePath"]) {
    if (!isAbsolute(runtime[key] ?? "")) {
      throw new MermaidCommandError(
        "setup-contract",
        `Verified runtime ${key} must be an absolute path.`,
      );
    }
  }
  const runtimeRoot = await realpath(runtime.runtimeRoot);
  const cliEntryPath = await realpath(runtime.cliEntryPath);
  const browserExecutablePath = await realpath(runtime.browserExecutablePath);
  if (
    !isWithin(runtimeRoot, cliEntryPath) ||
    !isWithin(runtimeRoot, browserExecutablePath)
  ) {
    throw new MermaidCommandError(
      "setup-contract",
      "Verified executable paths must remain inside runtimeRoot.",
    );
  }
  const corePackage = JSON.parse(
    await readFile(
      join(runtimeRoot, "node_modules/mermaid/package.json"),
      "utf8",
    ),
  );
  const cliPackage = JSON.parse(
    await readFile(
      join(runtimeRoot, "node_modules/@mermaid-js/mermaid-cli/package.json"),
      "utf8",
    ),
  );
  if (
    corePackage.version !== expectedVersion ||
    cliPackage.version !== expectedVersion
  ) {
    throw new MermaidCommandError(
      "runtime-mismatch",
      "Resolved Mermaid core and CLI package versions must both be 11.16.0.",
    );
  }
  await stat(browserExecutablePath);
  return { ...runtime, runtimeRoot, cliEntryPath, browserExecutablePath };
}

function escapeXmlText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function nextSemanticIds(svg, sourceHash) {
  const prefix = `ptlam-mermaid-${sourceHash.slice(0, 12)}`;
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const discriminator = suffix === 0 ? "" : `-${suffix}`;
    const titleId = `${prefix}${discriminator}-title`;
    const descriptionId = `${prefix}${discriminator}-description`;
    if (
      !new RegExp(`\\sid=["']${titleId}["']`, "u").test(svg) &&
      !new RegExp(`\\sid=["']${descriptionId}["']`, "u").test(svg)
    ) {
      return { titleId, descriptionId };
    }
  }
  throw new MermaidCommandError(
    "svg-accessibility-id",
    "Could not allocate unique deterministic SVG accessibility IDs.",
  );
}

function normalizeAffectedRoot(opening) {
  let root = /\srole=["'][^"']+["']/iu.test(opening)
    ? opening.replace(/\srole=["'][^"']+["']/iu, ' role="img"')
    : opening.replace(/<svg\b/iu, '<svg role="img"');
  const unsafeRoleDescription =
    /\s+aria-roledescription=(["'])\s*(?:error)?\s*\1/iu;
  const droppedUnsafeRoleDescription = unsafeRoleDescription.test(root);
  root = root.replace(unsafeRoleDescription, "");
  return { root, droppedUnsafeRoleDescription };
}

function decodeXmlText(value) {
  if (
    /</u.test(value) ||
    /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);)/iu.test(value)
  ) {
    return undefined;
  }
  try {
    return value.replace(
      /&(amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/giu,
      (_, entity) => {
        const named = {
          amp: "&",
          lt: "<",
          gt: ">",
          quot: '"',
          apos: "'",
        };
        if (named[entity]) return named[entity];
        const codePoint = entity.toLowerCase().startsWith("#x")
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
        return String.fromCodePoint(codePoint);
      },
    );
  } catch {
    return undefined;
  }
}

function repairKnownC4Description(
  svg,
  openingMatch,
  opening,
  accessibility,
  sourceHash,
) {
  if (accessibility.family !== "c4") return undefined;
  if (
    /<title(?:\s|>)/iu.test(svg) ||
    /\saria-(?:label|labelledby)=/iu.test(opening)
  ) {
    return undefined;
  }
  const descriptions = [...svg.matchAll(/<desc\b([^>]*)>([^<]*)<\/desc>/giu)];
  if (descriptions.length !== 1) return undefined;
  const descriptionId = descriptions[0][1].match(
    /(?:^|\s)id=(["'])([^"']+)\1/iu,
  )?.[2];
  const describedBy = opening.match(
    /\saria-describedby=(["'])([^"']+)\1/iu,
  )?.[2];
  if (
    !descriptionId ||
    describedBy !== descriptionId ||
    decodeXmlText(descriptions[0][2]) !== accessibility.description
  ) {
    return undefined;
  }
  const { titleId } = nextSemanticIds(svg, sourceHash);
  const normalized = normalizeAffectedRoot(opening);
  const root = normalized.root.replace(
    /<svg\b/iu,
    `<svg aria-labelledby="${titleId}"`,
  );
  const title = `<title id="${titleId}">${escapeXmlText(accessibility.title)}</title>`;
  const repaired = `${svg.slice(0, openingMatch.index)}${root}${title}${svg.slice(openingMatch.index + opening.length)}`;
  return {
    bytes: Buffer.from(repaired, "utf8"),
    accessibilityRepair: {
      mode: accessibility.mode,
      postprocessed: true,
      upstreamSemantics: "verified-description",
      titleId,
      descriptionId,
      normalizedRole: true,
      droppedUnsafeRoleDescription: normalized.droppedUnsafeRoleDescription,
    },
  };
}

export function postprocessSvgAccessibility(bytes, accessibility, sourceHash) {
  const svg = bytes.toString("utf8");
  const openingMatch = svg.match(/<svg\b[^>]*>/iu);
  if (!openingMatch) {
    throw new MermaidCommandError(
      "output-type",
      "Renderer did not produce an SVG root element.",
    );
  }
  const opening = openingMatch[0];
  const hasTitle = /<title(?:\s|>)/iu.test(svg);
  const hasDescription = /<desc(?:\s|>)/iu.test(svg);
  const hasAria = /\saria-labelledby=["'][^"']+["']/iu.test(opening);
  const hasAnyAria =
    /\saria-(?:label|labelledby|describedby)=["'][^"']*["']/iu.test(opening);
  const hasImageRole = /\srole=["']img["']/iu.test(opening);
  const hasUnsafeRoleDescription =
    /\saria-roledescription=(["'])\s*(?:error)?\s*\1/iu.test(opening);
  const complete = hasTitle && hasDescription && hasAria;
  const empty = !hasTitle && !hasDescription && !hasAnyAria;
  const mode = accessibility?.mode ?? "native";
  if (complete) {
    if (mode !== "native" && (!hasImageRole || hasUnsafeRoleDescription)) {
      const normalized = normalizeAffectedRoot(opening);
      const root = normalized.root;
      const repaired = `${svg.slice(0, openingMatch.index)}${root}${svg.slice(openingMatch.index + opening.length)}`;
      return {
        bytes: Buffer.from(repaired, "utf8"),
        accessibilityRepair: {
          mode,
          postprocessed: true,
          upstreamSemantics: true,
          normalizedRole: true,
          droppedUnsafeRoleDescription: normalized.droppedUnsafeRoleDescription,
        },
      };
    }
    return {
      bytes,
      accessibilityRepair: {
        mode,
        postprocessed: false,
        upstreamSemantics: true,
      },
    };
  }
  if (mode === "native") {
    throw new MermaidCommandError(
      "svg-accessibility",
      "Native Mermaid SVG output did not preserve title, description, and ARIA relationships.",
    );
  }
  const knownPartial = repairKnownC4Description(
    svg,
    openingMatch,
    opening,
    accessibility,
    sourceHash,
  );
  if (knownPartial) return knownPartial;
  if (!empty) {
    throw new MermaidCommandError(
      "svg-accessibility-partial",
      "Mermaid SVG contains partial accessibility semantics and cannot be repaired without ambiguity.",
    );
  }
  const { titleId, descriptionId } = nextSemanticIds(svg, sourceHash);
  const normalized = normalizeAffectedRoot(opening);
  const root = normalized.root.replace(
    /<svg\b/iu,
    `<svg aria-labelledby="${titleId} ${descriptionId}"`,
  );
  const semantics = `<title id="${titleId}">${escapeXmlText(accessibility.title)}</title><desc id="${descriptionId}">${escapeXmlText(accessibility.description)}</desc>`;
  const repaired = `${svg.slice(0, openingMatch.index)}${root}${semantics}${svg.slice(openingMatch.index + opening.length)}`;
  return {
    bytes: Buffer.from(repaired, "utf8"),
    accessibilityRepair: {
      mode,
      postprocessed: true,
      upstreamSemantics: false,
      titleId,
      descriptionId,
      normalizedRole: true,
      droppedUnsafeRoleDescription: normalized.droppedUnsafeRoleDescription,
    },
  };
}

export async function runVerifiedRenderer(
  runtime,
  source,
  format,
  sourceHash,
  options = {},
) {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "ptlam-mermaid-render-"),
  );
  try {
    const rendererInput =
      options.accessibility?.mode === "adapter-comments"
        ? source
            .split("\n")
            .filter(
              (line) =>
                !/^[\t ]*%% ptlam-acc-(?:title|description): /u.test(line),
            )
            .join("\n")
        : source;
    const inputPath = join(temporaryDirectory, "source.mmd");
    const outputPath = join(temporaryDirectory, `output.${format}`);
    const configPath = join(temporaryDirectory, "mermaid-config.json");
    const browserConfigPath = join(temporaryDirectory, "browser-config.json");
    await Promise.all([
      writeFile(inputPath, rendererInput, { encoding: "utf8", flag: "wx" }),
      writeFile(
        configPath,
        `${JSON.stringify({
          securityLevel: "strict",
          startOnLoad: false,
          htmlLabels: false,
          maxTextSize: maximumSourceBytes,
          maxEdges: maximumEdges,
          deterministicIds: true,
          deterministicIDSeed: sourceHash,
        })}\n`,
        { encoding: "utf8", flag: "wx" },
      ),
      writeFile(
        browserConfigPath,
        `${JSON.stringify({
          executablePath: runtime.browserExecutablePath,
          headless: true,
          args: [
            "--disable-background-networking",
            "--disable-sync",
            "--metrics-recording-only",
            "--no-first-run",
          ],
        })}\n`,
        { encoding: "utf8", flag: "wx" },
      ),
    ]);
    const rendererArguments = [
      runtime.cliEntryPath,
      "--input",
      inputPath,
      "--output",
      outputPath,
      "--configFile",
      configPath,
      "--puppeteerConfigFile",
      browserConfigPath,
      "--quiet",
    ];
    if (format === "pdf") rendererArguments.push("--pdfFit");
    const result = await runProcess(process.execPath, rendererArguments, {
      cwd: runtime.runtimeRoot,
      env: {
        PATH: process.env.PATH,
        TMPDIR: temporaryDirectory,
        PTLAM_MERMAID_BROWSER: runtime.browserExecutablePath,
      },
      timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
    });
    if (result.timedOut) {
      throw new MermaidCommandError(
        "render-timeout",
        `Mermaid ${format} render exceeded the timeout.`,
      );
    }
    if (result.code !== 0) {
      throw new MermaidCommandError(
        "render-failed",
        `Mermaid ${format} render failed.`,
        { diagnostic: sanitizeDiagnostic(result.stderr) },
      );
    }
    const bytes = await readFile(outputPath);
    if (format === "svg") {
      return postprocessSvgAccessibility(
        bytes,
        options.accessibility,
        sourceHash,
      );
    }
    return {
      bytes,
      accessibilityRepair: {
        mode: options.accessibility?.mode ?? "native",
        postprocessed: false,
        textAlternativeExternal: true,
      },
    };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export function accessibilityCompatibilityWarnings(accessibility) {
  if (accessibility.mode !== "adapter-comments") return [];
  return [
    {
      code: "adapter-comments-host-accessibility",
      message:
        "This source uses PTLam adapter comments for Mermaid 11.16.0. Target hosts may not produce semantic SVG; prefer pinned static SVG when host accessibility is required.",
    },
  ];
}

function evidenceBase(
  operation,
  sourcePath,
  source,
  inspection,
  manifest,
  runtime,
) {
  const warnings = [];
  if (inspection.maturity !== "stable") {
    warnings.push({
      code: "family-maturity",
      message: `${inspection.family} is ${inspection.maturity} in Mermaid ${expectedVersion}.`,
    });
  }
  warnings.push(
    ...accessibilityCompatibilityWarnings(inspection.accessibility),
  );
  return {
    schemaVersion: 1,
    skillContractVersion: 1,
    capability: "mermaid",
    operation,
    status: "ok",
    source: {
      path: resolve(sourcePath),
      sha256: sourceSha256(source),
      normalized: true,
    },
    diagram: inspection,
    runtime: {
      mermaidVersion: runtime.mermaidVersion,
      cliVersion: runtime.cliVersion,
      browserVersion: runtime.browserVersion,
      capsuleIdentity: manifest.capsuleIdentity.value,
    },
    warnings,
    unverified: [],
    errors: [],
  };
}

export async function validateMermaidFile(inputPath, options = {}) {
  const manifest = await loadActiveManifest();
  const source = normalizeMermaidSource(await readFile(inputPath));
  const inspection = await inspectMermaidSource(source, manifest);
  const runtime = await ensureVerifiedRuntime(manifest, options);
  let probeResult;
  if (options.probe !== false) {
    probeResult = await runVerifiedRenderer(
      runtime,
      source,
      "svg",
      sourceSha256(source),
      { ...options, accessibility: inspection.accessibility },
    );
  }
  const evidence = evidenceBase(
    "validate",
    inputPath,
    source,
    inspection,
    manifest,
    runtime,
  );
  evidence.validation = {
    manifest: "passed",
    runtime: "passed",
    source: "passed",
    parseAndRender: options.probe === false ? "unverified" : "passed",
    security: "passed-static",
    accessibilityMode: inspection.accessibility.mode,
    svgPostprocessed: probeResult?.accessibilityRepair.postprocessed ?? false,
  };
  if (options.probe === false) {
    evidence.unverified.push({
      code: "parse-render",
      message:
        "Parse/render proof was delegated to the requested output render.",
    });
  }
  return { evidence, source, inspection, manifest, runtime };
}

function parseCli(arguments_) {
  if (arguments_.length === 0) {
    throw new MermaidCommandError(
      "cli-usage",
      "Usage: validate.mjs <source.mmd> [--timeout-ms <100..120000>]",
    );
  }
  const inputPath = arguments_[0];
  let timeoutMs = defaultTimeoutMs;
  for (let index = 1; index < arguments_.length; index += 2) {
    if (arguments_[index] !== "--timeout-ms" || !arguments_[index + 1]) {
      throw new MermaidCommandError("cli-usage", "Unknown validate option.");
    }
    timeoutMs = Number(arguments_[index + 1]);
  }
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 100 ||
    timeoutMs > maximumTimeoutMs
  ) {
    throw new MermaidCommandError(
      "cli-usage",
      "--timeout-ms must be an integer from 100 through 120000.",
    );
  }
  return { inputPath, timeoutMs };
}

function errorEvidence(error) {
  const details = errorDetailsForEvidence(error.details);
  return {
    schemaVersion: 1,
    skillContractVersion: 1,
    capability: "mermaid",
    operation: "validate",
    status: "error",
    warnings: [],
    unverified: [],
    errors: [
      {
        code: error.code ?? "unexpected",
        message: sanitizeDiagnostic(error.message),
        ...(details ? { details } : {}),
      },
    ],
  };
}

export async function main(arguments_ = process.argv.slice(2)) {
  if (arguments_.length === 1 && arguments_[0] === "--help") {
    process.stdout.write(validateHelp);
    return 0;
  }
  try {
    const options = parseCli(arguments_);
    const { evidence } = await validateMermaidFile(options.inputPath, options);
    process.stdout.write(`${JSON.stringify(evidence)}\n`);
    return 0;
  } catch (error) {
    process.stdout.write(`${JSON.stringify(errorEvidence(error))}\n`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await main();
}
