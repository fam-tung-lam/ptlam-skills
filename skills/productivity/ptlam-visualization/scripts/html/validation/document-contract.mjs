import { ends, isComplex, location, starts } from "./html-source.mjs";

// Document contract: required structure, metadata, and combined ownership.
function checkRequiredElement(report, scan, source, name) {
  const opening = starts(scan.tokens, name);
  const closing = ends(scan.tokens, name);
  const hasStructuralAmbiguity = scan.ambiguities.some((ambiguity) =>
    /markup|closing-tag|Template|processing|declaration/i.test(ambiguity),
  );

  if (opening.length === 0) {
    if (!hasStructuralAmbiguity) {
      report.error(
        "document-structure",
        `Required <${name}> element is missing.`,
      );
    }
    return null;
  }
  if (opening.length > 1) {
    report.error(
      "document-structure",
      `Expected one <${name}> element, found ${opening.length}.`,
    );
  }
  if (closing.length === 0 && !opening[0].selfClosing) {
    if (!hasStructuralAmbiguity) {
      report.error(
        "document-structure",
        `Required </${name}> closing tag is missing.`,
      );
    }
  } else if (closing.length > 1) {
    report.error(
      "document-structure",
      `Expected one </${name}> closing tag, found ${closing.length}.`,
    );
  }
  if (opening[0].selfClosing) {
    report.error(
      "document-structure",
      `Required <${name}> element must not be self-closing.`,
    );
  }
  if (closing[0] && opening[0].position > closing[0].position) {
    report.error(
      "document-structure",
      `<${name}> closes before it opens at ${location(source, closing[0].position)}.`,
    );
  }
  return opening[0];
}

function checkDocumentStructure(report, scan, source) {
  const doctypes = scan.tokens.filter((token) => token.type === "doctype");
  const hasStructuralAmbiguity = scan.ambiguities.some((ambiguity) =>
    /markup|closing-tag|Template|processing|declaration/i.test(ambiguity),
  );
  if (doctypes.length === 0) {
    if (hasStructuralAmbiguity) {
      report.unverified(
        "document-doctype",
        "The HTML5 DOCTYPE cannot be verified while structural source syntax is ambiguous.",
      );
    } else {
      report.error(
        "document-doctype",
        "Required HTML5 DOCTYPE is missing. Add <!doctype html>.",
      );
    }
  } else {
    if (doctypes.length > 1) {
      report.error(
        "document-doctype",
        `Expected one DOCTYPE, found ${doctypes.length}.`,
      );
    }
    if (!/^<!doctype\s+html\s*>$/i.test(doctypes[0].raw)) {
      report.error(
        "document-doctype",
        "DOCTYPE must use the HTML5 form <!doctype html>.",
      );
    }
  }

  const html = checkRequiredElement(report, scan, source, "html");
  const head = checkRequiredElement(report, scan, source, "head");
  const body = checkRequiredElement(report, scan, source, "body");
  const htmlEnd = ends(scan.tokens, "html")[0];
  const headEnd = ends(scan.tokens, "head")[0];
  const bodyEnd = ends(scan.tokens, "body")[0];

  if (
    html &&
    head &&
    body &&
    !(html.position < head.position && head.position < body.position)
  ) {
    report.error(
      "document-structure",
      "Required elements must be ordered as <html>, <head>, then <body>.",
    );
  }
  if (head && headEnd && body && headEnd.position > body.position) {
    report.error(
      "document-structure",
      "<head> must close before <body> opens.",
    );
  }
  if (body && bodyEnd && htmlEnd && bodyEnd.position > htmlEnd.position) {
    report.error("document-structure", "<body> must close before </html>.");
  }
  if (doctypes[0] && html && doctypes[0].position > html.position) {
    report.error(
      "document-structure",
      "DOCTYPE must appear before the <html> element.",
    );
  }

  return { html, head, body, headEnd };
}

function metaTokens(scan, name) {
  return starts(scan.tokens, "meta").filter(
    (token) => token.attributes.get("name")?.trim().toLowerCase() === name,
  );
}

function checkNamedMeta(report, scan, name, expectedContent, label) {
  const matches = metaTokens(scan, name);
  if (matches.length === 0) {
    const ambiguousMeta = starts(scan.tokens, "meta").some(
      (token) => token.ambiguous,
    );
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
    report.error(
      `metadata-${name}`,
      `${label} must occur once; found ${matches.length}.`,
    );
  }

  const content = matches[0].attributes.get("content");
  if (content === undefined || content === null || content.trim() === "") {
    report.error(
      `metadata-${name}`,
      `${label} needs a non-empty content attribute.`,
    );
  } else if (isComplex(content)) {
    report.unverified(
      `metadata-${name}`,
      `${label} uses a dynamic value that cannot be verified statically.`,
    );
  } else if (expectedContent !== null) {
    const supportedContents = Array.isArray(expectedContent)
      ? expectedContent
      : [expectedContent];
    if (supportedContents.includes(content.trim())) return;
    const expectedDescription = supportedContents
      .map((value) => `content="${value}"`)
      .join(" or ");
    report.error(
      `metadata-${name}`,
      `${label} must have ${expectedDescription}; found content="${content.trim()}".`,
    );
  }
}

function checkMetadata(report, scan, structure, expectedCapability) {
  if (structure.html) {
    const language = structure.html.attributes.get("lang");
    if (language === undefined || language === null || language.trim() === "") {
      report.error(
        "document-language",
        "The <html> element needs a non-empty lang attribute.",
      );
    } else if (isComplex(language)) {
      report.unverified(
        "document-language",
        "The dynamic <html lang> value cannot be verified statically.",
      );
    } else if (!/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(language.trim())) {
      report.error(
        "document-language",
        `The <html lang> value "${language.trim()}" is not a well-formed language tag.`,
      );
    }
  }

  const allTitles = starts(scan.tokens, "title");
  const titles =
    structure.head && structure.headEnd
      ? allTitles.filter(
          (title) =>
            title.position > structure.head.position &&
            title.position < structure.headEnd.position,
        )
      : allTitles;
  if (titles.length === 0) {
    const hasStructuralAmbiguity = scan.ambiguities.some((ambiguity) =>
      /markup|closing-tag|Template|processing|declaration/i.test(ambiguity),
    );
    if (hasStructuralAmbiguity) {
      report.unverified(
        "document-title",
        "The required <title> cannot be verified while structural source syntax is ambiguous.",
      );
    } else {
      report.error(
        "document-title",
        "A non-empty <title> inside <head> is required.",
      );
    }
  } else {
    if (titles.length > 1) {
      report.error(
        "document-title",
        `Expected one <title>, found ${titles.length}.`,
      );
    }
    const title = titles[0];
    if (title.content && isComplex(title.content)) {
      report.unverified(
        "document-title",
        "Dynamic <title> content cannot be verified as readable text.",
      );
    } else if (
      !title.content ||
      title.content.replace(/&(?:nbsp|#160|#x0*a0);/gi, " ").trim() === ""
    ) {
      report.error(
        "document-title",
        "The <title> element must contain readable text.",
      );
    }
    if (
      structure.head &&
      structure.headEnd &&
      !(
        title.position > structure.head.position &&
        title.position < structure.headEnd.position
      )
    ) {
      report.error(
        "document-title",
        "The <title> element must be inside <head>.",
      );
    }
  }

  const viewport = metaTokens(scan, "viewport");
  if (viewport.length === 0) {
    const ambiguousMeta = starts(scan.tokens, "meta").some(
      (token) => token.ambiguous,
    );
    if (ambiguousMeta) {
      report.unverified(
        "metadata-viewport",
        "Viewport metadata could not be resolved because a <meta> element uses ambiguous source syntax.",
      );
    } else {
      report.error(
        "metadata-viewport",
        "Viewport metadata is missing. Add width=device-width.",
      );
    }
  } else {
    if (viewport.length > 1) {
      report.error(
        "metadata-viewport",
        `Viewport metadata must occur once; found ${viewport.length}.`,
      );
    }
    const content = viewport[0].attributes.get("content");
    if (content === undefined || content === null || content.trim() === "") {
      report.error(
        "metadata-viewport",
        "Viewport metadata needs a non-empty content attribute.",
      );
    } else if (isComplex(content)) {
      report.unverified(
        "metadata-viewport",
        "Dynamic viewport metadata cannot be verified statically.",
      );
    } else if (!/(?:^|,)\s*width\s*=\s*device-width\s*(?:,|$)/i.test(content)) {
      report.error(
        "metadata-viewport",
        "Viewport metadata must include width=device-width.",
      );
    }
  }

  checkNamedMeta(
    report,
    scan,
    "generator",
    "ptlam-visualization",
    "Generator metadata",
  );
  checkNamedMeta(
    report,
    scan,
    "ptlam-visualization-version",
    "1",
    "ptlam-visualization version metadata",
  );
  checkNamedMeta(
    report,
    scan,
    "ptlam-visualization-capability",
    expectedCapability,
    "ptlam-visualization capability metadata",
  );
  checkNamedMeta(
    report,
    scan,
    "ptlam-visualization-design-system-version",
    ["1", "2"],
    "ptlam-visualization design-system version metadata",
  );
}

function combinedContractSignalsPresent(scan) {
  return (
    starts(scan.tokens, "script").some(
      (token) =>
        token.attributes.has("data-ptv-diagram-source") ||
        token.attributes
          .get("type")
          ?.startsWith(
            "application/vnd.ptlam.visualization.mermaid-source+json",
          ),
    ) ||
    scan.tokens.some(
      (token) =>
        token.type === "start" &&
        (token.attributes.has("data-ptv-diagram-rendered") ||
          token.attributes.has("data-ptv-diagram-id")),
    )
  );
}

function declaredCapability(scan) {
  return metaTokens(scan, "ptlam-visualization-capability")[0]
    ?.attributes.get("content")
    ?.trim();
}

async function checkCombinedContract(report, source) {
  try {
    const { parseEmbeddedMermaidRecords } =
      await import("../lib/embedded-mermaid-record.mjs");
    await parseEmbeddedMermaidRecords(source);
  } catch (error) {
    report.error(
      `combined-${error.code ?? "contract"}`,
      `Combined HTML contract failed: ${error.message}`,
    );
  }
}

export async function validateDocumentContract(report, scan, source) {
  const structure = checkDocumentStructure(report, scan, source);
  const combinedSignals = combinedContractSignalsPresent(scan);
  const combinedDeclared = declaredCapability(scan) === "combined";
  checkMetadata(report, scan, structure, combinedSignals ? "combined" : "html");
  if (combinedSignals || combinedDeclared) {
    await checkCombinedContract(report, source);
  }
}
