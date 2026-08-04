#!/usr/bin/env node

import { mkdir, open, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import {
  errorDetailsForEvidence,
  MermaidCommandError,
  runVerifiedRenderer,
  sanitizeDiagnostic,
  sourceSha256,
  validateMermaidFile,
} from "./validate.mjs";

const renderedFormats = new Set(["svg", "png", "pdf"]);
const sourceFormats = new Set(["code", "mmd", "markdown"]);
const allowedFormats = new Set([...renderedFormats, ...sourceFormats]);
const allowedDeliveryModes = new Set([
  "standard",
  "file-only",
  "external-composition",
]);
const allowedAltChannels = new Set([
  "handoff",
  "attachment",
  "metadata",
  "none",
]);
const defaultTimeoutMs = 30_000;
const maximumTimeoutMs = 120_000;
const renderHelp = `Usage:
  render.mjs --input <source.mmd> --format <svg|png|pdf|code|mmd|markdown> [options]
  render.mjs --input <source.mmd> --request-set <request-set.json> [--timeout-ms <100..120000>]
  render.mjs --help

Single-output options:
  --output <path>                 Required except for inline code
  --delivery-mode <standard|file-only|external-composition>
  --alt-channel <handoff|attachment|metadata|none>
  --consumer-version <version>   Host Mermaid version for source outputs
  --markdown-mode <native|static>
  --linked-assets <plan.json>    Required for static Markdown
  --timeout-ms <100..120000>     Bounds rendering only; setup has its own deadline

Writes JSON evidence to stdout. It creates only explicitly requested outputs
and never creates source, preview, accessibility, or evidence sidecars.
`;

export function decideAccessibility(
  format,
  deliveryMode = "standard",
  altChannel = "handoff",
) {
  if (!new Set(["png", "pdf"]).has(format)) {
    return { status: "not-needed", channel: "embedded" };
  }
  if (
    deliveryMode === "file-only" &&
    !new Set(["attachment", "metadata"]).has(altChannel)
  ) {
    return {
      status: "decision-needed",
      code: "file-only-accessibility",
      message:
        "File-only PNG/PDF delivery needs attachment alt text or supported metadata; a sidecar will not be created.",
    };
  }
  if (deliveryMode === "external-composition") {
    return { status: "ok", channel: "internal-handoff" };
  }
  return { status: "ok", channel: altChannel };
}

async function refuseExisting(path) {
  try {
    await stat(path);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  throw new MermaidCommandError(
    "output-exists",
    `Refusing to overwrite unrelated output: ${resolve(path)}`,
  );
}

async function writeExclusive(path, bytes) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  const handle = await open(absolute, "wx");
  try {
    await handle.writeFile(bytes);
  } finally {
    await handle.close();
  }
  return absolute;
}

function inspectSvg(bytes) {
  const source = bytes.toString("utf8");
  if (!/^\s*<svg\b/iu.test(source)) {
    throw new MermaidCommandError(
      "output-type",
      "Renderer did not produce SVG.",
    );
  }
  if (!/<title(?:\s|>)/iu.test(source) || !/<desc(?:\s|>)/iu.test(source)) {
    throw new MermaidCommandError(
      "svg-accessibility",
      "Rendered SVG must preserve title and description.",
    );
  }
  if (!/aria-labelledby=/iu.test(source)) {
    throw new MermaidCommandError(
      "svg-accessibility",
      "Rendered SVG must preserve ARIA relationships.",
    );
  }
  const viewBox = source.match(/viewBox=["']([^"']+)["']/iu)?.[1];
  if (!viewBox && !/\bwidth=["'][^"']+["'][\s\S]*\bheight=/iu.test(source)) {
    throw new MermaidCommandError(
      "output-bounds",
      "Rendered SVG has no readable bounds.",
    );
  }
  return { mediaType: "image/svg+xml", bytes: bytes.length, viewBox };
}

function inspectPng(bytes) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) {
    throw new MermaidCommandError(
      "output-type",
      "Renderer did not produce PNG.",
    );
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width === 0 || height === 0) {
    throw new MermaidCommandError(
      "output-bounds",
      "Rendered PNG has empty bounds.",
    );
  }
  return { mediaType: "image/png", bytes: bytes.length, width, height };
}

function inspectPdf(bytes) {
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new MermaidCommandError(
      "output-type",
      "Renderer did not produce PDF.",
    );
  }
  const source = bytes.toString("latin1");
  const pageCount = (source.match(/\/Type\s*\/Page\b/gu) ?? []).length;
  const mediaBox = source.match(/\/MediaBox\s*\[([^\]]+)\]/u)?.[1];
  if (pageCount < 1 || !mediaBox) {
    throw new MermaidCommandError(
      "output-bounds",
      "Rendered PDF has no page bounds.",
    );
  }
  return {
    mediaType: "application/pdf",
    bytes: bytes.length,
    pageCount,
    mediaBox,
  };
}

export function inspectRenderedOutput(format, bytes) {
  if (format === "svg") return inspectSvg(bytes);
  if (format === "png") return inspectPng(bytes);
  if (format === "pdf") return inspectPdf(bytes);
  throw new MermaidCommandError(
    "output-format",
    `Unsupported render format: ${format}`,
  );
}

function visualUnverified(format) {
  const checks = [
    "clipping-overlap",
    "contrast-readability",
    "non-latin-labels",
    "intended-size",
    "unexpected-network-observation",
  ];
  if (format === "png") checks.push("transparent-background");
  if (format === "pdf") checks.push("page-presentation");
  if (format === "svg") checks.push("responsive-320px-host");
  return checks.map((code) => ({
    code,
    message: `Actual-output ${code} inspection remains required.`,
  }));
}

function hostWarnings(format, consumerVersion, markdownMode) {
  if (!new Set(["code", "mmd", "markdown"]).has(format)) return [];
  if (format === "markdown" && markdownMode === "static") return [];
  if (consumerVersion === "11.16.0") return [];
  return [
    {
      code: "consumer-version-drift",
      message: consumerVersion
        ? `Consumer Mermaid ${consumerVersion} differs from tested 11.16.0.`
        : "Consumer Mermaid version is unknown; exact host rendering may drift from tested 11.16.0.",
    },
  ];
}

function decisionEvidence(format, decision) {
  return {
    schemaVersion: 1,
    skillContractVersion: 1,
    capability: "mermaid",
    operation: "render",
    requestedFormat: format,
    status: "decision-needed",
    warnings: [],
    unverified: [],
    errors: [{ code: decision.code, message: decision.message }],
    deliverables: [],
  };
}

function validateLinkedAssets(specification) {
  const mode = specification.markdownMode ?? "native";
  if (mode === "native") {
    if (specification.linkedAssets?.length) {
      throw new MermaidCommandError(
        "markdown-assets",
        "Native Mermaid Markdown may not declare static linked assets.",
      );
    }
    return [];
  }
  if (mode !== "static") {
    throw new MermaidCommandError(
      "markdown-mode",
      "Markdown mode must be native or static.",
    );
  }
  const assets = specification.linkedAssets;
  if (!Array.isArray(assets) || assets.length < 1 || assets.length > 8) {
    throw new MermaidCommandError(
      "markdown-assets",
      "Static Markdown requires 1 through 8 explicitly requested linked assets.",
    );
  }
  const paths = [];
  for (const asset of assets) {
    if (
      !asset ||
      typeof asset !== "object" ||
      Array.isArray(asset) ||
      Object.keys(asset).some(
        (key) => !new Set(["format", "output"]).has(key),
      ) ||
      !new Set(["svg", "png"]).has(asset.format) ||
      typeof asset.output !== "string" ||
      asset.output.length === 0
    ) {
      throw new MermaidCommandError(
        "markdown-assets",
        "Each static Markdown asset must contain only format (svg or png) and a non-empty output path.",
      );
    }
    paths.push(resolve(asset.output));
  }
  if (new Set(paths).size !== paths.length) {
    throw new MermaidCommandError(
      "markdown-assets",
      "Static Markdown linked asset paths must be unique.",
    );
  }
  if (paths.includes(resolve(specification.output))) {
    throw new MermaidCommandError(
      "markdown-assets",
      "Markdown and linked asset output paths must be distinct.",
    );
  }
  return assets;
}

function markdownLink(markdownPath, assetPath) {
  const path = relative(dirname(resolve(markdownPath)), resolve(assetPath));
  if (!path || path === ".." || path.startsWith(`..${sep}`)) {
    throw new MermaidCommandError(
      "markdown-link",
      "Static Markdown assets must stay in or below the Markdown directory.",
    );
  }
  return path
    .split(sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function markdownAlt(value) {
  return value.replaceAll("\\", "\\\\").replaceAll("]", "\\]");
}

async function renderStaticMarkdown(
  prepared,
  evidence,
  specification,
  linkedAssets,
  options,
) {
  const files = [];
  const deliverables = [];
  const lines = [];
  for (const asset of linkedAssets) {
    try {
      const rendered = await runVerifiedRenderer(
        prepared.runtime,
        prepared.source,
        asset.format,
        sourceSha256(prepared.source),
        {
          ...options,
          accessibility: prepared.inspection.accessibility,
        },
      );
      const inspection = inspectRenderedOutput(asset.format, rendered.bytes);
      const output = await writeExclusive(asset.output, rendered.bytes);
      const link = markdownLink(specification.output, output);
      const alt = markdownAlt(prepared.inspection.accessibility.description);
      lines.push(`![${alt}](${link})`);
      const file = {
        path: output,
        format: asset.format,
        status: "ok",
        coPrimary: true,
        link,
        altText: prepared.inspection.accessibility.description,
        inspection: {
          ...inspection,
          accessibilityRepair: rendered.accessibilityRepair,
        },
      };
      files.push(file);
      deliverables.push({
        path: output,
        format: asset.format,
        primary: true,
        coPrimary: true,
      });
      evidence.unverified.push(
        ...visualUnverified(asset.format).map((finding) => ({
          ...finding,
          code: `${asset.format}-${finding.code}`,
        })),
      );
    } catch (error) {
      files.push({
        path: resolve(asset.output),
        format: asset.format,
        status: "error",
        error: { code: error.code ?? "unexpected", message: error.message },
      });
    }
  }

  const failed = files.filter((file) => file.status !== "ok");
  if (failed.length > 0) {
    evidence.status = "partial";
    evidence.deliverables = deliverables;
    evidence.files = [
      {
        path: resolve(specification.output),
        format: "markdown",
        status: "not-created",
        reason: "linked-asset-failure",
      },
      ...files,
    ];
    evidence.requestedCount = linkedAssets.length + 1;
    evidence.completedCount = deliverables.length;
    evidence.errors = [
      {
        code: "markdown-asset-partial",
        message:
          "Static Markdown was not created because at least one explicitly requested linked asset failed.",
      },
    ];
    evidence.markdown = {
      mode: "static",
      linksVerified: false,
      requestedLinkedAssets: linkedAssets.length,
      completedLinkedAssets: deliverables.length,
    };
    return evidence;
  }

  const markdown = `${lines.join("\n\n")}\n`;
  const markdownOutput = await writeExclusive(specification.output, markdown);
  for (const file of files) await stat(file.path);
  const markdownFile = {
    path: markdownOutput,
    format: "markdown",
    status: "ok",
    coPrimary: true,
  };
  evidence.deliverables = [
    {
      path: markdownOutput,
      format: "markdown",
      primary: true,
      coPrimary: true,
    },
    ...deliverables,
  ];
  evidence.files = [markdownFile, ...files];
  evidence.requestedCount = linkedAssets.length + 1;
  evidence.completedCount = linkedAssets.length + 1;
  evidence.markdown = {
    mode: "static",
    testedMermaidVersion: "11.16.0",
    linksVerified: true,
    requestedLinkedAssets: linkedAssets.length,
    completedLinkedAssets: linkedAssets.length,
  };
  return evidence;
}

export async function renderOne(inputPath, specification, options = {}) {
  const format = specification.format;
  if (!allowedFormats.has(format)) {
    throw new MermaidCommandError(
      "output-format",
      `Unsupported Mermaid output format: ${format}`,
    );
  }
  const deliveryMode = specification.deliveryMode ?? "standard";
  const altChannel = specification.altChannel ?? "handoff";
  if (!allowedDeliveryModes.has(deliveryMode)) {
    throw new MermaidCommandError("cli-usage", "Invalid delivery mode.");
  }
  if (!allowedAltChannels.has(altChannel)) {
    throw new MermaidCommandError(
      "cli-usage",
      "Invalid accessibility channel.",
    );
  }
  const accessibility = decideAccessibility(format, deliveryMode, altChannel);
  if (accessibility.status === "decision-needed") {
    return decisionEvidence(format, accessibility);
  }
  if (format !== "code" && !specification.output) {
    throw new MermaidCommandError(
      "cli-usage",
      `--output is required for ${format}.`,
    );
  }
  if (specification.output) await refuseExisting(specification.output);
  const linkedAssets =
    format === "markdown" ? validateLinkedAssets(specification) : [];
  for (const asset of linkedAssets) await refuseExisting(asset.output);

  const prepared = await validateMermaidFile(inputPath, {
    ...options,
    probe:
      sourceFormats.has(format) &&
      !(format === "markdown" && specification.markdownMode === "static"),
  });
  const evidence = {
    ...prepared.evidence,
    operation: "render",
    requestedFormat: format,
    deliveryMode,
    accessibility: {
      ...accessibility,
      textAlternative: prepared.inspection.accessibility.description,
    },
    deliverables: [],
  };
  evidence.warnings.push(
    ...hostWarnings(
      format,
      specification.consumerVersion,
      specification.markdownMode ?? "native",
    ),
  );

  if (format === "code") {
    evidence.artifact = {
      kind: "inline-mermaid-code",
      content: `\`\`\`mermaid\n${prepared.source}\`\`\``,
    };
    return evidence;
  }

  if (format === "mmd") {
    const output = await writeExclusive(specification.output, prepared.source);
    evidence.deliverables.push({ path: output, format, primary: true });
    return evidence;
  }

  if (format === "markdown") {
    if ((specification.markdownMode ?? "native") === "static") {
      return renderStaticMarkdown(
        prepared,
        evidence,
        specification,
        linkedAssets,
        options,
      );
    }
    const markdown = `\`\`\`mermaid\n${prepared.source}\`\`\`\n`;
    const output = await writeExclusive(specification.output, markdown);
    evidence.deliverables.push({ path: output, format, primary: true });
    evidence.markdown = {
      mode: "native",
      testedMermaidVersion: "11.16.0",
      linksVerified: true,
    };
    return evidence;
  }

  const rendered = await runVerifiedRenderer(
    prepared.runtime,
    prepared.source,
    format,
    sourceSha256(prepared.source),
    {
      ...options,
      accessibility: prepared.inspection.accessibility,
    },
  );
  const inspection = inspectRenderedOutput(format, rendered.bytes);
  const output = await writeExclusive(specification.output, rendered.bytes);
  evidence.deliverables.push({ path: output, format, primary: true });
  evidence.render = {
    status: "passed",
    ...inspection,
    accessibilityRepair: rendered.accessibilityRepair,
    ...(format === "pdf" ? { pdfFit: "passed-pinned-cli" } : {}),
  };
  evidence.unverified = visualUnverified(format);
  if (deliveryMode === "external-composition") {
    evidence.ownership = {
      outerCapabilityOwnsFinalArtifact: true,
      combinedHtmlContract: false,
      internalInput: true,
      userDeliverable: false,
    };
    evidence.deliverables[0].primary = false;
    evidence.deliverables[0].internal = true;
  }
  return evidence;
}

function parseArguments(arguments_) {
  const values = {};
  const known = new Set([
    "--input",
    "--format",
    "--output",
    "--request-set",
    "--delivery-mode",
    "--alt-channel",
    "--consumer-version",
    "--markdown-mode",
    "--linked-assets",
    "--timeout-ms",
  ]);
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (
      !known.has(flag) ||
      value === undefined ||
      Object.hasOwn(values, flag)
    ) {
      throw new MermaidCommandError(
        "cli-usage",
        "Invalid or duplicate render option.",
      );
    }
    values[flag] = value;
  }
  if (!values["--input"]) {
    throw new MermaidCommandError("cli-usage", "--input is required.");
  }
  const timeoutMs = Number(values["--timeout-ms"] ?? defaultTimeoutMs);
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
  if (values["--request-set"]) {
    const incompatible = [
      "--format",
      "--output",
      "--delivery-mode",
      "--alt-channel",
      "--consumer-version",
      "--markdown-mode",
      "--linked-assets",
    ].filter((flag) => values[flag] !== undefined);
    if (incompatible.length > 0) {
      throw new MermaidCommandError(
        "cli-usage",
        `--request-set cannot be combined with single-output options: ${incompatible.join(", ")}.`,
      );
    }
    return {
      input: values["--input"],
      requestSet: values["--request-set"],
      timeoutMs,
    };
  }
  if (!values["--format"]) {
    throw new MermaidCommandError("cli-usage", "--format is required.");
  }
  const format = values["--format"];
  if (format === "code" && values["--output"] !== undefined) {
    throw new MermaidCommandError(
      "cli-usage",
      "Inline code does not accept --output.",
    );
  }
  if (values["--markdown-mode"] !== undefined && format !== "markdown") {
    throw new MermaidCommandError(
      "cli-usage",
      "--markdown-mode is valid only with --format markdown.",
    );
  }
  if (
    values["--linked-assets"] !== undefined &&
    (format !== "markdown" || values["--markdown-mode"] !== "static")
  ) {
    throw new MermaidCommandError(
      "cli-usage",
      "--linked-assets requires --format markdown --markdown-mode static.",
    );
  }
  return {
    input: values["--input"],
    timeoutMs,
    outputs: [
      {
        format,
        output: values["--output"],
        deliveryMode: values["--delivery-mode"],
        altChannel: values["--alt-channel"],
        consumerVersion: values["--consumer-version"],
        markdownMode: values["--markdown-mode"],
        linkedAssetsPath: values["--linked-assets"],
      },
    ],
  };
}

async function loadRequestSet(path) {
  const bytes = await readFile(path);
  if (bytes.length > 100_000) {
    throw new MermaidCommandError("request-set", "Request set is too large.");
  }
  const plan = JSON.parse(bytes.toString("utf8"));
  if (
    !plan ||
    typeof plan !== "object" ||
    Array.isArray(plan) ||
    Object.keys(plan).some((key) => key !== "outputs") ||
    !Array.isArray(plan.outputs) ||
    plan.outputs.length < 2 ||
    plan.outputs.length > 8
  ) {
    throw new MermaidCommandError(
      "request-set",
      "A co-primary request set must contain 2 through 8 outputs.",
    );
  }
  const allowedKeys = new Set([
    "format",
    "output",
    "deliveryMode",
    "altChannel",
    "consumerVersion",
    "markdownMode",
    "linkedAssets",
    "linkedAssetsPath",
  ]);
  for (const specification of plan.outputs) {
    if (
      !specification ||
      typeof specification !== "object" ||
      Array.isArray(specification) ||
      Object.keys(specification).some((key) => !allowedKeys.has(key)) ||
      !allowedFormats.has(specification.format) ||
      (specification.format !== "code" &&
        (typeof specification.output !== "string" ||
          specification.output.length === 0)) ||
      (specification.format === "code" && specification.output !== undefined) ||
      (specification.consumerVersion !== undefined &&
        typeof specification.consumerVersion !== "string") ||
      (specification.linkedAssetsPath !== undefined &&
        (typeof specification.linkedAssetsPath !== "string" ||
          specification.linkedAssetsPath.length === 0)) ||
      (specification.linkedAssets !== undefined &&
        !Array.isArray(specification.linkedAssets)) ||
      (specification.markdownMode !== undefined &&
        specification.format !== "markdown") ||
      ((specification.linkedAssets !== undefined ||
        specification.linkedAssetsPath !== undefined) &&
        (specification.format !== "markdown" ||
          specification.markdownMode !== "static")) ||
      (specification.linkedAssets !== undefined &&
        specification.linkedAssetsPath !== undefined)
    ) {
      throw new MermaidCommandError(
        "request-set",
        "Each output must match the exact documented request-set specification schema.",
      );
    }
  }
  const paths = plan.outputs
    .filter((item) => item.output)
    .map((item) => resolve(item.output));
  if (new Set(paths).size !== paths.length) {
    throw new MermaidCommandError(
      "request-set",
      "Co-primary output paths must be unique.",
    );
  }
  return plan.outputs;
}

async function loadLinkedAssets(path) {
  const bytes = await readFile(path);
  if (bytes.length > 100_000) {
    throw new MermaidCommandError(
      "markdown-assets",
      "Linked asset plan is too large.",
    );
  }
  const plan = JSON.parse(bytes.toString("utf8"));
  if (
    !plan ||
    typeof plan !== "object" ||
    Array.isArray(plan) ||
    Object.keys(plan).some((key) => key !== "assets") ||
    !Array.isArray(plan.assets)
  ) {
    throw new MermaidCommandError(
      "markdown-assets",
      "Linked-assets JSON must contain exactly one assets array.",
    );
  }
  return plan.assets;
}

function validateGlobalOutputPaths(outputs) {
  const paths = [];
  for (const specification of outputs) {
    if (specification.output) paths.push(resolve(specification.output));
    for (const asset of specification.linkedAssets ?? []) {
      if (asset.output) paths.push(resolve(asset.output));
    }
  }
  if (new Set(paths).size !== paths.length) {
    throw new MermaidCommandError(
      "request-set",
      "Every requested output and linked asset path must be unique.",
    );
  }
}

function errorEvidence(error) {
  const details = errorDetailsForEvidence(error.details);
  return {
    schemaVersion: 1,
    skillContractVersion: 1,
    capability: "mermaid",
    operation: "render",
    status: "error",
    warnings: [],
    unverified: [],
    deliverables: [],
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
    process.stdout.write(renderHelp);
    return 0;
  }
  try {
    const parsed = parseArguments(arguments_);
    const outputs = parsed.requestSet
      ? await loadRequestSet(parsed.requestSet)
      : parsed.outputs;
    const specifications = [];
    for (const unresolvedSpecification of outputs) {
      const specification = { ...unresolvedSpecification };
      if (specification.linkedAssetsPath) {
        specification.linkedAssets = await loadLinkedAssets(
          specification.linkedAssetsPath,
        );
      }
      specifications.push(specification);
    }
    validateGlobalOutputPaths(specifications);
    const items = [];
    for (const specification of specifications) {
      try {
        items.push(
          await renderOne(parsed.input, specification, {
            timeoutMs: parsed.timeoutMs,
          }),
        );
      } catch (error) {
        items.push(errorEvidence(error));
      }
    }
    if (items.length === 1) {
      process.stdout.write(`${JSON.stringify(items[0])}\n`);
      return items[0].status === "ok" ? 0 : 1;
    }
    const complete = items.every((item) => item.status === "ok");
    const unverifiedByFinding = new Map();
    for (const item of items) {
      for (const finding of item.unverified ?? []) {
        const key = `${finding.code}\u0000${finding.message}`;
        const existing = unverifiedByFinding.get(key);
        const requestedFormat = item.requestedFormat;
        if (existing) {
          if (
            requestedFormat &&
            !existing.requestedFormats.includes(requestedFormat)
          ) {
            existing.requestedFormats.push(requestedFormat);
          }
        } else {
          unverifiedByFinding.set(key, {
            ...finding,
            requestedFormats: requestedFormat ? [requestedFormat] : [],
          });
        }
      }
    }
    const unverified = [...unverifiedByFinding.values()];
    const status = !complete
      ? "partial"
      : unverified.length > 0
        ? "unverified"
        : "ok";
    const setEvidence = {
      schemaVersion: 1,
      skillContractVersion: 1,
      capability: "mermaid",
      operation: "render-set",
      status,
      requestedCount: items.length,
      completedCount: items.filter((item) => item.status === "ok").length,
      items,
      warnings: [],
      unverified,
      errors: complete
        ? []
        : [
            {
              code: "co-primary-partial",
              message:
                "At least one requested co-primary output failed or needs a decision.",
            },
          ],
    };
    process.stdout.write(`${JSON.stringify(setEvidence)}\n`);
    return complete ? 0 : 1;
  } catch (error) {
    process.stdout.write(`${JSON.stringify(errorEvidence(error))}\n`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await main();
}
