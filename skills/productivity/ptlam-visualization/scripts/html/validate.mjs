#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HtmlValidationReport,
  validateHtmlDocument,
} from "./validation/validate-document.mjs";

const usage = () =>
  "Usage: node skills/productivity/ptlam-visualization/scripts/html/validate.mjs <html-path>";

export { HtmlValidationReport, validateHtmlDocument };

export async function main(arguments_ = process.argv.slice(2)) {
  if (
    arguments_.length === 1 &&
    (arguments_[0] === "--help" || arguments_[0] === "-h")
  ) {
    console.log(usage());
    return 0;
  }

  if (arguments_.length !== 1 || arguments_[0].startsWith("-")) {
    const report = new HtmlValidationReport();
    report.error(
      "cli-usage",
      `${usage()} Exactly one positional HTML path is required.`,
    );
    report.print();
    return 1;
  }

  const report = await validateHtmlDocument(arguments_[0]);
  report.print();
  return report.count("ERROR") > 0 ? 1 : 0;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
