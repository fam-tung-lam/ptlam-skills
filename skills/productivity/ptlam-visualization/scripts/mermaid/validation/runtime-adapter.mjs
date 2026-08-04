import { spawn } from "node:child_process";
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
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { skillRoot } from "../internal/capsule.mjs";
import { MermaidCommandError } from "../internal/command-error.mjs";
import {
  EXPECTED_MERMAID_VERSION,
  MAXIMUM_EDGES,
  MAXIMUM_SOURCE_BYTES,
} from "./source-contract.mjs";

const scriptDirectory = resolve(skillRoot, "scripts/mermaid");
const repositoryRoot = resolve(skillRoot, "../../..");
const defaultTimeoutMs = 30_000;
const maximumTimeoutMs = 120_000;
const defaultSetupTimeoutMs = 11 * 60_000;

// Runtime adapter: verify and invoke only the active locked Mermaid capsule.
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
    cwd: skillRoot,
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
    mermaidVersion: EXPECTED_MERMAID_VERSION,
    cliVersion: EXPECTED_MERMAID_VERSION,
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
    corePackage.version !== EXPECTED_MERMAID_VERSION ||
    cliPackage.version !== EXPECTED_MERMAID_VERSION
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
          maxTextSize: MAXIMUM_SOURCE_BYTES,
          maxEdges: MAXIMUM_EDGES,
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
