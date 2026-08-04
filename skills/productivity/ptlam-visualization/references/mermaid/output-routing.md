# Mermaid Output Routing

Choose output only after the content fits Mermaid. Preserve an exact user format
or destination constraint.

| Request                                      | Deliver                                                       | Validation and delivery                                                               |
| -------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Mermaid code for Markdown                    | Fenced `mermaid` source                                       | Validate and render once; state tested version and host drift                         |
| Editable source file                         | `.mmd`                                                        | Normalize, validate, render once, and refuse unrelated overwrite                      |
| Generic image of a focused supported diagram | `.png`                                                        | Render with active capsule, inspect pixels, and attach a text alternative             |
| Vector/web diagram                           | `.svg`                                                        | Preserve title, description, and ARIA relationships; inspect bounds                   |
| Standalone printable diagram                 | `.pdf`                                                        | Use pinned fit-to-page rendering, inspect page bounds, and provide a text alternative |
| Markdown with static assets                  | `.md` plus only requested linked assets                       | Validate source, render assets, and verify every generated link                       |
| HTML containing a diagram                    | Pre-rendered accessible SVG plus inert embedded source record | Mermaid proves diagram; HTML validates and delivers the assembled page                |
| Excalidraw/whiteboard                        | Adapter-specific output                                       | State adapter version and native-shape versus image fallback                          |

## Static Markdown interface

Use native Mermaid Markdown by default when the destination can render the
tested syntax. When the user explicitly requests static linked assets, provide
an exact asset plan to the existing render command:

```text
node <skill-directory>/scripts/mermaid/render.mjs \
  --input <source.mmd> \
  --format markdown \
  --output <document.md> \
  --markdown-mode static \
  --linked-assets <asset-plan.json>
```

The asset plan contains only the requested SVG and PNG outputs. The renderer
uses canonical Mermaid source for every asset, derives useful alt text from
`accDescr`, writes portable relative links, verifies every link against its
rendered file, and returns per-file plus set-level evidence. It creates the
Markdown file only after every requested linked asset succeeds. A partial asset
failure remains visible, suppresses the Markdown file, and never creates an
unrequested source, preview, accessibility, or evidence companion.

The linked-assets plan has this exact JSON shape. `assets` contains 1 through 8
items; every `output` is a distinct path and every `format` is `svg` or `png`:

```json
{
  "assets": [
    { "format": "svg", "output": "docs/assets/request-flow.svg" },
    { "format": "png", "output": "docs/assets/request-flow.png" }
  ]
}
```

The same specification may appear inside `--request-set` as a Markdown output
with `markdownMode: "static"` and an explicit `linkedAssets` array. Output paths
must be unique across the complete co-primary set.

`--request-set` accepts one JSON object with an `outputs` array of 2 through 8
co-primary specifications. Each specification has this schema:

| Field              | Type                                            | Required                                      |
| ------------------ | ----------------------------------------------- | --------------------------------------------- |
| `format`           | `svg`, `png`, `pdf`, `code`, `mmd`, `markdown`  | always                                        |
| `output`           | path string                                     | every format except `code`                    |
| `deliveryMode`     | `standard`, `file-only`, `external-composition` | optional                                      |
| `altChannel`       | `handoff`, `attachment`, `metadata`, `none`     | optional                                      |
| `consumerVersion`  | version string                                  | optional for source/Markdown host disclosure  |
| `markdownMode`     | `native` or `static`                            | optional; Markdown only                       |
| `linkedAssets`     | linked-asset item array                         | static Markdown unless `linkedAssetsPath` set |
| `linkedAssetsPath` | linked-assets plan path                         | optional alternative to `linkedAssets`        |

Use no other fields. A minimal request set is:

```json
{
  "outputs": [
    { "format": "svg", "output": "out/request-flow.svg" },
    { "format": "mmd", "output": "out/request-flow.mmd" }
  ]
}
```

For static Markdown, a specification may instead embed the same item shape:

```json
{
  "outputs": [
    {
      "format": "markdown",
      "output": "docs/request-flow.md",
      "markdownMode": "static",
      "linkedAssets": [
        { "format": "svg", "output": "docs/assets/request-flow.svg" }
      ]
    },
    { "format": "code" }
  ]
}
```

Mermaid 11.16.0 families whose grammar rejects native `accTitle` and `accDescr`
use the pinned, inert `%% ptlam-acc-title:` and `%% ptlam-acc-description:`
adapter comments. Leading horizontal indentation is allowed, but the markers
themselves are exact. The pinned renderer converts that metadata into semantic
SVG and uses the same description as the PNG/PDF text alternative. Native
Mermaid hosts may ignore these adapter comments, so source, `.mmd`, and native
Markdown delivery must disclose that limitation and recommend a pinned static
SVG when accessibility is required. Do not create an accessibility sidecar.

Return one primary output unless the user explicitly names several. An explicit
set is co-primary: preserve every requested member, validate each through its
owner, and report per-file plus set-level evidence. Aggregate and deduplicate
item-level unverified checks at set level; a successfully written set remains
`unverified`, not complete, while any required inspection is outstanding. Never
add `.mmd`, a preview, or a text sidecar merely because it exists internally.

PDF rendering uses the pinned Mermaid CLI `--pdfFit` behavior so the chart uses
the page appropriately. Inspect the actual `MediaBox` and presentation; a valid
PDF signature or page count alone does not prove useful fit.

Accessibility text is required but is not automatically another artifact. For
“file only” delivery, use a supported attachment alt field or file metadata. If
the destination cannot carry it and the user also forbids a concise handoff,
disclose the conflict and ask before delivery; do not silently omit it or create
an unrequested sidecar.

For rich PDF, presentation, document, or another external composition, the outer
capability owns the final artifact. Pass temporary validated SVG, canonical
source, capsule evidence, and a text alternative internally. Do not return those
inputs unless requested and do not claim combined-HTML guarantees.
