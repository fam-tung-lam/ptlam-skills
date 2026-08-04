# Combined HTML and Mermaid contract

Use this seam only after routing selects a complete HTML artifact containing one
or more Mermaid-derived diagrams.

## Ownership

- HTML source owns page structure, narrative, styles, and interaction.
- Normalized Mermaid source owns each Mermaid-derived diagram.
- The delivered HTML is complete without JavaScript or a Mermaid browser
  runtime.

Validate source and render accessible inline SVG with the active pinned capsule
before assembly. Put `data-ptv-diagram-rendered` and the safe
`data-ptv-diagram-id` directly on the rendered SVG root. Preserve its non-empty
`title` and `desc`, role, `aria-labelledby`, and `aria-describedby`. Do not
embed scripts, `foreignObject`, event handlers, or remote SVG resources.

Store one inert `script` element per diagram with type
`application/vnd.ptlam.visualization.mermaid-source+json;version=1`,
`data-ptv-diagram-source`, the matching diagram ID, and canonical JSON encoded
as standard base64. The record contains exactly:

1. `schemaVersion`
2. `diagramId`
3. `sourceEncoding`
4. normalized `source`
5. `sourceSha256`
6. `mermaidVersion`
7. `capsuleId`

Normalize source as UTF-8 by removing one leading BOM, converting CRLF/CR to LF,
normalizing Unicode to NFC, preserving other whitespace, and ending with exactly
one LF. Hash those normalized UTF-8 bytes. `capsuleId` must equal the active
`MANIFEST.json` `capsuleIdentity.value`; any other SHA-256 is invalid.

## Supported assembly interface

Import the public programmatic seam from the installed skill path. Replace
`/absolute/path/to/ptlam-visualization` below with the absolute installed skill
directory. The module is ESM and the import path names the file directly.

```js
import {
  ScaffoldError,
  assembleDocument,
} from "/absolute/path/to/ptlam-visualization/scripts/html/scaffold.mjs";
```

Its exact signature is:

```js
assembleDocument({
  title, // required non-blank string; escaped into document text
  lang, // required well-formed language tag
  capability = "html", // use exactly "combined" for this flow
  trustedContent = "", // required combined SVG plus record markup
}); // Promise<string>
```

For `capability: "combined"`, `trustedContent` must contain one accessible
inline SVG and one matching inert source-record element for every diagram. Build
that markup only from the pinned renderer output and the exported helpers in
`scripts/html/lib/embedded-mermaid-record.mjs`; never pass arbitrary user HTML.
The function validates every record, active capsule identity, SVG safety and
one-to-one association before assembly. It returns the complete HTML string with
exactly one trailing LF and exactly one `content="combined"` capability field.
It writes no file and never overwrites an output. Invalid arguments reject with
`ScaffoldError` whose `code` is `assembly`. Invalid combined content rejects
with `EmbeddedMermaidRecordError` and its specific combined-contract code.

Minimal assembly example:

```js
import {
  activeMermaidCapsule,
  createEmbeddedMermaidRecord,
  embeddedMermaidRecordElement,
  markRenderedMermaidSvg,
} from "/absolute/path/to/ptlam-visualization/scripts/html/lib/embedded-mermaid-record.mjs";
import { assembleDocument } from "/absolute/path/to/ptlam-visualization/scripts/html/scaffold.mjs";

const source = `flowchart LR
  accTitle: Main flow
  accDescr: Start leads to done.
  A[Start] --> B[Done]
`;
const { capsuleId } = await activeMermaidCapsule();
const record = await createEmbeddedMermaidRecord({
  diagramId: "main-flow",
  source,
  capsuleId,
});

// Use SVG produced and validated by the pinned Mermaid route in real work.
const renderedSvg = `<svg xmlns="http://www.w3.org/2000/svg" role="img"
  aria-labelledby="main-flow-title" aria-describedby="main-flow-description"
  viewBox="0 0 100 40">
  <title id="main-flow-title">Main flow</title>
  <desc id="main-flow-description">Start leads to done.</desc>
  <path d="M0 20h100" />
</svg>`;
const markedSvg = markRenderedMermaidSvg(renderedSvg, record.diagramId);
const html = await assembleDocument({
  title: "Flow report",
  lang: "en",
  capability: "combined",
  trustedContent: `${markedSvg}\n${embeddedMermaidRecordElement(record)}`,
});
```

The public scaffold CLI remains HTML-only and never inspects the Mermaid
manifest or setup. Use the programmatic interface only after routing has
selected combined HTML.

Normal viewing must never parse or execute this record. Use
`scripts/html/extract-mermaid.mjs` to list or safely extract verified source.
Return only the HTML unless the user explicitly requested a co-primary source or
render file. Listing and validation create no source sidecar; extraction writes
only the explicitly named output and refuses overwrite. Run both Mermaid proof
and final HTML browser QA.

This seam is not a generic chart or map renderer. A specialized plot, chart,
map, or spatial capability owns its visualization semantics, transformations,
scales/projection, accessibility, and validation. HTML may compose that
capability's already validated output into a richer page, then owns the page
embedding and final browser QA. Do not label that composition as combined
Mermaid unless it also contains a Mermaid diagram and satisfies this complete
source-record contract.
