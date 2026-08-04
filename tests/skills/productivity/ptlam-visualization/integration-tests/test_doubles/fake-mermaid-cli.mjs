#!/usr/bin/env node

// Fake only the external Mermaid CLI process; production orchestration stays real.
import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";

const valueAfter = (flag) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const input = valueAfter("--input");
const output = valueAfter("--output");
const source = await readFile(input, "utf8");
const format = extname(output).slice(1);

if (format === "pdf" && !process.argv.includes("--pdfFit")) {
  process.stderr.write("synthetic PDF render requires --pdfFit\n");
  process.exit(4);
}

if (source.includes("HANG_RENDER")) {
  await new Promise(() => setInterval(() => {}, 1_000));
}
if (
  source.includes("FAIL_RENDER") ||
  (format === "pdf" && source.includes("FAIL_PDF")) ||
  (format === "png" && source.includes("FAIL_PNG"))
) {
  if (source.includes("LEAK_PRIVATE_PATHS")) {
    process.stderr.write(
      "Parse error in file:///private/var/folders/account/ptlam-mermaid-render-secret/source.mmd\n",
    );
    process.stderr.write(
      "at /Users/private-account/Library/Caches/ptlam/runtime/fake-cli.mjs\n",
    );
    process.stderr.write(
      "at https://mermaid-cli-intercept.invalid/%2FUsers%2Fprivate-account%2FLibrary%2FCaches%2Fptlam%2Fcli.mjs\n",
    );
    process.stderr.write("Unexpected token on line 9; expected NODE\n");
  } else {
    process.stderr.write(`synthetic ${format} failure\n`);
  }
  process.exitCode = 2;
} else if (format === "svg") {
  const title = source.match(/^\s*accTitle:\s*(.+)$/mu)?.[1];
  const description = source.match(/^\s*accDescr:\s*(.+)$/mu)?.[1];
  if (source.includes("FAKE_NO_SVG_SEMANTICS") || !title || !description) {
    await writeFile(
      output,
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><rect width="320" height="120"/></svg>',
    );
  } else if (source.includes("FAKE_PARTIAL_SVG_SEMANTICS")) {
    await writeFile(
      output,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><title>${title ?? "Partial"}</title><rect width="320" height="120"/></svg>`,
    );
  } else {
    await writeFile(
      output,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${description}</desc><rect width="320" height="120"/></svg>`,
    );
  }
} else if (format === "png") {
  const bytes = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes, 0);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(320, 16);
  bytes.writeUInt32BE(120, 20);
  await writeFile(output, bytes);
} else if (format === "pdf") {
  await writeFile(
    output,
    "%PDF-1.7\n1 0 obj << /Type /Page /MediaBox [0 0 320 120] >> endobj\n%%EOF\n",
  );
} else {
  process.stderr.write(`unsupported synthetic format ${format}\n`);
  process.exitCode = 3;
}
