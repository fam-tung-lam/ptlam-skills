#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  errorDetailsForEvidence,
  MermaidCommandError,
  sanitizeDiagnostic,
  validateMermaidFile,
} from "./validation/validate-diagram.mjs";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAXIMUM_TIMEOUT_MS = 120_000;
const HELP = `Usage:
  validate.mjs <source.mmd> [--timeout-ms <100..120000>]
  validate.mjs --help

Validates normalized Mermaid source against the pinned 11.16.0 catalog,
verifies the locked runtime capsule, performs one SVG parse/render probe, and
writes JSON evidence to stdout. No output or evidence sidecar is created.
--timeout-ms bounds only the render probe; lazy runtime setup keeps its separate
installation deadline and cleanup grace.
`;

export * from "./validation/validate-diagram.mjs";

function parseArguments(arguments_) {
  if (arguments_.length === 0) {
    throw new MermaidCommandError(
      "cli-usage",
      "Usage: validate.mjs <source.mmd> [--timeout-ms <100..120000>]",
    );
  }
  const inputPath = arguments_[0];
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  for (let index = 1; index < arguments_.length; index += 2) {
    if (arguments_[index] !== "--timeout-ms" || !arguments_[index + 1]) {
      throw new MermaidCommandError("cli-usage", "Unknown validate option.");
    }
    timeoutMs = Number(arguments_[index + 1]);
  }
  if (
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 100 ||
    timeoutMs > MAXIMUM_TIMEOUT_MS
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
    process.stdout.write(HELP);
    return 0;
  }
  try {
    const options = parseArguments(arguments_);
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
