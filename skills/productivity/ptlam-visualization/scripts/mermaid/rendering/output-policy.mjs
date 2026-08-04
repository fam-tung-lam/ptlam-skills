import { MermaidCommandError } from "../internal/command-error.mjs";

const ACCESSIBILITY_REQUIRED_FORMATS = new Set(["png", "pdf"]);
const SOURCE_FORMATS = new Set(["code", "mmd", "markdown"]);

export function decideAccessibility(
  format,
  deliveryMode = "standard",
  altChannel = "handoff",
) {
  if (!ACCESSIBILITY_REQUIRED_FORMATS.has(format)) {
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

export function visualUnverified(format) {
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

export function hostWarnings(format, consumerVersion, markdownMode) {
  if (!SOURCE_FORMATS.has(format)) return [];
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

export function decisionEvidence(format, decision) {
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
