#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { link, lstat, mkdir, open, readFile, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const designSystemDirectory = resolve(
  scriptDirectory,
  "../assets/design-system",
);
const templatePath = resolve(designSystemDirectory, "templates/document.html");
const requiredStylePaths = [
  "tokens/tokens.css",
  "foundations/base.css",
  "foundations/layout.css",
  "foundations/accessibility.css",
  "foundations/print.css",
];
const languageTagPattern = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;

class ScaffoldError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function usage() {
  return (
    "Usage: node skills/productivity/ptlam-visualization-with-html/scripts/scaffold.mjs " +
    "--title <title> --lang <language-tag> --output <html-path>"
  );
}

function parseArguments(arguments_) {
  if (
    arguments_.length === 1 &&
    (arguments_[0] === "--help" || arguments_[0] === "-h")
  ) {
    return { help: true };
  }

  const knownFlags = new Map([
    ["--title", "title"],
    ["--lang", "lang"],
    ["--output", "output"],
  ]);
  const values = {};

  for (let index = 0; index < arguments_.length; index += 1) {
    const flag = arguments_[index];
    const key = knownFlags.get(flag);
    if (!key) {
      throw new ScaffoldError(
        "cli-usage",
        `Unknown argument "${flag}". ${usage()}`,
      );
    }
    if (Object.hasOwn(values, key)) {
      throw new ScaffoldError(
        "cli-usage",
        `Argument "${flag}" may be provided only once. ${usage()}`,
      );
    }

    const value = arguments_[index + 1];
    if (value === undefined || knownFlags.has(value)) {
      throw new ScaffoldError(
        "cli-usage",
        `Argument "${flag}" requires a value. ${usage()}`,
      );
    }
    values[key] = value;
    index += 1;
  }

  for (const [flag, key] of knownFlags) {
    if (!Object.hasOwn(values, key)) {
      throw new ScaffoldError(
        "cli-usage",
        `Missing required argument "${flag}". ${usage()}`,
      );
    }
  }

  if (values.title.trim() === "") {
    throw new ScaffoldError(
      "cli-value",
      "The --title value must not be blank.",
    );
  }
  if (!languageTagPattern.test(values.lang)) {
    throw new ScaffoldError(
      "cli-value",
      `The --lang value "${values.lang}" is not a well-formed language tag.`,
    );
  }
  if (values.output.trim() === "" || values.output.includes("\0")) {
    throw new ScaffoldError(
      "cli-value",
      "The --output value must be a non-empty filesystem path.",
    );
  }

  return values;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function replaceSlot(source, slot, replacement) {
  const marker = `PTV_SLOT:${slot}`;
  const wrappedMarker =
    slot === "STYLES" ? `/* ${marker} */` : `<!-- ${marker} -->`;
  const occurrences = source.split(wrappedMarker).length - 1;
  if (occurrences !== 1) {
    throw new ScaffoldError(
      "assembly",
      `Template must contain exactly one ${wrappedMarker} marker; found ${occurrences}.`,
    );
  }

  return source.replace(wrappedMarker, replacement);
}

function replacePlaceholder(source, placeholder, replacement, expectedCount) {
  const occurrences = source.split(placeholder).length - 1;
  if (occurrences !== expectedCount) {
    throw new ScaffoldError(
      "assembly",
      `Template must contain ${expectedCount} ${placeholder} placeholder(s); found ${occurrences}.`,
    );
  }
  return source.replaceAll(placeholder, replacement);
}

async function assembleDocument({ title, lang }) {
  let template;
  let styles;

  try {
    [template, styles] = await Promise.all([
      readFile(templatePath, "utf8"),
      Promise.all(
        requiredStylePaths.map((relativePath) =>
          readFile(resolve(designSystemDirectory, relativePath), "utf8"),
        ),
      ),
    ]);
  } catch (error) {
    throw new ScaffoldError(
      "assembly",
      `Cannot read the bundled starter resources: ${error.message}`,
    );
  }

  const escapedTitle = escapeHtml(title);
  const escapedLanguage = escapeHtml(lang);
  let document = template;
  document = replaceSlot(document, "STYLES", styles.join("\n\n"));
  document = replaceSlot(document, "CONTENT", "");
  document = replaceSlot(document, "SCRIPTS", "");
  document = replacePlaceholder(document, "{{PTV_LANG}}", escapedLanguage, 1);
  document = replacePlaceholder(document, "{{PTV_TITLE}}", escapedTitle, 2);

  return document.endsWith("\n") ? document : `${document}\n`;
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function writeExclusiveAtomic(outputPath, source) {
  const parentDirectory = dirname(outputPath);
  await mkdir(parentDirectory, { recursive: true });

  if (await pathExists(outputPath)) {
    throw new ScaffoldError(
      "output-exists",
      `Refusing to overwrite existing output "${outputPath}".`,
    );
  }

  const temporaryPath = resolve(
    parentDirectory,
    `.${basename(outputPath)}.ptv-${process.pid}-${randomUUID()}.tmp`,
  );
  let temporaryHandle;

  try {
    temporaryHandle = await open(temporaryPath, "wx", 0o644);
    await temporaryHandle.writeFile(source, "utf8");
    await temporaryHandle.sync();
    await temporaryHandle.close();
    temporaryHandle = undefined;

    try {
      await link(temporaryPath, outputPath);
    } catch (error) {
      if (error.code === "EEXIST") {
        throw new ScaffoldError(
          "output-exists",
          `Refusing to overwrite existing output "${outputPath}".`,
        );
      }
      throw error;
    }
  } finally {
    await temporaryHandle?.close().catch(() => {});
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

    const outputPath = resolve(options.output);
    const document = await assembleDocument(options);
    await writeExclusiveAtomic(outputPath, document);
    console.log(`Created portable artifact: ${outputPath}`);
  } catch (error) {
    const code = error instanceof ScaffoldError ? error.code : "scaffold";
    console.error(`ERROR [${code}] ${error.message}`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
