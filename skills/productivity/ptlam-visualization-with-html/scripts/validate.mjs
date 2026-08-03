#!/usr/bin/env node

import {
  lstat,
  readFile,
  realpath,
  stat,
} from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSET_WARNING_BYTES = 10 * 1024 * 1024;
const TOTAL_WARNING_BYTES = 25 * 1024 * 1024;
const COMPLEX_VALUE_PATTERN = /\$\{|\{\{|\}\}|\{%|%\}|<%|%>/;
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);
const DEPENDENCY_LINK_RELS = new Set([
  'apple-touch-icon',
  'icon',
  'manifest',
  'mask-icon',
  'modulepreload',
  'preload',
  'stylesheet',
]);

class Report {
  constructor() {
    this.findings = [];
    this.localAssetCount = 0;
    this.totalBytes = 0;
  }

  add(severity, code, message) {
    this.findings.push({ severity, code, message });
  }

  error(code, message) {
    this.add('ERROR', code, message);
  }

  warning(code, message) {
    this.add('WARNING', code, message);
  }

  unverified(code, message) {
    this.add('UNVERIFIED', code, message);
  }

  count(severity) {
    return this.findings.filter((finding) => finding.severity === severity).length;
  }

  print() {
    for (const finding of this.findings) {
      console.log(`${finding.severity} [${finding.code}] ${finding.message}`);
    }

    console.log(
      `SUMMARY errors=${this.count('ERROR')} warnings=${this.count('WARNING')} ` +
        `unverified=${this.count('UNVERIFIED')} local-assets=${this.localAssetCount} ` +
        `total-bytes=${this.totalBytes}`,
    );
  }
}

function usage() {
  return 'Usage: node skills/productivity/ptlam-visualization-with-html/scripts/validate.mjs <html-path>';
}

function location(source, index) {
  const before = source.slice(0, index);
  const line = before.split('\n').length;
  const lastNewline = before.lastIndexOf('\n');
  return `line ${line}, column ${index - lastNewline}`;
}

function findTagEnd(source, start) {
  let quote = null;

  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote !== null) {
      if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }

  return -1;
}

function parseStartTag(raw, source, position) {
  const nameMatch = raw.match(/^<\s*([A-Za-z][A-Za-z0-9:-]*)/);
  if (!nameMatch) {
    return {
      ambiguity: `Unsupported markup begins at ${location(source, position)}.`,
    };
  }

  const tagName = nameMatch[1].toLowerCase();
  const attributes = new Map();
  const duplicateAttributes = new Set();
  const ambiguities = [];
  let index = nameMatch[0].length;
  const end = raw.length - 1;
  let selfClosing = false;

  while (index < end) {
    while (index < end && /\s/.test(raw[index])) {
      index += 1;
    }
    if (index >= end) {
      break;
    }
    if (raw[index] === '/') {
      selfClosing = true;
      index += 1;
      while (index < end && /\s/.test(raw[index])) {
        index += 1;
      }
      if (index < end) {
        ambiguities.push(`Unexpected source follows "/" in <${tagName}>.`);
      }
      break;
    }

    const attributeMatch = raw
      .slice(index, end)
      .match(/^[^\s"'<>\/=]+/);
    if (!attributeMatch) {
      ambiguities.push(`Ambiguous attribute syntax in <${tagName}>.`);
      break;
    }

    const originalName = attributeMatch[0];
    const name = originalName.toLowerCase();
    index += originalName.length;
    while (index < end && /\s/.test(raw[index])) {
      index += 1;
    }

    let value = null;
    if (raw[index] === '=') {
      index += 1;
      while (index < end && /\s/.test(raw[index])) {
        index += 1;
      }
      if (index >= end) {
        return {
          error: `Attribute "${originalName}" in <${tagName}> has no value at ${location(source, position)}.`,
        };
      }

      const quote = raw[index];
      if (quote === '"' || quote === "'") {
        index += 1;
        const valueStart = index;
        while (index < end && raw[index] !== quote) {
          index += 1;
        }
        if (index >= end) {
          return {
            error: `Attribute "${originalName}" in <${tagName}> has an unterminated quoted value at ${location(source, position)}.`,
          };
        }
        value = raw.slice(valueStart, index);
        index += 1;
      } else {
        const valueMatch = raw.slice(index, end).match(/^[^\s"'`=<>]+/);
        if (!valueMatch) {
          return {
            error: `Attribute "${originalName}" in <${tagName}> has a malformed value at ${location(source, position)}.`,
          };
        }
        value = valueMatch[0];
        index += value.length;
      }
    }

    if (attributes.has(name)) {
      duplicateAttributes.add(name);
    } else {
      attributes.set(name, value);
    }
    if (COMPLEX_VALUE_PATTERN.test(originalName) || (value !== null && COMPLEX_VALUE_PATTERN.test(value))) {
      ambiguities.push(`Dynamic attribute syntax in <${tagName}> cannot be resolved statically.`);
    }
  }

  for (const name of duplicateAttributes) {
    ambiguities.push(`Duplicate "${name}" attributes in <${tagName}> have browser-defined resolution.`);
  }

  return {
    token: {
      type: 'start',
      name: tagName,
      attributes,
      ambiguous: ambiguities.length > 0,
      position,
      endPosition: position + raw.length,
      selfClosing: selfClosing || VOID_ELEMENTS.has(tagName),
    },
    ambiguities,
  };
}

function scanHtml(source) {
  const tokens = [];
  const errors = [];
  const ambiguities = [];
  let index = 0;

  while (index < source.length) {
    const start = source.indexOf('<', index);
    if (start === -1) {
      break;
    }

    if (source.startsWith('<!--', start)) {
      const end = source.indexOf('-->', start + 4);
      if (end === -1) {
        errors.push(`HTML comment is not closed at ${location(source, start)}.`);
        break;
      }
      index = end + 3;
      continue;
    }

    if (/^<!doctype\b/i.test(source.slice(start))) {
      const end = findTagEnd(source, start);
      if (end === -1) {
        errors.push(`DOCTYPE is not closed at ${location(source, start)}.`);
        break;
      }
      tokens.push({
        type: 'doctype',
        raw: source.slice(start, end + 1),
        position: start,
      });
      index = end + 1;
      continue;
    }

    if (source.startsWith('</', start)) {
      const end = findTagEnd(source, start);
      if (end === -1) {
        errors.push(`Closing tag is not closed at ${location(source, start)}.`);
        break;
      }
      const raw = source.slice(start, end + 1);
      const match = raw.match(/^<\/\s*([A-Za-z][A-Za-z0-9:-]*)\s*>$/);
      if (!match) {
        ambiguities.push(`Ambiguous closing-tag syntax at ${location(source, start)}.`);
      } else {
        tokens.push({
          type: 'end',
          name: match[1].toLowerCase(),
          position: start,
          endPosition: end + 1,
        });
      }
      index = end + 1;
      continue;
    }

    if (source.startsWith('<%', start) || source.startsWith('<?', start)) {
      const endMarker = source.startsWith('<%', start) ? '%>' : '?>';
      const end = source.indexOf(endMarker, start + 2);
      ambiguities.push(`Template or processing syntax begins at ${location(source, start)}.`);
      index = end === -1 ? start + 2 : end + 2;
      continue;
    }

    if (source.startsWith('<!', start)) {
      const end = findTagEnd(source, start);
      if (end === -1) {
        errors.push(`Declaration is not closed at ${location(source, start)}.`);
        break;
      }
      ambiguities.push(`Unsupported declaration begins at ${location(source, start)}.`);
      index = end + 1;
      continue;
    }

    const end = findTagEnd(source, start);
    if (end === -1) {
      errors.push(`Start tag is not closed at ${location(source, start)}.`);
      break;
    }

    const parsed = parseStartTag(source.slice(start, end + 1), source, start);
    if (parsed.error) {
      errors.push(parsed.error);
      index = end + 1;
      continue;
    }
    if (parsed.ambiguity) {
      ambiguities.push(parsed.ambiguity);
      index = start + 1;
      continue;
    }

    tokens.push(parsed.token);
    for (const ambiguity of parsed.ambiguities) {
      ambiguities.push(`${ambiguity} (${location(source, start)}.)`);
    }
    index = end + 1;

    if (RAW_TEXT_ELEMENTS.has(parsed.token.name) && !parsed.token.selfClosing) {
      const closingPattern = new RegExp(`<\\/\\s*${parsed.token.name}\\s*>`, 'gi');
      closingPattern.lastIndex = index;
      const closing = closingPattern.exec(source);
      if (!closing) {
        errors.push(`Raw-text element <${parsed.token.name}> is not closed at ${location(source, start)}.`);
        break;
      }
      parsed.token.content = source.slice(index, closing.index);
      tokens.push({
        type: 'end',
        name: parsed.token.name,
        position: closing.index,
        endPosition: closingPattern.lastIndex,
      });
      index = closingPattern.lastIndex;
    }
  }

  return { tokens, errors, ambiguities };
}

function starts(tokens, name) {
  return tokens.filter((token) => token.type === 'start' && token.name === name);
}

function ends(tokens, name) {
  return tokens.filter((token) => token.type === 'end' && token.name === name);
}

function checkRequiredElement(report, scan, source, name) {
  const opening = starts(scan.tokens, name);
  const closing = ends(scan.tokens, name);
  const hasStructuralAmbiguity = scan.ambiguities.some((ambiguity) =>
    /markup|closing-tag|Template|processing|declaration/i.test(ambiguity),
  );

  if (opening.length === 0) {
    if (!hasStructuralAmbiguity) {
      report.error('document-structure', `Required <${name}> element is missing.`);
    }
    return null;
  }
  if (opening.length > 1) {
    report.error('document-structure', `Expected one <${name}> element, found ${opening.length}.`);
  }
  if (closing.length === 0 && !opening[0].selfClosing) {
    if (!hasStructuralAmbiguity) {
      report.error('document-structure', `Required </${name}> closing tag is missing.`);
    }
  } else if (closing.length > 1) {
    report.error('document-structure', `Expected one </${name}> closing tag, found ${closing.length}.`);
  }
  if (opening[0].selfClosing) {
    report.error('document-structure', `Required <${name}> element must not be self-closing.`);
  }
  if (closing[0] && opening[0].position > closing[0].position) {
    report.error('document-structure', `<${name}> closes before it opens at ${location(source, closing[0].position)}.`);
  }
  return opening[0];
}

function checkDocumentStructure(report, scan, source) {
  const doctypes = scan.tokens.filter((token) => token.type === 'doctype');
  const hasStructuralAmbiguity = scan.ambiguities.some((ambiguity) =>
    /markup|closing-tag|Template|processing|declaration/i.test(ambiguity),
  );
  if (doctypes.length === 0) {
    if (hasStructuralAmbiguity) {
      report.unverified(
        'document-doctype',
        'The HTML5 DOCTYPE cannot be verified while structural source syntax is ambiguous.',
      );
    } else {
      report.error('document-doctype', 'Required HTML5 DOCTYPE is missing. Add <!doctype html>.');
    }
  } else {
    if (doctypes.length > 1) {
      report.error('document-doctype', `Expected one DOCTYPE, found ${doctypes.length}.`);
    }
    if (!/^<!doctype\s+html\s*>$/i.test(doctypes[0].raw)) {
      report.error('document-doctype', 'DOCTYPE must use the HTML5 form <!doctype html>.');
    }
  }

  const html = checkRequiredElement(report, scan, source, 'html');
  const head = checkRequiredElement(report, scan, source, 'head');
  const body = checkRequiredElement(report, scan, source, 'body');
  const htmlEnd = ends(scan.tokens, 'html')[0];
  const headEnd = ends(scan.tokens, 'head')[0];
  const bodyEnd = ends(scan.tokens, 'body')[0];

  if (html && head && body && !(html.position < head.position && head.position < body.position)) {
    report.error('document-structure', 'Required elements must be ordered as <html>, <head>, then <body>.');
  }
  if (head && headEnd && body && headEnd.position > body.position) {
    report.error('document-structure', '<head> must close before <body> opens.');
  }
  if (body && bodyEnd && htmlEnd && bodyEnd.position > htmlEnd.position) {
    report.error('document-structure', '<body> must close before </html>.');
  }
  if (doctypes[0] && html && doctypes[0].position > html.position) {
    report.error('document-structure', 'DOCTYPE must appear before the <html> element.');
  }

  return { html, head, body, headEnd };
}

function isComplex(value) {
  return value !== null && COMPLEX_VALUE_PATTERN.test(value);
}

function metaTokens(scan, name) {
  return starts(scan.tokens, 'meta').filter(
    (token) => token.attributes.get('name')?.trim().toLowerCase() === name,
  );
}

function checkNamedMeta(report, scan, name, expectedContent, label) {
  const matches = metaTokens(scan, name);
  if (matches.length === 0) {
    const ambiguousMeta = starts(scan.tokens, 'meta').some((token) => token.ambiguous);
    if (ambiguousMeta) {
      report.unverified(
        `metadata-${name}`,
        `${label} could not be resolved because a <meta> element uses ambiguous source syntax.`,
      );
    } else {
      report.error(`metadata-${name}`, `${label} is missing.`);
    }
    return;
  }
  if (matches.length > 1) {
    report.error(`metadata-${name}`, `${label} must occur once; found ${matches.length}.`);
  }

  const content = matches[0].attributes.get('content');
  if (content === undefined || content === null || content.trim() === '') {
    report.error(`metadata-${name}`, `${label} needs a non-empty content attribute.`);
  } else if (isComplex(content)) {
    report.unverified(`metadata-${name}`, `${label} uses a dynamic value that cannot be verified statically.`);
  } else if (expectedContent !== null && content.trim() !== expectedContent) {
    report.error(
      `metadata-${name}`,
      `${label} must have content="${expectedContent}"; found content="${content.trim()}".`,
    );
  }
}

function checkMetadata(report, scan, structure) {
  if (structure.html) {
    const language = structure.html.attributes.get('lang');
    if (language === undefined || language === null || language.trim() === '') {
      report.error('document-language', 'The <html> element needs a non-empty lang attribute.');
    } else if (isComplex(language)) {
      report.unverified('document-language', 'The dynamic <html lang> value cannot be verified statically.');
    } else if (!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(language.trim())) {
      report.error(
        'document-language',
        `The <html lang> value "${language.trim()}" is not a well-formed language tag.`,
      );
    }
  }

  const titles = starts(scan.tokens, 'title');
  if (titles.length === 0) {
    const hasStructuralAmbiguity = scan.ambiguities.some((ambiguity) =>
      /markup|closing-tag|Template|processing|declaration/i.test(ambiguity),
    );
    if (hasStructuralAmbiguity) {
      report.unverified(
        'document-title',
        'The required <title> cannot be verified while structural source syntax is ambiguous.',
      );
    } else {
      report.error('document-title', 'A non-empty <title> inside <head> is required.');
    }
  } else {
    if (titles.length > 1) {
      report.error('document-title', `Expected one <title>, found ${titles.length}.`);
    }
    const title = titles[0];
    if (title.content && isComplex(title.content)) {
      report.unverified('document-title', 'Dynamic <title> content cannot be verified as readable text.');
    } else if (!title.content || title.content.replace(/&(?:nbsp|#160|#x0*a0);/gi, ' ').trim() === '') {
      report.error('document-title', 'The <title> element must contain readable text.');
    }
    if (
      structure.head &&
      structure.headEnd &&
      !(title.position > structure.head.position && title.position < structure.headEnd.position)
    ) {
      report.error('document-title', 'The <title> element must be inside <head>.');
    }
  }

  const viewport = metaTokens(scan, 'viewport');
  if (viewport.length === 0) {
    const ambiguousMeta = starts(scan.tokens, 'meta').some((token) => token.ambiguous);
    if (ambiguousMeta) {
      report.unverified(
        'metadata-viewport',
        'Viewport metadata could not be resolved because a <meta> element uses ambiguous source syntax.',
      );
    } else {
      report.error('metadata-viewport', 'Viewport metadata is missing. Add width=device-width.');
    }
  } else {
    if (viewport.length > 1) {
      report.error('metadata-viewport', `Viewport metadata must occur once; found ${viewport.length}.`);
    }
    const content = viewport[0].attributes.get('content');
    if (content === undefined || content === null || content.trim() === '') {
      report.error('metadata-viewport', 'Viewport metadata needs a non-empty content attribute.');
    } else if (isComplex(content)) {
      report.unverified('metadata-viewport', 'Dynamic viewport metadata cannot be verified statically.');
    } else if (!/(?:^|,)\s*width\s*=\s*device-width\s*(?:,|$)/i.test(content)) {
      report.error('metadata-viewport', 'Viewport metadata must include width=device-width.');
    }
  }

  checkNamedMeta(
    report,
    scan,
    'generator',
    'ptlam-visualization-with-html',
    'Generator metadata',
  );
  checkNamedMeta(
    report,
    scan,
    'ptlam-visualization-with-html-version',
    '1',
    'ptlam-visualization-with-html version metadata',
  );
}

function decodeAttributeValue(value) {
  let unknownEntity = false;
  const decoded = value.replace(
    /&(#(?:x[0-9A-Fa-f]+|[0-9]+)|[A-Za-z][A-Za-z0-9]+);/g,
    (entity, body) => {
      if (body[0] === '#') {
        const hexadecimal = body[1]?.toLowerCase() === 'x';
        const digits = body.slice(hexadecimal ? 2 : 1);
        const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
        if (Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff) {
          return String.fromCodePoint(codePoint);
        }
        unknownEntity = true;
        return entity;
      }

      const named = {
        amp: '&',
        apos: "'",
        colon: ':',
        gt: '>',
        lt: '<',
        quot: '"',
      }[body.toLowerCase()];
      if (named === undefined) {
        unknownEntity = true;
        return entity;
      }
      return named;
    },
  );

  return { decoded, unknownEntity };
}

function classifyReference(value) {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.startsWith('#')) {
    return { kind: 'fragment' };
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    return { kind: 'invalid', reason: 'contains control characters' };
  }

  const schemeMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9+.-]*):/);
  const scheme = schemeMatch?.[1].toLowerCase();
  if (trimmed.startsWith('//') || scheme === 'http' || scheme === 'https') {
    return { kind: 'remote' };
  }
  if (scheme === 'data') {
    return { kind: 'inline' };
  }
  if (scheme === 'blob') {
    return { kind: 'runtime' };
  }
  if (scheme) {
    return { kind: 'scheme', scheme };
  }
  return { kind: 'local' };
}

function relationTokens(token) {
  return new Set(
    (token.attributes.get('rel') ?? '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean),
  );
}

function collectHtmlReferences(scan, report) {
  const references = [];
  const links = [];

  function addAttribute(token, attribute, kind) {
    const value = token.attributes.get(attribute);
    if (value === undefined || value === null || value.trim() === '') {
      return;
    }
    if (isComplex(value)) {
      return;
    }
    const decoded = decodeAttributeValue(value);
    if (decoded.unknownEntity) {
      report.unverified(
        'reference-entity',
        `The ${attribute} reference in <${token.name}> contains an entity the static validator does not decode.`,
      );
      return;
    }
    references.push({ value: decoded.decoded, context: `<${token.name}> ${attribute}`, kind });
  }

  function addSrcset(token) {
    const value = token.attributes.get('srcset');
    if (value === undefined || value === null || value.trim() === '' || isComplex(value)) {
      return;
    }
    if (/\bdata:/i.test(value)) {
      report.unverified(
        'srcset-syntax',
        `A data URL in <${token.name}> srcset cannot be split reliably by the static validator.`,
      );
      return;
    }
    const candidates = value.split(',');
    for (const candidate of candidates) {
      const parts = candidate.trim().split(/\s+/);
      if (!parts[0]) {
        report.unverified('srcset-syntax', `An empty <${token.name}> srcset candidate is ambiguous.`);
        continue;
      }
      if (parts.length > 2 || (parts[1] && !/^\d+(?:\.\d+)?[wx]$/.test(parts[1]))) {
        report.unverified(
          'srcset-syntax',
          `The <${token.name}> srcset candidate "${candidate.trim()}" has ambiguous descriptors.`,
        );
      }
      references.push({ value: parts[0], context: `<${token.name}> srcset`, kind: 'asset' });
    }
  }

  for (const token of scan.tokens) {
    if (token.type !== 'start') {
      continue;
    }

    if ((token.name === 'a' || token.name === 'area') && token.attributes.has('href')) {
      const href = token.attributes.get('href');
      if (href !== null && href.trim() !== '' && !isComplex(href)) {
        const decoded = decodeAttributeValue(href);
        if (decoded.unknownEntity) {
          report.unverified(
            'link-entity',
            `A <${token.name}> href contains an entity the static validator does not decode.`,
          );
        } else {
          links.push({ token, value: decoded.decoded });
        }
      }
    }

    if (token.name === 'script') addAttribute(token, 'src', 'asset');
    if (token.name === 'img') {
      addAttribute(token, 'src', 'asset');
      addSrcset(token);
    }
    if (token.name === 'source') {
      addAttribute(token, 'src', 'asset');
      addSrcset(token);
    }
    if (token.name === 'video') {
      addAttribute(token, 'src', 'asset');
      addAttribute(token, 'poster', 'asset');
    }
    if (['audio', 'track', 'embed', 'iframe'].includes(token.name)) {
      addAttribute(token, 'src', 'asset');
    }
    if (token.name === 'object') addAttribute(token, 'data', 'asset');
    if (token.name === 'input' && token.attributes.get('type')?.toLowerCase() === 'image') {
      addAttribute(token, 'src', 'asset');
    }
    if (token.name === 'link') {
      const rels = relationTokens(token);
      if ([...rels].some((rel) => DEPENDENCY_LINK_RELS.has(rel))) {
        addAttribute(token, 'href', 'asset');
      }
    }
    if (
      (token.name === 'a' || token.name === 'area') &&
      token.attributes.has('download')
    ) {
      addAttribute(token, 'href', 'asset');
    }
  }

  return { references, links };
}

function collectCssReferences(scan, report) {
  const references = [];
  const cssSources = [];
  for (const token of scan.tokens) {
    if (token.type !== 'start') continue;
    if (token.name === 'style' && token.content !== undefined) {
      cssSources.push({ css: token.content, context: '<style>' });
    }
    const inlineStyle = token.attributes.get('style');
    if (inlineStyle !== undefined && inlineStyle !== null) {
      cssSources.push({ css: inlineStyle, context: `<${token.name}> style` });
    }
  }

  for (const { css, context } of cssSources) {
    const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)'";][^)]*?))\s*\)/gi;
    let match;
    let matchCount = 0;
    while ((match = urlPattern.exec(css)) !== null) {
      matchCount += 1;
      const value = (match[1] ?? match[2] ?? match[3] ?? '').trim();
      if (value !== '' && !isComplex(value)) {
        references.push({ value, context: `${context} url()`, kind: 'asset' });
      }
    }
    const openingCount = [...css.matchAll(/url\s*\(/gi)].length;
    if (openingCount !== matchCount) {
      report.unverified(
        'css-reference-syntax',
        `${context} contains url() syntax that cannot be resolved deterministically.`,
      );
    }

    const importPattern = /@import\s+(?!url\s*\()(?:"([^"]+)"|'([^']+)')/gi;
    while ((match = importPattern.exec(css)) !== null) {
      const value = match[1] ?? match[2];
      if (!isComplex(value)) {
        references.push({ value, context: `${context} @import`, kind: 'asset' });
      }
    }
  }

  return { references, cssSources };
}

function checkLinks(report, links, hasBaseElement) {
  for (const { token, value } of links) {
    const classification = classifyReference(value);
    if (classification.kind === 'invalid') {
      report.error('unsafe-link', `Link "${value}" ${classification.reason}.`);
      continue;
    }
    if (classification.kind === 'scheme') {
      if (classification.scheme === 'mailto' || classification.scheme === 'tel') {
        continue;
      }
      report.error(
        'unsafe-link',
        `Link "${value}" uses disallowed ${classification.scheme}: syntax. Use a safe local, HTTPS, mailto, or tel target.`,
      );
      continue;
    }
    if (classification.kind === 'inline' || classification.kind === 'runtime') {
      report.error('unsafe-link', `Link "${value}" uses a non-navigation ${classification.kind} URL.`);
      continue;
    }
    if (classification.kind === 'local' && hasBaseElement) {
      report.unverified(
        'link-base-url',
        `Relative link "${value}" cannot be classified statically while a <base> element is present.`,
      );
      continue;
    }
    if (classification.kind !== 'remote') {
      continue;
    }

    const target = token.attributes.get('target');
    if (target === undefined || target === null || target.trim() === '') {
      continue;
    }
    if (isComplex(target)) {
      report.unverified('external-link-opener', `External link "${value}" has a dynamic target.`);
      continue;
    }
    const normalizedTarget = target.trim().toLowerCase();
    if (['_self', '_parent', '_top'].includes(normalizedTarget)) {
      continue;
    }
    const rels = relationTokens(token);
    const missing = ['noopener', 'noreferrer'].filter((rel) => !rels.has(rel));
    if (missing.length > 0) {
      report.error(
        'external-link-opener',
        `External link "${value}" opens target="${target}" without rel="noopener noreferrer"; missing ${missing.join(' and ')}.`,
      );
    }
  }
}

function isWithin(base, candidate) {
  const pathFromBase = relative(base, candidate);
  return (
    pathFromBase === '' ||
    (!pathFromBase.startsWith(`..${sep}`) && pathFromBase !== '..' && !isAbsolute(pathFromBase))
  );
}

function localPathFromReference(value, baseDirectory) {
  if (value.includes('\\')) {
    return { error: 'uses a backslash, which is not a portable local URL path' };
  }
  const withoutFragment = value.split('#', 1)[0];
  const withoutQuery = withoutFragment.split('?', 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    return { error: 'contains invalid percent-encoding' };
  }
  if (decoded === '') {
    return { fragment: true };
  }
  if (decoded.startsWith('/')) {
    return { outside: true };
  }
  const resolvedPath = resolve(baseDirectory, decoded);
  if (!isWithin(baseDirectory, resolvedPath)) {
    return { outside: true };
  }
  return { path: resolvedPath };
}

async function checkReferences(report, references, htmlPath, hasBaseElement) {
  const baseDirectory = resolve(dirname(htmlPath));
  let realBaseDirectory;
  try {
    realBaseDirectory = await realpath(baseDirectory);
  } catch (error) {
    report.error('asset-context', `Cannot resolve artifact directory "${baseDirectory}": ${error.message}`);
    return;
  }

  const seenRemote = new Set();
  const localReferences = new Map();
  for (const reference of references) {
    const classification = classifyReference(reference.value);
    if (classification.kind === 'fragment' || classification.kind === 'inline') {
      continue;
    }
    if (classification.kind === 'invalid') {
      report.error(
        'asset-reference',
        `${reference.context} reference "${reference.value}" ${classification.reason}.`,
      );
      continue;
    }
    if (classification.kind === 'runtime') {
      report.unverified(
        'runtime-asset',
        `${reference.context} uses blob URL "${reference.value}"; availability requires a browser runtime.`,
      );
      continue;
    }
    if (classification.kind === 'scheme') {
      report.error(
        'asset-reference',
        `${reference.context} uses unsupported ${classification.scheme}: URL "${reference.value}".`,
      );
      continue;
    }
    if (classification.kind === 'remote') {
      const key = `${reference.context}\u0000${reference.value}`;
      if (!seenRemote.has(key)) {
        report.warning(
          'remote-dependency',
          `${reference.context} references remote dependency "${reference.value}"; it was not fetched. Inline it or obtain user consent.`,
        );
        seenRemote.add(key);
      }
      continue;
    }
    if (hasBaseElement) {
      report.unverified(
        'asset-base-url',
        `${reference.context} relative reference "${reference.value}" cannot be resolved safely while a <base> element is present.`,
      );
      continue;
    }

    const local = localPathFromReference(reference.value, baseDirectory);
    if (local.error) {
      report.error(
        'asset-reference',
        `${reference.context} reference "${reference.value}" ${local.error}.`,
      );
      continue;
    }
    if (local.outside) {
      report.error(
        'asset-outside-context',
        `${reference.context} reference "${reference.value}" resolves outside the artifact directory and was not followed.`,
      );
      continue;
    }
    if (local.fragment) {
      continue;
    }
    if (!localReferences.has(local.path)) {
      localReferences.set(local.path, reference);
    }
  }

  for (const [assetPath, reference] of localReferences) {
    let assetInfo;
    try {
      const linkInfo = await lstat(assetPath);
      const resolvedAsset = await realpath(assetPath);
      if (!isWithin(realBaseDirectory, resolvedAsset)) {
        report.error(
          'asset-outside-context',
          `${reference.context} reference "${reference.value}" resolves through a symlink outside the artifact directory and was not followed.`,
        );
        continue;
      }
      assetInfo = linkInfo.isSymbolicLink() ? await stat(assetPath) : linkInfo;
    } catch (error) {
      report.error(
        'missing-asset',
        `${reference.context} local asset "${reference.value}" is not readable: ${error.message}`,
      );
      continue;
    }

    if (!assetInfo.isFile()) {
      report.error(
        'invalid-asset',
        `${reference.context} local asset "${reference.value}" is not a regular file.`,
      );
      continue;
    }

    report.localAssetCount += 1;
    report.totalBytes += assetInfo.size;
    if (assetInfo.size > ASSET_WARNING_BYTES) {
      report.warning(
        'asset-size',
        `Local asset "${reference.value}" is ${assetInfo.size} bytes, above the 10 MB per-asset threshold.`,
      );
    }
  }
}

function checkOverflowHazards(report, cssSources) {
  const reported = new Set();
  for (const { css, context } of cssSources) {
    const blocks = context === '<style>' ? [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)] : [[null, context, css]];
    for (const block of blocks) {
      const selector = block[1].trim();
      const declarations = block[2];
      if (context === '<style>' && !selector.includes('.ptv-')) {
        continue;
      }

      const minSizePattern = /(?:min-width|min-inline-size)\s*:\s*(\d+(?:\.\d+)?)px\b/gi;
      let match;
      while ((match = minSizePattern.exec(declarations)) !== null) {
        if (Number(match[1]) <= 320) continue;
        const message = `${selector} sets ${match[0]}, an obvious 320px overflow hazard in a bundled pattern.`;
        if (!reported.has(message)) {
          report.warning('overflow-hazard', message);
          reported.add(message);
        }
      }

      const hasResponsiveMaximum = /(?:max-width|max-inline-size)\s*:\s*(?:100%|min\(|clamp\(|calc\()/i.test(
        declarations,
      );
      if (hasResponsiveMaximum) continue;
      const fixedSizePattern = /(?:^|[;\s])(?:width|inline-size)\s*:\s*(\d+(?:\.\d+)?)px\b/gi;
      while ((match = fixedSizePattern.exec(declarations)) !== null) {
        if (Number(match[1]) <= 320) continue;
        const message = `${selector} sets ${match[0].trim()} without a responsive maximum, an obvious 320px overflow hazard in a bundled pattern.`;
        if (!reported.has(message)) {
          report.warning('overflow-hazard', message);
          reported.add(message);
        }
      }
    }
  }
}

function addBrowserUnverifiedFindings(report) {
  report.unverified(
    'browser-ids-fragments',
    'Unique IDs and local fragment targets require browser-DOM validation.',
  );
  report.unverified(
    'browser-landmarks-headings',
    'Essential semantic landmarks and heading order require browser-DOM validation.',
  );
  report.unverified(
    'browser-control-names',
    'Interactive controls and their accessible names require browser-DOM validation.',
  );
  report.unverified(
    'browser-layout',
    'Responsive layout, horizontal overflow, clipping, and rendered assets require real-browser validation.',
  );
  report.unverified(
    'browser-interaction',
    'Keyboard behavior, visible focus, reduced motion, and console behavior require real-browser validation.',
  );
}

async function validate(htmlArgument) {
  const report = new Report();
  const htmlPath = resolve(htmlArgument);
  let fileInfo;
  let bytes;

  try {
    fileInfo = await stat(htmlPath);
    if (!fileInfo.isFile()) {
      report.error('input-path', `HTML path "${htmlArgument}" is not a regular file.`);
      return report;
    }
    bytes = await readFile(htmlPath);
  } catch (error) {
    report.error('input-path', `Cannot read HTML path "${htmlArgument}": ${error.message}`);
    return report;
  }

  report.totalBytes = fileInfo.size;
  if (bytes.length === 0) {
    report.error('input-readability', `HTML file "${htmlArgument}" is empty.`);
    return report;
  }

  let source;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    report.error('input-readability', `HTML file "${htmlArgument}" is not valid UTF-8: ${error.message}`);
    return report;
  }
  if (source.includes('\u0000')) {
    report.error('input-readability', `HTML file "${htmlArgument}" contains a NUL byte.`);
    return report;
  }

  const scan = scanHtml(source);
  for (const error of scan.errors) {
    report.error('html-syntax', error);
  }
  if (scan.ambiguities.length > 0) {
    report.unverified(
      'source-syntax',
      `${scan.ambiguities.length} complex or ambiguous source construct(s) prevent complete static conclusions. First finding: ${scan.ambiguities[0]}`,
    );
  }

  const structure = checkDocumentStructure(report, scan, source);
  checkMetadata(report, scan, structure);

  const baseElements = starts(scan.tokens, 'base');
  const hasBaseElement = baseElements.length > 0;
  if (hasBaseElement) {
    report.unverified(
      'base-url',
      'A <base> element changes relative URL semantics; relative links and assets require browser-DOM validation.',
    );
    for (const baseElement of baseElements) {
      const href = baseElement.attributes.get('href');
      if (href === undefined || href === null || href.trim() === '' || isComplex(href)) {
        continue;
      }
      const classification = classifyReference(href);
      if (classification.kind === 'remote') {
        report.warning(
          'remote-base-url',
          `<base> references remote URL "${href}"; relative dependencies may become remote and were not fetched.`,
        );
      } else if (classification.kind === 'scheme') {
        report.error(
          'base-url',
          `<base> uses unsupported ${classification.scheme}: URL "${href}".`,
        );
      }
    }
  }

  const htmlReferences = collectHtmlReferences(scan, report);
  const cssReferences = collectCssReferences(scan, report);
  checkLinks(report, htmlReferences.links, hasBaseElement);
  await checkReferences(
    report,
    [...htmlReferences.references, ...cssReferences.references],
    htmlPath,
    hasBaseElement,
  );
  checkOverflowHazards(report, cssReferences.cssSources);

  if (report.totalBytes > TOTAL_WARNING_BYTES) {
    report.warning(
      'total-size',
      `Artifact HTML plus readable local assets total ${report.totalBytes} bytes, above the 25 MB threshold.`,
    );
  }

  addBrowserUnverifiedFindings(report);
  return report;
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.length === 1 && (arguments_[0] === '--help' || arguments_[0] === '-h')) {
    console.log(usage());
    return;
  }

  if (arguments_.length !== 1 || arguments_[0].startsWith('-')) {
    const report = new Report();
    report.error('cli-usage', `${usage()} Exactly one positional HTML path is required.`);
    report.print();
    process.exitCode = 1;
    return;
  }

  const report = await validate(arguments_[0]);
  report.print();
  if (report.count('ERROR') > 0) {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main();
}
