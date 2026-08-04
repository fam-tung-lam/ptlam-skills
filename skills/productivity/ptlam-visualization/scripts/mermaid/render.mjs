#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MermaidCommandError } from "./internal/command-error.mjs";
import {
  errorDetailsForEvidence,
  sanitizeDiagnostic,
} from "./validation/validate-diagram.mjs";
import { allowedFormats, renderOne } from "./rendering/render-output.mjs";

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

export {
  decideAccessibility,
  inspectRenderedOutput,
} from "./rendering/output-policy.mjs";
export { renderOne } from "./rendering/render-output.mjs";

// Command adapter: decode one CLI request into one or more output specifications.
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
