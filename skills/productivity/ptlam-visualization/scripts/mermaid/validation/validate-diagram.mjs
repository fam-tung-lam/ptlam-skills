import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MermaidCommandError } from "../internal/command-error.mjs";
import {
  EXPECTED_MERMAID_VERSION,
  inspectMermaidSource,
  loadActiveManifest,
  normalizeMermaidSource,
  sourceSha256,
} from "./source-contract.mjs";
import {
  ensureVerifiedRuntime,
  runVerifiedRenderer,
} from "./runtime-adapter.mjs";

export { MermaidCommandError } from "../internal/command-error.mjs";
export {
  EXPECTED_MERMAID_VERSION,
  inspectMermaidSource,
  loadActiveManifest,
  normalizeMermaidSource,
  sourceSha256,
} from "./source-contract.mjs";
export {
  ensureVerifiedRuntime,
  errorDetailsForEvidence,
  postprocessSvgAccessibility,
  runVerifiedRenderer,
  sanitizeDiagnostic,
} from "./runtime-adapter.mjs";

// Evidence contract: report validation through stable, path-safe JSON values.
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
      message: `${inspection.family} is ${inspection.maturity} in Mermaid ${EXPECTED_MERMAID_VERSION}.`,
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
