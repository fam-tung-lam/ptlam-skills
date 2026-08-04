# Mermaid Workflow

Load this reference only after routing content to Mermaid or the Mermaid portion
of a combined or external-composition request.

## Author and validate

1. Preserve the requested format, path, destination, and host constraints.
2. Read the active `11.16.0` index and only the selected family's versioned
   syntax/configuration references. Choose by the relationship to show, not by
   keyword matching. Prefer a stable simple family; disclose beta or
   experimental maturity.
3. Keep normalized Mermaid source canonical. Use frontmatter instead of
   deprecated directives, add concise `accTitle` and meaningful `accDescr`, and
   use deterministic IDs or fixed seeds where needed.
4. Validate the exact source with
   `node <skill-directory>/scripts/mermaid/validate.mjs <source-path>`. Mermaid
   execution verifies the active capsule and performs lazy, visible, locked
   setup in an isolated per-user cache only when needed.
5. Render once even when delivering Mermaid source so validation covers the
   pinned renderer. For a requested static output, run:

   ```text
   node <skill-directory>/scripts/mermaid/render.mjs \
     --input <source.mmd> --format <svg|png|pdf> --output <path>
   ```

   For an explicit co-primary set, pass a JSON plan instead of `--format` and
   `--output`:

   ```text
   node <skill-directory>/scripts/mermaid/render.mjs \
     --input <source.mmd> --request-set <request-set.json>
   ```

   Minimal `request-set.json`:

   ```json
   {
     "outputs": [
       { "format": "svg", "output": "out/diagram.svg" },
       { "format": "mmd", "output": "out/diagram.mmd" }
     ]
   }
   ```

   The exact output-specification and static Markdown linked-assets schemas are
   in `output-routing.md`. Run either command with `--help` for the clean-room
   CLI surface.

6. Inspect the actual output for clipping, overlap, readability, contrast,
   background, non-Latin text, and intended-size presentation. Parse success is
   insufficient. PDF uses the pinned CLI fit-to-page option; inspect its actual
   page bounds and presentation after rendering.
7. Return only the requested primary artifact or exact explicit co-primary set.
   Report Mermaid core/CLI version, capsule identity, detected family, source
   SHA-256, result, warnings, and unverified checks without creating an
   unrequested evidence sidecar.

## Consumer and host behavior

Identify the consumer when possible. Prefer compatible syntax without weakening
meaning. When a Markdown host's Mermaid version differs or is unknown, state
that validation used `11.16.0`, warn about drift, use conservative syntax when
meaning survives, and recommend static SVG or PNG when exact rendering matters.

For combined HTML, supply pinned accessible SVG plus canonical source evidence;
let HTML own the final page and browser QA. For a rich externally composed
artifact, provide temporary validated SVG by default plus an internal text
alternative and capsule evidence; let the outer capability own final
composition, accessibility, and delivery.

Excalidraw is an optional separately pinned adapter. Preserve Mermaid source as
authority and disclose whether conversion yields native editable shapes or an
image fallback.
