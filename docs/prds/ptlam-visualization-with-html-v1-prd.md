# PRD: `ptlam-visualization-with-html` v1

## Document status

- Status: Approved for implementation
- Date: 2026-08-03
- Product: `ptlam-skills`
- Skill: `ptlam-visualization-with-html`
- Category: `productivity`

## Summary

`ptlam-visualization-with-html` turns complex agent responses into polished,
interactive, local HTML artifacts that are easier to scan, understand, and
explore than a Markdown file or long chat response.

The skill is presentation-only in v1. It does not provide annotations, chat,
feedback submission, sessions, persistence, hosting, or public sharing. Its
implementation and fallback design system are original and standalone.

## Problem

Long Markdown reports flatten relationships, priorities, comparisons, and
interactive exploration into one reading path. Agents also recreate visual
styles and browser checks inconsistently, producing artifacts that are hard to
maintain or trust.

Users need a local artifact that:

- makes the important outcome visible first;
- preserves complete supporting detail;
- adapts the visual form to the information rather than forcing one template;
- works in the user's browser without a dedicated application;
- respects user preferences, project identity, privacy, and accessibility; and
- is produced through a repeatable, testable agent workflow.

## Goals

1. Provide one portable Agent Skill that can create interactive HTML for any
   content when visual presentation materially improves understanding.
2. Make the HTML artifact the complete primary deliverable, with chat used only
   for a concise handoff.
3. Give agents a universal visualization-selection algorithm rather than a fixed
   allowlist of artifact types.
4. Ship an original, reusable, customizable design system as a fallback.
5. Keep the skill understandable, maintainable, extensible, and local-first.
6. Require deterministic validation plus real-browser verification.

## Non-goals for v1

- Element or text annotation
- Chat or feedback from inside the artifact
- Form submission or decision collection
- Persistent application state
- A local server, daemon, session store, or whiteboard runtime
- Uploading, hosting, publishing, or public/private share links
- A full application UI framework
- Automatic migration of previously generated artifacts
- A custom skill installer, updater, or host integration layer
- Copying another product's source, styling, wording, branding, or architecture

## Users and key journeys

### Explicit request

The user asks for an interactive HTML page, visual report, explainer,
comparison, plan, review surface, or similar artifact. The agent uses the skill
and delivers a local HTML file.

### Automatic use

The user asks a complex question without naming HTML. The agent uses the skill
only when visual structure materially improves comprehension. Short or simple
answers remain in chat.

### Continue an artifact

The user asks to update an artifact created earlier in the same task. The agent
updates that file without silently upgrading its embedded design-system version.

## Product requirements

### Trigger policy

Use a hybrid trigger:

1. Always trigger for an explicit request for interactive HTML or a visual
   review artifact.
2. Otherwise identify the user's goal and the information structure.
3. Trigger only when a visual representation materially improves understanding.
4. Prefer a normal chat response for simple facts, short explanations, or a
   single straightforward action.

### Visualization selection

The agent must:

1. Identify what the user needs to understand, compare, decide, inspect, or
   explore.
2. Detect the natural structure of the information, such as sequence, hierarchy,
   relationships, quantities, records, space, or source code.
3. Choose the smallest useful visual treatment.
4. Combine treatments only when the content needs them.
5. Ask a question only when a choice could materially change meaning or scope.

Named patterns may be documented as examples, but never form an allowlist.

### Preference priority

Resolve presentation choices in this order:

1. Explicit instructions in the current request
2. Explicit decisions in the active conversation
3. Stable user preferences available in context
4. The subject project's design and content conventions
5. The skill's fallback design system

Specific and recent preferences override general or older preferences. An
inferred preference never overrides an explicit instruction.

### Design direction

1. Follow a user-requested style or named design system.
2. Otherwise inspect and match the subject project's design system or brand.
3. Otherwise use the original bundled `ptlam-visualization-with-html` design
   system.

### Interaction boundary

V1 interactions are for read-only exploration. Appropriate examples include
tabs, disclosures, search, filters, sorting, toggles, highlighting, diagram
controls, copy actions, and small explanatory simulations.

The artifact must not collect responses, submit forms, persist decisions, call
an agent, or imply that feedback will be delivered. Every essential conclusion
must remain understandable without interaction.

### Progressive enhancement

- Keep core content and conclusions in the document without requiring
  JavaScript.
- Use JavaScript to enhance navigation or exploration.
- Provide a text description or data table for Canvas, complex charts, and
  interactive diagrams.
- Prefer native HTML controls when they solve the problem.
- Isolate behaviors so one failure does not break the whole page.

### Artifact completeness

- The HTML file is the primary, complete deliverable.
- Include necessary explanation, evidence, sources, caveats, and conclusions.
- Use progressive disclosure instead of dropping important detail.
- Do not create a duplicate Markdown report unless the user requests it.

### Language

- Use the language of the current request.
- Use the active conversation language when the request is ambiguous.
- Preserve source terms, code, and quotations when translation would distort
  them.
- Set the correct document `lang` attribute.
- Create multilingual output only on request.

## Artifact storage and lifecycle

### Default location

Store multiple artifacts under:

```text
.ptlam/ptlam-visualization-with-html/<descriptive-name>.html
```

Use this placement order:

1. An exact path requested by the user
2. An existing artifact convention in the subject project
3. The default directory above

Use descriptive kebab-case filenames. Reuse a file only when continuing the same
artifact. Never silently overwrite an unrelated file; use a numeric suffix when
two different artifacts need the same natural name.

Large images, screenshots, video, or similar media may live under a sibling
directory when embedding them would be unreasonable.

### Lifecycle

- Never delete old artifacts automatically.
- Never add user-created artifacts under `.ptlam/` to Git, modify `.gitignore`,
  stage, or commit them unless the user explicitly requests it.
- Repository-owned fixtures under
  `tests/skills/productivity/ptlam-visualization-with-html/` may be tracked when
  they are purpose-built test inputs or expected outputs rather than user
  deliverables.
- Never migrate old artifacts automatically when the skill is released.
- Upgrade an existing artifact only on explicit user request.

### Metadata

Generated files must include non-sensitive ownership metadata:

```html
<meta name="generator" content="ptlam-visualization-with-html" />
<meta name="ptlam-visualization-with-html-version" content="1" />
```

Do not store usernames, conversation identifiers, local paths, or private
context in generator metadata.

## Portability and technology

### Output contract

- Default to one portable HTML file with inline CSS, JavaScript, and data.
- Do not require a build step, package install, dedicated server, or agent
  runtime to read the artifact.
- Permit sibling files only for justified large media or assets.
- Constrain the output contract, not the authoring technology.

The agent should prefer semantic HTML, modern CSS, and small JavaScript, but may
use another framework or library when it materially improves the result and
still satisfies the output contract.

### Network dependencies

- Do not use a new CDN dependency without user consent.
- Locally available or bundled dependencies may be used without another
  question.
- Do not make hidden network requests.
- V1 has no upload, hosting, publishing, or sharing capability.

## Design system

The skill includes a proper, original design system under:

```text
assets/design-system/
├── tokens/
├── foundations/
├── components/
├── behaviors/
├── icons/
└── templates/
```

### Required foundations

- Color, typography, spacing, radius, elevation, motion, and breakpoint tokens
- Reset and semantic document defaults
- Responsive layout primitives
- Visible focus and keyboard affordances
- Reduced-motion support
- Print styles
- Light and dark theme tokens

### Required component coverage

- Content structure: document shell, section, stack, grid, split layout
- Content display: cards, callouts, badges, stats, quotes, and code blocks
- Dense information: responsive tables and key-value data
- Navigation: table of contents, tabs, and disclosures
- Exploration: search/filter, sorting, highlighting, and copy controls

Use CSS custom properties, semantic HTML patterns, composable classes, and small
JavaScript controllers activated through `data-*` attributes. Avoid Shadow DOM
and custom elements in the fallback design system. Inline only the parts an
artifact uses.

Support both light and dark themes, follow the system preference by default, and
add a visible toggle only when useful. Do not persist the selection in v1.

## Skill architecture

The skill lives at:

```text
skills/productivity/ptlam-visualization-with-html/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── visualization.md
│   ├── design-system.md
│   └── quality-and-safety.md
├── scripts/
│   ├── scaffold.mjs
│   └── validate.mjs
└── assets/
    └── design-system/
        ├── tokens/
        ├── foundations/
        ├── components/
        ├── behaviors/
        ├── icons/
        └── templates/

tests/
└── skills/
    └── productivity/
        └── ptlam-visualization-with-html/
```

### Module principles

- `SKILL.md` is the small external interface for the agent.
- The scaffold module hides assembly and resource inlining.
- The validator module hides deterministic static checks.
- The design system exposes a small customization interface through tokens,
  components, and behaviors.
- References explain decisions without duplicating implementation.
- Avoid speculative seams, adapters, and plugin systems.
- Organize files by responsibility; do not create one shallow file per CSS
  class.

### Dependency policy

- Runtime scripts use Node.js ESM and require no external packages.
- Scripts never install packages or download resources.
- Pinned development dependencies are allowed for repository tests or builds,
  but are not required by installed skill users.
- Add a runtime dependency only when it replaces substantial complexity and can
  be delivered as a prepared local bundle.
- Inventory every bundled or development dependency, verify its license, and add
  the legally required repository-level notice when applicable.
- V1 should ship no third-party browser bundle unless an acceptance criterion
  cannot be met with the original design system and platform capabilities.

## Scaffold interface

The scaffold module must provide one stable command that:

- accepts a title, language, and output path;
- creates parent directories safely;
- refuses to overwrite by default;
- emits a complete semantic starter document;
- embeds generator metadata and the design-system version; and
- copies or inlines only required resources.

The exact internal file layout is not part of this interface.

## Validation interface

The validator module must provide one stable command that accepts an HTML path,
returns a non-zero exit code for errors, and distinguishes errors, warnings, and
unverified checks.

The static validator supports artifacts carrying the
`ptlam-visualization-with-html` generator metadata. It performs deterministic
source and filesystem checks without pretending to be a complete HTML parser.
When source syntax prevents a reliable conclusion, return `unverified` and leave
the semantic result to the browser DOM checks.

At minimum, the static validator checks:

- readable HTML file and required document metadata;
- language, title, viewport, and generator metadata;
- safe external links;
- missing local assets;
- accidental remote dependencies;
- the 10 MB per-asset and 25 MB total warning thresholds; and
- obvious horizontal-overflow hazards in bundled patterns.

At minimum, browser DOM validation checks:

- unique IDs and valid local fragment targets;
- essential semantic landmarks and heading order; and
- interactive controls with accessible names.

Static validation never replaces browser QA.

## Browser delivery and QA

### Launch order

1. Open the artifact in the device's default system browser.
2. If that browser cannot be automated, keep it as the user preview and use an
   available controllable browser only for QA. Use an isolated, unsigned-in
   context that does not access the user's authenticated browsing data.
3. If default-browser launch fails, use the best available preview capability
   and disclose the fallback.

Close temporary QA browsers and servers created by the agent when finished.

### Compatibility target

- Current Chrome, Edge, Firefox, and Safari
- Layouts down to 320 CSS pixels
- Usable at 200% browser zoom
- Touch, mouse, and keyboard input
- Graceful degradation for optional browser capabilities

Chrome, Edge, Firefox, and Safari are design compatibility targets, not a claim
that every release runs automation in all four. The required v1 execution matrix
is:

- an automated Chromium-family browser at desktop width;
- the same browser at 320 CSS pixels;
- the same browser at 200% zoom or equivalent effective layout pressure; and
- a successful open smoke check in the user's default system browser.

Run additional browser checks when the environment makes them available. State
which target browsers were not executed rather than implying full coverage.

### Required checks

- Render the real artifact in a browser.
- Check desktop and narrow mobile layouts.
- Exercise every interactive control.
- Check horizontal overflow, clipping, occlusion, broken assets, and console
  errors.
- Verify keyboard access, visible focus, readable contrast, semantic headings,
  and reduced motion when animation exists.
- Record the browser name and version, viewport or zoom condition, interaction
  result, console result, and pass/fail outcome as delivery evidence.

### Severity policy

- Repair fatal document, required-asset, core-content, or critical-control
  failures before delivery.
- Repair confirmed severe responsive or accessibility failures before delivery.
- Do not block delivery for cosmetic, minor, transient, or uncertain findings.
- Treat an incomplete check as `unverified`, never as `passed`.
- After a reasonable retry, a readable artifact may be delivered with a precise
  disclosure of the unverified area.
- Size warnings and optional-asset warnings are not errors by default.

## Security and privacy

- No analytics, telemetry, tracking pixels, hidden requests, or uploads.
- Escape imported text, data, and code rather than injecting raw HTML.
- Avoid `eval`, dynamically constructed scripts, and unsafe event handlers.
- Open external links safely.
- Never embed secrets or unrelated local files.
- Treat local file paths as private implementation details.
- Keep automated QA in an isolated, unsigned-in browser context.

## Content integrity

- Preserve exact facts, numbers, units, code, and uncertainty.
- Separate evidence, inference, recommendation, and open questions.
- Put source links close to supported claims.
- Label axes, scales, legends, time ranges, and transformations.
- Do not remove inconvenient details for visual simplicity.
- Use current screenshots for existing UI when available.
- Mark proposed UI as a concept or mockup.
- Distinguish current and proposed state clearly.

## Maintainability and extension

- Keep universal decision algorithms and placement rules independent of current
  repository paths. Treat concrete paths as examples where appropriate.
- Keep behavior contracts owned by one file and referenced elsewhere.
- Test modules through their public interface.
- Prefer a small interface with deep implementation over many shallow helpers.
- Generated artifacts embed their design-system version and remain unchanged by
  future skill releases.
- Do not add migration infrastructure for generated files.

## Validation plan

1. Run the Agent Skills structural validator.
2. Run repository Markdown formatting and lint checks.
3. Unit-test scaffold and validator behavior through their command interfaces.
4. Generate varied temporary artifacts covering technical, comparison,
   data-heavy, and non-English content. Track a repository-owned fixture only
   when it provides stable regression value.
5. Run the browser QA matrix on representative fixtures.
6. Forward-test with isolated sub-agents using realistic prompts and minimal
   context.
7. Remove only temporary forward-test artifacts created for validation.

## Acceptance criteria

V1 is complete when:

1. The skill is discoverable as `ptlam-visualization-with-html` with accurate UI
   metadata, is listed in the root and productivity catalogs, and is included in
   the Claude plugin's explicit skill manifest.
2. Explicit and automatic trigger guidance implements the hybrid policy.
3. The scaffold creates a valid artifact at the requested path without runtime
   package installation.
4. Generated artifacts use the required metadata and remain readable without
   JavaScript.
5. The fallback design system covers the required foundations, components, and
   behaviors using original implementation.
6. The validator reports actionable errors, warnings, and unverified checks.
7. At least four varied fixtures pass deterministic checks.
8. Representative fixtures pass real-browser desktop, mobile, keyboard, and
   interaction QA with the required execution-matrix evidence.
9. No v1 code uploads, publishes, stores sessions, accepts feedback, or migrates
   old artifacts.
10. Independent forward-tests show that agents can select an appropriate visual
    treatment and deliver the artifact from the skill alone.
11. Runtime and development dependencies have a recorded license review, with
    required notices present and no unapproved third-party browser bundle.
