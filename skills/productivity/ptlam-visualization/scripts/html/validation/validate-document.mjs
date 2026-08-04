import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { HtmlValidationReport } from "./report.mjs";

export { HtmlValidationReport } from "./report.mjs";
import { scanHtml } from "./html-source.mjs";
import { validateDocumentContract } from "./document-contract.mjs";
import { validateDocumentResources } from "./resource-contract.mjs";

const TOTAL_WARNING_BYTES = 25 * 1024 * 1024;
function addBrowserUnverifiedFindings(report) {
  report.unverified(
    "browser-ids-fragments",
    "Unique IDs and local fragment targets require browser-DOM validation.",
  );
  report.unverified(
    "browser-landmarks-headings",
    "Essential semantic landmarks and heading order require browser-DOM validation.",
  );
  report.unverified(
    "browser-control-names",
    "Interactive controls and their accessible names require browser-DOM validation.",
  );
  report.unverified(
    "browser-layout",
    "Responsive layout, horizontal overflow, clipping, and rendered assets require real-browser validation.",
  );
  report.unverified(
    "browser-interaction",
    "Keyboard behavior, visible focus, reduced motion, and console behavior require real-browser validation.",
  );
}

// Use case: validate one artifact and return evidence without printing or exiting.
export async function validateHtmlDocument(htmlArgument) {
  const report = new HtmlValidationReport();
  const htmlPath = resolve(htmlArgument);
  let fileInfo;
  let bytes;

  try {
    fileInfo = await stat(htmlPath);
    if (!fileInfo.isFile()) {
      report.error(
        "input-path",
        `HTML path "${htmlArgument}" is not a regular file.`,
      );
      return report;
    }
    bytes = await readFile(htmlPath);
  } catch (error) {
    report.error(
      "input-path",
      `Cannot read HTML path "${htmlArgument}": ${error.message}`,
    );
    return report;
  }

  report.totalBytes = fileInfo.size;
  if (bytes.length === 0) {
    report.error("input-readability", `HTML file "${htmlArgument}" is empty.`);
    return report;
  }

  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    report.error(
      "input-readability",
      `HTML file "${htmlArgument}" is not valid UTF-8: ${error.message}`,
    );
    return report;
  }
  if (source.includes("\u0000")) {
    report.error(
      "input-readability",
      `HTML file "${htmlArgument}" contains a NUL byte.`,
    );
    return report;
  }

  const scan = scanHtml(source);
  for (const error of scan.errors) {
    report.error("html-syntax", error);
  }
  if (scan.ambiguities.length > 0) {
    report.unverified(
      "source-syntax",
      `${scan.ambiguities.length} complex or ambiguous source construct(s) prevent complete static conclusions. First finding: ${scan.ambiguities[0]}`,
    );
  }

  await validateDocumentContract(report, scan, source);

  await validateDocumentResources(report, scan, htmlPath);

  if (report.totalBytes > TOTAL_WARNING_BYTES) {
    report.warning(
      "total-size",
      `Artifact HTML plus readable local assets total ${report.totalBytes} bytes, above the 25 MB threshold.`,
    );
  }

  addBrowserUnverifiedFindings(report);
  return report;
}
