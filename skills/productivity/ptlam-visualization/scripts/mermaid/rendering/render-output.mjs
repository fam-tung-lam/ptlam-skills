import { mkdir, open, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { MermaidCommandError } from "../internal/command-error.mjs";
import {
  runVerifiedRenderer,
  sourceSha256,
  validateMermaidFile,
} from "../validation/validate-diagram.mjs";
import {
  decideAccessibility,
  decisionEvidence,
  hostWarnings,
  inspectRenderedOutput,
  visualUnverified,
} from "./output-policy.mjs";

const renderedFormats = new Set(["svg", "png", "pdf"]);
const sourceFormats = new Set(["code", "mmd", "markdown"]);
export const allowedFormats = new Set([...renderedFormats, ...sourceFormats]);
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

// Filesystem adapter: every requested deliverable is exclusive and explicit.
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

// Use case: turn one validated source and one output specification into evidence.
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
