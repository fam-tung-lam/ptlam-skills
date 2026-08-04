# Quality and Safety Checks

Use these checks while authoring and before delivery. A portable artifact is
complete only when its content remains trustworthy, its local behavior respects
the v1 boundary, and the real artifact has been checked in a browser.

## Contents

- [Content integrity](#content-integrity)
- [Privacy, security, and network boundaries](#privacy-security-and-network-boundaries)
- [Portability, size, and lifecycle](#portability-size-and-lifecycle)
- [Deterministic checks](#deterministic-checks)
- [Browser DOM and visual checks](#browser-dom-and-visual-checks)
- [Required execution matrix](#required-execution-matrix)
- [Delivery evidence](#delivery-evidence)
- [Severity and disclosure](#severity-and-disclosure)

## Content integrity

- Preserve exact facts, numbers, units, code, quotations, and uncertainty. Do
  not remove inconvenient evidence to simplify a view.
- Label evidence, inference, recommendation, uncertainty, and open questions so
  a reader can distinguish them. Place source links close to supported claims.
- Label axes, scales, legends, time ranges, aggregations, and transformations.
- Label an existing interface as current only when supported by current
  evidence. Label a proposed interface as a concept or mockup. Label a
  reconstruction as a reconstruction and state its basis and gaps.
- Distinguish current and proposed state in words, not by color alone.
- Keep every essential conclusion and material caveat available without
  JavaScript. See [workflow.md](workflow.md) for visual alternatives.

## Privacy, security, and network boundaries

- Do not add analytics, telemetry, tracking pixels, hidden requests, uploads,
  publishing, hosting, sharing, feedback submission, or agent calls. V1 never
  publishes or shares an artifact.
- Treat local search, filter, select, and reset controls as read-only
  presentation controls, not a data-entry flow. Group related controls with a
  `fieldset` and `legend` or another semantic container instead of a `form`. Do
  not add `action`, `method`, submit or form-reset controls, or implicit Enter
  submission. Give scripted action buttons `type="button"`.
- Obtain user consent before adding any new CDN dependency. Do not download a
  resource silently or treat an available CDN as consent.
- Escape imported text, data, and code instead of injecting raw HTML. Avoid
  `eval`, constructed scripts, inline event handlers, and unsafe URL schemes.
- Open external links safely. Do not embed secrets, unrelated local files,
  usernames, conversation IDs, private local paths, or authenticated browser
  data.
- Run automated QA in a fresh isolated, unsigned-in browser context. Never use
  the user's signed-in profile for automation.

## Portability, size, and lifecycle

- Default to one HTML file with inline CSS, JavaScript, and data. Require no
  build, package install, dedicated server, or agent runtime to read it.
- Use sibling files only for justified large media. Report a warning, not an
  error by default, for an asset over 10 MB or total artifact resources over 25
  MB. Explain the likely loading or portability cost.
- Follow the requested path, then an existing project artifact convention, then
  `.ptlam/ptlam-visualization/<descriptive-name>.html`. Do not silently
  overwrite an unrelated file.
- Never delete old artifacts automatically, migrate them on release, or upgrade
  an embedded design-system version without an explicit request.
- Do not add user artifacts under `.ptlam/` to Git or alter `.gitignore`, stage,
  or commit them without an explicit request. Purpose-built repository fixtures
  are the testing exception.

## Deterministic checks

For a new HTML-only artifact, require each unified metadata field exactly once:

```html
<meta name="generator" content="ptlam-visualization" />
<meta name="ptlam-visualization-version" content="1" />
<meta name="ptlam-visualization-capability" content="html" />
<meta name="ptlam-visualization-design-system-version" content="2" />
```

For a combined artifact, change only capability metadata to
`content="combined"`. Require at least one accessible inline SVG and exactly one
matching inert Mermaid source record per diagram. Validate each record against
the active manifest capsule identity before final HTML validation. The static
validator must reject malformed records, wrong version/capsule evidence,
duplicate or orphan associations, executable SVG content, and remote SVG
resources.

Run the static validator against the delivered file. Source and filesystem
checks can establish readable input, required metadata, `lang`, title, viewport,
safe links, missing local assets, accidental remote dependencies, size-warning
thresholds, and obvious bundled overflow hazards.

Classify a finding as `UNVERIFIED` when source syntax prevents a reliable
conclusion. Text or regular-expression matching must never be reported as proof
of parsed DOM semantics. Static validation does not replace browser QA.

## Browser DOM and visual checks

Use the rendered DOM to check unique IDs, valid local fragment targets,
landmarks, heading order, and accessible control names. Then inspect the real
rendering for:

- every interactive control with touch, mouse where available, and keyboard;
- logical keyboard order, no keyboard trap, and clearly visible focus;
- readable contrast in supported themes and states;
- reduced-motion behavior whenever animation exists;
- horizontal overflow, clipping, overlap, occlusion, and broken assets;
- responsive tables, code, diagrams, labels, and controls; and
- console errors or failed resource loads.

For combined artifacts, check the final embedded diagram at the intended size,
320 CSS pixels, 200% zoom, and every supported theme. Standalone SVG proof does
not establish final-page containment, contrast, labels, or focus behavior.

For search, filter, select, and reset controls, press Enter where applicable and
verify that no navigation, reload, request, form submission, or decision
collection occurs.

Check that disabling JavaScript leaves the core content and conclusion readable.

## Required execution matrix

Design for current Chrome, Edge, Firefox, and Safari. These are compatibility
targets, not a claim that every run automated all four.

Before delivery, execute an automated Chromium-family browser at desktop width,
at 320 CSS pixels, and at 200% browser zoom or equivalent effective layout
pressure. Also open the artifact successfully in the user's default system
browser. Run other target browsers when available and name every target not
executed.

Keep the automated context isolated and unsigned-in. Close temporary QA browsers
and servers created for the check after recording evidence.

## Delivery evidence

For each executed condition, record:

- browser name and exact version;
- viewport dimensions, zoom, or equivalent layout-pressure condition;
- controls exercised and interaction result;
- keyboard, focus, contrast, reduced-motion, and overflow result as applicable;
- console and resource-load result; and
- pass, fail, or `UNVERIFIED` outcome.

Record the default-browser open result and list unexecuted Chrome, Edge,
Firefox, or Safari targets explicitly. Never turn an incomplete check into a
pass.

## Severity and disclosure

- **Blocking:** repair a fatal document, missing required asset, missing core
  content, broken critical control, or confirmed severe responsive or
  accessibility failure before delivery.
- **Warning:** report size thresholds and optional-asset problems with their
  impact; they are not errors by default.
- **Non-blocking:** cosmetic, minor, transient, or uncertain findings do not
  block a readable artifact by default.
- **Unverified:** retry a reasonable check, then deliver a readable artifact
  only with a precise disclosure of what could not be established and why.
