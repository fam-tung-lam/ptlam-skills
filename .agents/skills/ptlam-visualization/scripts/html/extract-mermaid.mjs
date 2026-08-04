#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { link, lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EmbeddedMermaidRecordError,
  parseEmbeddedMermaidRecords,
} from "./lib/embedded-mermaid-record.mjs";

class ExtractError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function usage() {
  return (
    "Usage: extract-mermaid.mjs --input <html> --list | " +
    "--input <html> --diagram <id> --output <path>"
  );
}

function parseArguments(arguments_) {
  if (arguments_.length === 1 && ["--help", "-h"].includes(arguments_[0])) {
    return { help: true };
  }
  const values = {};
  const valueFlags = new Map([
    ["--input", "input"],
    ["--diagram", "diagram"],
    ["--output", "output"],
  ]);
  for (let index = 0; index < arguments_.length; index += 1) {
    const flag = arguments_[index];
    if (flag === "--list") {
      if (values.list)
        throw new ExtractError("cli-usage", `Repeated --list. ${usage()}`);
      values.list = true;
      continue;
    }
    const key = valueFlags.get(flag);
    const value = arguments_[index + 1];
    if (!key || value === undefined || value.startsWith("--")) {
      throw new ExtractError(
        "cli-usage",
        `Invalid argument ${flag}. ${usage()}`,
      );
    }
    if (Object.hasOwn(values, key)) {
      throw new ExtractError("cli-usage", `Repeated ${flag}. ${usage()}`);
    }
    values[key] = value;
    index += 1;
  }
  if (!values.input || values.input.includes("\0")) {
    throw new ExtractError("cli-usage", `--input is required. ${usage()}`);
  }
  if (values.list) {
    if (values.diagram || values.output) {
      throw new ExtractError(
        "cli-usage",
        `--list cannot write output. ${usage()}`,
      );
    }
  } else if (
    !values.diagram ||
    !values.output ||
    values.output.includes("\0")
  ) {
    throw new ExtractError(
      "cli-usage",
      `--diagram and --output are required. ${usage()}`,
    );
  }
  return values;
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function writeExclusive(outputPath, source) {
  await mkdir(dirname(outputPath), { recursive: true });
  if (await exists(outputPath)) {
    throw new ExtractError(
      "output-exists",
      `Refusing to overwrite ${outputPath}.`,
    );
  }
  const temporaryPath = resolve(
    dirname(outputPath),
    `.${basename(outputPath)}.ptv-${process.pid}-${randomUUID()}.tmp`,
  );
  let handle;
  try {
    handle = await open(temporaryPath, "wx", 0o644);
    await handle.writeFile(source, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await link(temporaryPath, outputPath).catch((error) => {
      if (error.code === "EEXIST") {
        throw new ExtractError(
          "output-exists",
          `Refusing to overwrite ${outputPath}.`,
        );
      }
      throw error;
    });
  } finally {
    await handle?.close().catch(() => {});
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    const inputPath = resolve(options.input);
    const bytes = await readFile(inputPath).catch((error) => {
      throw new ExtractError(
        "input",
        `Cannot read ${inputPath}: ${error.message}`,
      );
    });
    let html;
    try {
      html = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new ExtractError("input-utf8", `${inputPath} is not valid UTF-8.`);
    }
    const records = await parseEmbeddedMermaidRecords(html);
    if (options.list) {
      console.log(
        JSON.stringify({
          schemaVersion: 1,
          diagrams: records.map(
            ({ diagramId, sourceSha256, mermaidVersion, capsuleId }) => ({
              diagramId,
              sourceSha256,
              mermaidVersion,
              capsuleId,
            }),
          ),
        }),
      );
      return;
    }
    const matches = records.filter(
      (record) => record.diagramId === options.diagram,
    );
    if (matches.length !== 1) {
      throw new ExtractError(
        "diagram",
        `Expected one embedded Mermaid record for ${options.diagram}; found ${matches.length}.`,
      );
    }
    const outputPath = resolve(options.output);
    await writeExclusive(outputPath, matches[0].source);
    console.log(
      JSON.stringify({
        schemaVersion: 1,
        diagramId: matches[0].diagramId,
        sourceSha256: matches[0].sourceSha256,
        output: outputPath,
      }),
    );
  } catch (error) {
    const code =
      error instanceof ExtractError ||
      error instanceof EmbeddedMermaidRecordError
        ? error.code
        : "extract";
    console.error(`ERROR [${code}] ${error.message}`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) await main();
