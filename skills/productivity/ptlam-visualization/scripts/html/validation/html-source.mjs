const COMPLEX_VALUE_PATTERN = /\$\{|\{\{|\}\}|\{%|%\}|<%|%>/;
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const RAW_TEXT_ELEMENTS = new Set(["script", "style", "textarea", "title"]);
// Source model: turn HTML text into the small token model used by every rule.
export function location(source, index) {
  const before = source.slice(0, index);
  const line = before.split("\n").length;
  const lastNewline = before.lastIndexOf("\n");
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
    } else if (character === ">") {
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
    if (raw[index] === "/") {
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

    const attributeMatch = raw.slice(index, end).match(/^[^\s"'<>\/=]+/);
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
    if (raw[index] === "=") {
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
    if (
      COMPLEX_VALUE_PATTERN.test(originalName) ||
      (value !== null && COMPLEX_VALUE_PATTERN.test(value))
    ) {
      ambiguities.push(
        `Dynamic attribute syntax in <${tagName}> cannot be resolved statically.`,
      );
    }
  }

  for (const name of duplicateAttributes) {
    ambiguities.push(
      `Duplicate "${name}" attributes in <${tagName}> have browser-defined resolution.`,
    );
  }

  return {
    token: {
      type: "start",
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

export function scanHtml(source) {
  const tokens = [];
  const errors = [];
  const ambiguities = [];
  let index = 0;

  while (index < source.length) {
    const start = source.indexOf("<", index);
    if (start === -1) {
      break;
    }

    if (source.startsWith("<!--", start)) {
      const end = source.indexOf("-->", start + 4);
      if (end === -1) {
        errors.push(
          `HTML comment is not closed at ${location(source, start)}.`,
        );
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
        type: "doctype",
        raw: source.slice(start, end + 1),
        position: start,
      });
      index = end + 1;
      continue;
    }

    if (source.startsWith("</", start)) {
      const end = findTagEnd(source, start);
      if (end === -1) {
        errors.push(`Closing tag is not closed at ${location(source, start)}.`);
        break;
      }
      const raw = source.slice(start, end + 1);
      const match = raw.match(/^<\/\s*([A-Za-z][A-Za-z0-9:-]*)\s*>$/);
      if (!match) {
        ambiguities.push(
          `Ambiguous closing-tag syntax at ${location(source, start)}.`,
        );
      } else {
        tokens.push({
          type: "end",
          name: match[1].toLowerCase(),
          position: start,
          endPosition: end + 1,
        });
      }
      index = end + 1;
      continue;
    }

    if (source.startsWith("<%", start) || source.startsWith("<?", start)) {
      const endMarker = source.startsWith("<%", start) ? "%>" : "?>";
      const end = source.indexOf(endMarker, start + 2);
      ambiguities.push(
        `Template or processing syntax begins at ${location(source, start)}.`,
      );
      index = end === -1 ? start + 2 : end + 2;
      continue;
    }

    if (source.startsWith("<!", start)) {
      const end = findTagEnd(source, start);
      if (end === -1) {
        errors.push(`Declaration is not closed at ${location(source, start)}.`);
        break;
      }
      ambiguities.push(
        `Unsupported declaration begins at ${location(source, start)}.`,
      );
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
      const closingPattern = new RegExp(
        `<\\/\\s*${parsed.token.name}\\s*>`,
        "gi",
      );
      closingPattern.lastIndex = index;
      const closing = closingPattern.exec(source);
      if (!closing) {
        errors.push(
          `Raw-text element <${parsed.token.name}> is not closed at ${location(source, start)}.`,
        );
        break;
      }
      parsed.token.content = source.slice(index, closing.index);
      tokens.push({
        type: "end",
        name: parsed.token.name,
        position: closing.index,
        endPosition: closingPattern.lastIndex,
      });
      index = closingPattern.lastIndex;
    }
  }

  return { tokens, errors, ambiguities };
}

export function starts(tokens, name) {
  return tokens.filter(
    (token) => token.type === "start" && token.name === name,
  );
}

export function ends(tokens, name) {
  return tokens.filter((token) => token.type === "end" && token.name === name);
}

export function isComplex(value) {
  return value !== null && COMPLEX_VALUE_PATTERN.test(value);
}
