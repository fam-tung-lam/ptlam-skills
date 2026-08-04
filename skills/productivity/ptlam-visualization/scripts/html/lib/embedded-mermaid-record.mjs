import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export const EMBEDDED_MERMAID_MIME =
  "application/vnd.ptlam.visualization.mermaid-source+json;version=1";
export const EMBEDDED_MERMAID_SCHEMA_VERSION = 1;
export const ACTIVE_MERMAID_VERSION = "11.16.0";

const ACTIVE_MANIFEST_URL = new URL(
  "../../../references/mermaid/11.16.0/MANIFEST.json",
  import.meta.url,
);
const RECORD_KEYS = [
  "schemaVersion",
  "diagramId",
  "sourceEncoding",
  "source",
  "sourceSha256",
  "mermaidVersion",
  "capsuleId",
];
const DIAGRAM_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);
let activeCapsulePromise;

export class EmbeddedMermaidRecordError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new EmbeddedMermaidRecordError(code, message);
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("record-utf8", `${label} is not valid UTF-8.`);
  }
}

async function loadActiveCapsule() {
  let manifest;
  try {
    const bytes = await readFile(ACTIVE_MANIFEST_URL);
    manifest = JSON.parse(decodeUtf8(bytes, "Active Mermaid manifest"));
  } catch (error) {
    if (error instanceof EmbeddedMermaidRecordError) throw error;
    fail(
      "capsule-manifest",
      `Cannot read the active Mermaid manifest: ${error.message}`,
    );
  }

  const mermaidVersion = manifest?.capsule?.mermaidVersion;
  const identity = manifest?.capsuleIdentity;
  if (mermaidVersion !== ACTIVE_MERMAID_VERSION) {
    fail(
      "capsule-manifest",
      `Active manifest must declare Mermaid ${ACTIVE_MERMAID_VERSION}.`,
    );
  }
  if (
    identity?.algorithm !== "sha256-canonical-json-v1" ||
    !SHA256_PATTERN.test(identity?.value ?? "")
  ) {
    fail(
      "capsule-manifest",
      "Active manifest has no valid sha256-canonical-json-v1 capsule identity.",
    );
  }
  return Object.freeze({
    mermaidVersion,
    capsuleId: identity.value,
  });
}

export async function activeMermaidCapsule() {
  activeCapsulePromise ??= loadActiveCapsule();
  return activeCapsulePromise;
}

export function normalizeMermaidSource(source) {
  if (typeof source !== "string") {
    fail("source-type", "Mermaid source must be a UTF-8 string.");
  }
  const bytes = Buffer.from(source, "utf8");
  if (bytes.toString("utf8") !== source) {
    fail("source-utf8", "Mermaid source contains an invalid Unicode scalar.");
  }

  let normalized = source.startsWith("\uFEFF") ? source.slice(1) : source;
  normalized = normalized.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  normalized = normalized.normalize("NFC").replace(/\n+$/u, "");
  return `${normalized}\n`;
}

export function sourceSha256(source) {
  return createHash("sha256").update(source, "utf8").digest("hex");
}

function validateDiagramId(diagramId) {
  if (!DIAGRAM_ID_PATTERN.test(diagramId ?? "")) {
    fail(
      "diagram-id",
      "diagramId must start with an ASCII letter and contain at most 128 letters, digits, dots, underscores, or hyphens.",
    );
  }
}

function validateCapsuleId(capsuleId, expectedCapsuleId = null) {
  if (!SHA256_PATTERN.test(capsuleId ?? "")) {
    fail("capsule-id", "capsuleId must be a lowercase SHA-256 digest.");
  }
  if (expectedCapsuleId !== null && capsuleId !== expectedCapsuleId) {
    fail(
      "capsule-identity",
      "Embedded source capsuleId does not match the active Mermaid manifest.",
    );
  }
}

function createRecord({ diagramId, source, capsuleId, mermaidVersion }) {
  validateDiagramId(diagramId);
  const normalizedSource = normalizeMermaidSource(source);
  return {
    schemaVersion: EMBEDDED_MERMAID_SCHEMA_VERSION,
    diagramId,
    sourceEncoding: "utf-8",
    source: normalizedSource,
    sourceSha256: sourceSha256(normalizedSource),
    mermaidVersion,
    capsuleId,
  };
}

export async function createEmbeddedMermaidRecord({
  diagramId,
  source,
  capsuleId,
  mermaidVersion = ACTIVE_MERMAID_VERSION,
}) {
  const active = await activeMermaidCapsule();
  if (mermaidVersion !== active.mermaidVersion) {
    fail(
      "mermaid-version",
      `Expected Mermaid ${active.mermaidVersion}; received ${mermaidVersion}.`,
    );
  }
  validateCapsuleId(capsuleId, active.capsuleId);
  return createRecord({ diagramId, source, capsuleId, mermaidVersion });
}

export function validateEmbeddedMermaidRecord(
  record,
  { expectedCapsuleId = null } = {},
) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    fail("record-type", "Decoded Mermaid source record must be an object.");
  }
  const keys = Object.keys(record);
  if (
    keys.length !== RECORD_KEYS.length ||
    keys.some((key, index) => key !== RECORD_KEYS[index])
  ) {
    fail(
      "record-schema",
      `Record keys must be exactly ${RECORD_KEYS.join(", ")} in canonical order.`,
    );
  }
  if (record.schemaVersion !== EMBEDDED_MERMAID_SCHEMA_VERSION) {
    fail("schema-version", "Embedded Mermaid source schemaVersion must be 1.");
  }
  validateDiagramId(record.diagramId);
  if (record.sourceEncoding !== "utf-8") {
    fail("source-encoding", 'Embedded Mermaid sourceEncoding must be "utf-8".');
  }
  if (record.source !== normalizeMermaidSource(record.source)) {
    fail("source-normalization", "Embedded Mermaid source is not canonical.");
  }
  if (record.sourceSha256 !== sourceSha256(record.source)) {
    fail("source-hash", "Embedded Mermaid source SHA-256 does not match.");
  }
  if (record.mermaidVersion !== ACTIVE_MERMAID_VERSION) {
    fail(
      "mermaid-version",
      `Embedded source was not validated with Mermaid ${ACTIVE_MERMAID_VERSION}.`,
    );
  }
  validateCapsuleId(record.capsuleId, expectedCapsuleId);
  return record;
}

export function canonicalRecordJson(record) {
  validateEmbeddedMermaidRecord(record);
  return JSON.stringify(record);
}

export function encodeEmbeddedMermaidRecord(record) {
  return Buffer.from(canonicalRecordJson(record), "utf8").toString("base64");
}

export function embeddedMermaidRecordElement(record) {
  const encoded = encodeEmbeddedMermaidRecord(record);
  return `<script type="${EMBEDDED_MERMAID_MIME}" data-ptv-diagram-source data-ptv-diagram-id="${record.diagramId}">${encoded}</script>`;
}

function findTagEnd(source, start) {
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === ">") return index;
  }
  return -1;
}

function parseAttributes(rawTag) {
  const attributes = new Map();
  const start = rawTag.match(/^<\s*([^\s/>]+)/u);
  if (!start) fail("html-tag", "Cannot parse embedded diagram element.");
  const body = rawTag.slice(start[0].length, rawTag.lastIndexOf(">"));
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/gu;
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    if (!/^\s*$/u.test(body.slice(cursor, match.index))) {
      fail(
        "html-attributes",
        "Embedded diagram element has malformed attributes.",
      );
    }
    const name = match[1].toLowerCase();
    if (attributes.has(name)) {
      fail("html-attributes", `Embedded diagram element repeats ${name}.`);
    }
    attributes.set(name, match[2] ?? match[3] ?? null);
    cursor = match.index + match[0].length;
  }
  if (!/^\s*\/?\s*$/u.test(body.slice(cursor))) {
    fail(
      "html-attributes",
      "Embedded diagram element has malformed attributes.",
    );
  }
  return attributes;
}

function findRawTextClose(source, name, from) {
  const pattern = new RegExp(`<\\/\\s*${name}\\s*>`, "giu");
  pattern.lastIndex = from;
  return pattern.exec(source);
}

function scanInterestingElements(html) {
  const recordElements = [];
  const renderedElements = [];
  let index = 0;

  while (index < html.length) {
    const start = html.indexOf("<", index);
    if (start === -1) break;
    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      if (end === -1) fail("html-comment", "HTML comment is not closed.");
      index = end + 3;
      continue;
    }
    if (/^<\s*\//u.test(html.slice(start))) {
      const end = findTagEnd(html, start);
      if (end === -1) fail("html-tag", "HTML closing tag is not closed.");
      index = end + 1;
      continue;
    }
    const nameMatch = html.slice(start).match(/^<\s*([A-Za-z][A-Za-z0-9:-]*)/u);
    if (!nameMatch) {
      index = start + 1;
      continue;
    }
    const name = nameMatch[1].toLowerCase();
    const end = findTagEnd(html, start);
    if (end === -1) fail("html-tag", `Opening <${name}> tag is not closed.`);
    const openingTag = html.slice(start, end + 1);
    const interesting =
      openingTag.includes("data-ptv-diagram-") ||
      openingTag.includes(EMBEDDED_MERMAID_MIME);

    if (name === "script") {
      const closing = findRawTextClose(html, name, end + 1);
      if (!closing) fail("html-tag", "Embedded script element is not closed.");
      if (interesting) {
        recordElements.push({
          name,
          attributes: parseAttributes(openingTag),
          content: html.slice(end + 1, closing.index),
        });
      }
      index = closing.index + closing[0].length;
      continue;
    }

    if (interesting) {
      renderedElements.push({
        name,
        attributes: parseAttributes(openingTag),
        openingStart: start,
        openingEnd: end + 1,
      });
    }
    if (RAW_TEXT_ELEMENTS.has(name)) {
      const closing = findRawTextClose(html, name, end + 1);
      index = closing ? closing.index + closing[0].length : end + 1;
    } else {
      index = end + 1;
    }
  }
  return { recordElements, renderedElements };
}

function decodeCanonicalRecord(encodedContent) {
  const encoded = encodedContent.trim();
  if (
    encoded.length === 0 ||
    encoded.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(
      encoded,
    )
  ) {
    fail(
      "record-base64",
      "Embedded Mermaid source record is not standard base64.",
    );
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.toString("base64") !== encoded) {
    fail(
      "record-base64",
      "Embedded Mermaid source record is not canonical base64.",
    );
  }
  const json = decodeUtf8(bytes, "Embedded Mermaid source record");
  let record;
  try {
    record = JSON.parse(json);
  } catch {
    fail("record-json", "Embedded Mermaid source record is not valid JSON.");
  }
  if (JSON.stringify(record) !== json) {
    fail(
      "record-canonical-json",
      "Embedded Mermaid source record is not canonical JSON.",
    );
  }
  return record;
}

function attributeTokens(attributes, name) {
  return new Set(
    (attributes.get(name) ?? "").trim().split(/\s+/u).filter(Boolean),
  );
}

function renderedSvgSlice(html, element) {
  let depth = 1;
  let index = element.openingEnd;
  while (index < html.length) {
    const start = html.indexOf("<", index);
    if (start === -1) break;
    if (html.startsWith("<!--", start)) {
      const end = html.indexOf("-->", start + 4);
      if (end === -1) fail("html-comment", "HTML comment is not closed.");
      index = end + 3;
      continue;
    }
    const end = findTagEnd(html, start);
    if (end === -1) fail("html-tag", "SVG tag is not closed.");
    const tag = html.slice(start, end + 1);
    const closing = tag.match(/^<\s*\/\s*([A-Za-z][A-Za-z0-9:-]*)/u);
    const opening = tag.match(/^<\s*([A-Za-z][A-Za-z0-9:-]*)/u);
    const name = (closing?.[1] ?? opening?.[1] ?? "").toLowerCase();
    if (closing && name === "svg") {
      depth -= 1;
      if (depth === 0) return html.slice(element.openingStart, end + 1);
    } else if (opening && name === "svg" && !/\/\s*>$/u.test(tag)) {
      depth += 1;
    }
    if (opening && RAW_TEXT_ELEMENTS.has(name)) {
      const rawTextClose = findRawTextClose(html, name, end + 1);
      if (!rawTextClose) fail("html-tag", `SVG <${name}> is not closed.`);
      index = rawTextClose.index + rawTextClose[0].length;
    } else {
      index = end + 1;
    }
  }
  fail("render-svg", "Rendered Mermaid SVG is not closed.");
}

function decodeUriCharacterReferences(value) {
  return value
    .replace(/&#x([\da-f]+);?/giu, (_, digits) =>
      String.fromCodePoint(Number.parseInt(digits, 16)),
    )
    .replace(/&#(\d+);?/gu, (_, digits) =>
      String.fromCodePoint(Number.parseInt(digits, 10)),
    )
    .replace(/&(colon|tab|newline);?/giu, (_, name) => {
      const decoded = { colon: ":", tab: "\t", newline: "\n" };
      return decoded[name.toLowerCase()];
    });
}

function containsUnsafeSvgUri(svg) {
  const uriAttribute =
    /\b(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu;
  for (const match of svg.matchAll(uriAttribute)) {
    const value = decodeUriCharacterReferences(
      match[1] ?? match[2] ?? match[3] ?? "",
    );
    const schemeProbe = value
      .trim()
      .replace(/[\u0000-\u0020\u007f]+/gu, "");
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/iu.test(schemeProbe)) return true;
  }
  return false;
}

function validateRenderedSvg(html, element) {
  if (element.name !== "svg") {
    fail(
      "render-element",
      "data-ptv-diagram-rendered must be placed on the inline SVG root.",
    );
  }
  const markerValue = element.attributes.get("data-ptv-diagram-rendered");
  if (markerValue !== null) {
    fail(
      "render-element",
      "data-ptv-diagram-rendered must be a boolean marker.",
    );
  }
  const diagramId = element.attributes.get("data-ptv-diagram-id");
  validateDiagramId(diagramId);
  const svg = renderedSvgSlice(html, element);
  if (
    /<\s*(?:script|foreignObject)\b|\son[a-z]+\s*=/iu.test(svg) ||
    containsUnsafeSvgUri(svg)
  ) {
    fail(
      "render-security",
      `Rendered Mermaid SVG ${diagramId} contains executable or remote content.`,
    );
  }

  const title = svg.match(/<title\b([^>]*)>([\s\S]*?)<\/title\s*>/iu);
  const description = svg.match(/<desc\b([^>]*)>([\s\S]*?)<\/desc\s*>/iu);
  if (!title || !description || !title[2].trim() || !description[2].trim()) {
    fail(
      "render-accessibility",
      `Rendered Mermaid SVG ${diagramId} needs non-empty title and description elements.`,
    );
  }
  const titleId = parseAttributes(`<title${title[1]}>`).get("id");
  const descriptionId = parseAttributes(`<desc${description[1]}>`).get("id");
  validateDiagramId(titleId);
  validateDiagramId(descriptionId);
  const labelledBy = attributeTokens(element.attributes, "aria-labelledby");
  const describedBy = attributeTokens(element.attributes, "aria-describedby");
  const role = element.attributes.get("role")?.trim();
  if (!role || !labelledBy.has(titleId) || !describedBy.has(descriptionId)) {
    fail(
      "render-accessibility",
      `Rendered Mermaid SVG ${diagramId} must expose role, aria-labelledby, and aria-describedby for its title and description.`,
    );
  }
  return diagramId;
}

export function markRenderedMermaidSvg(renderedSvg, diagramId) {
  validateDiagramId(diagramId);
  if (typeof renderedSvg !== "string") {
    fail("render-svg", "Rendered Mermaid SVG must be a string.");
  }
  const start = renderedSvg.search(/<svg\b/iu);
  if (start === -1 || renderedSvg.slice(0, start).trim() !== "") {
    fail(
      "render-svg",
      "Rendered Mermaid output must start with an inline SVG root.",
    );
  }
  const end = findTagEnd(renderedSvg, start);
  if (end === -1)
    fail("render-svg", "Rendered Mermaid SVG root is not closed.");
  const opening = renderedSvg.slice(start, end + 1);
  const attributes = parseAttributes(opening);
  if (
    attributes.has("data-ptv-diagram-rendered") ||
    attributes.has("data-ptv-diagram-id")
  ) {
    fail(
      "render-element",
      "Rendered Mermaid SVG already contains PTLam markers.",
    );
  }
  const marked = `${opening.slice(0, -1)} data-ptv-diagram-rendered data-ptv-diagram-id="${diagramId}">${renderedSvg.slice(end + 1)}`;
  validateRenderedSvg(marked, {
    name: "svg",
    attributes: parseAttributes(marked.slice(0, findTagEnd(marked, 0) + 1)),
    openingStart: 0,
    openingEnd: findTagEnd(marked, 0) + 1,
  });
  return marked;
}

export async function parseEmbeddedMermaidRecords(html) {
  if (typeof html !== "string")
    fail("html-type", "HTML input must be a string.");
  const active = await activeMermaidCapsule();
  const { recordElements, renderedElements } = scanInterestingElements(html);
  const records = [];
  const ids = new Set();

  for (const element of recordElements) {
    const attributes = element.attributes;
    const isRecord =
      attributes.has("data-ptv-diagram-source") ||
      attributes.get("type") === EMBEDDED_MERMAID_MIME;
    if (!isRecord) continue;
    if (
      attributes.get("type") !== EMBEDDED_MERMAID_MIME ||
      !attributes.has("data-ptv-diagram-source")
    ) {
      fail(
        "record-element",
        "Embedded Mermaid source marker and MIME type must appear together.",
      );
    }
    if (
      attributes.get("data-ptv-diagram-source") !== null ||
      attributes.has("src")
    ) {
      fail(
        "record-element",
        "Embedded Mermaid source must use an inert boolean marker and no src.",
      );
    }
    const attributeId = attributes.get("data-ptv-diagram-id");
    validateDiagramId(attributeId);
    const record = decodeCanonicalRecord(element.content);
    validateEmbeddedMermaidRecord(record, {
      expectedCapsuleId: active.capsuleId,
    });
    if (record.diagramId !== attributeId) {
      fail(
        "diagram-id-mismatch",
        "Record diagramId does not match its HTML attribute.",
      );
    }
    if (ids.has(record.diagramId)) {
      fail(
        "diagram-id-duplicate",
        `Duplicate Mermaid source record for ${record.diagramId}.`,
      );
    }
    ids.add(record.diagramId);
    records.push(record);
  }

  const rendered = new Map();
  for (const element of renderedElements) {
    if (!element.attributes.has("data-ptv-diagram-rendered")) {
      if (element.attributes.has("data-ptv-diagram-id")) {
        fail(
          "render-element",
          "A rendered diagram ID requires data-ptv-diagram-rendered.",
        );
      }
      continue;
    }
    const diagramId = validateRenderedSvg(html, element);
    rendered.set(diagramId, (rendered.get(diagramId) ?? 0) + 1);
  }

  if (records.length === 0) {
    fail(
      "record-missing",
      "Combined HTML requires at least one Mermaid source record.",
    );
  }
  for (const record of records) {
    if (rendered.get(record.diagramId) !== 1) {
      fail(
        "render-association",
        `Expected exactly one rendered diagram marker for ${record.diagramId}.`,
      );
    }
  }
  for (const [diagramId, count] of rendered) {
    if (count !== 1 || !ids.has(diagramId)) {
      fail(
        "render-association",
        `Rendered diagram ${diagramId} must have exactly one matching source record.`,
      );
    }
  }
  return records;
}
