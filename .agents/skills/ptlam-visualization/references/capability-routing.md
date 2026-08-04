# Capability Routing

Use this decision contract before loading HTML- or Mermaid-specific knowledge.

## Routing algorithm

1. Record exact user constraints: requested formats, paths, host or destination,
   language, interaction, accessibility, privacy, and delivery behavior. Never
   silently discard or substitute one.
2. Stop with explicit abstention when the user says not to visualize. Load no
   capability reference or runtime. Prefer ordinary chat for a simple fact,
   short explanation, or one straightforward action.
3. When continuing or repairing an artifact, preserve its existing mode and
   destination convention unless the requested change requires a deliberate
   migration.
4. Identify what must become easier to understand, compare, decide, inspect, or
   explore. Detect the natural structure: sequence, hierarchy, relationships,
   quantities, records, space, source code, or layered narrative.
5. Select capability fitness from that structure and requested behavior. Apply
   the preserved output format only after finding a compatible capability.
6. Choose the smallest treatment that preserves meaning. Combine capabilities
   only when the content genuinely needs both.
7. Ask only when a remaining choice would materially change meaning, scope, or
   external cost.

## Capability fitness

| Content and behavior                                                                             | Route                       | Ownership                                                                                   |
| ------------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------- |
| One focused supported relationship, flow, sequence, state, hierarchy, schedule, or diagram/chart | Mermaid                     | Canonical diagram source, pinned validation, render, and diagram accessibility              |
| Rich narrative, coordinated views, layered explanation, dense records, or read-only interaction  | HTML                        | Canonical page source, design, interaction, portability, validation, and browser QA         |
| Rich HTML page containing one or more focused diagrams                                           | Combined                    | Mermaid owns each diagram; HTML owns the assembled page and final QA                        |
| Rich non-HTML report, presentation, map, plot, image, or specialized artifact                    | External composition        | Specialized outer capability owns composition, final format, accessibility, and delivery QA |
| Simple content or no fitting visual capability                                                   | Chat or specialized handoff | Do not force HTML or Mermaid                                                                |
| Explicit request not to visualize                                                                | Abstain                     | Produce no visual artifact and load no capability data                                      |

An extension is a constraint, not proof of capability fitness. A PNG, SVG, or
PDF request for a photograph, illustration, plot, map, or multi-page report does
not become Mermaid work. Use a better available capability; if none exists,
explain the limitation instead of silently substituting HTML or Mermaid.

## Output routing

| User intent                                                            | Primary output                                  | Route           | Required proof                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------- | --------------- | ---------------------------------------------- |
| Interactive report, review, comparison, plan, or multi-panel explainer | `.html`                                         | HTML            | Static validation and real-browser QA          |
| Mermaid code or native Mermaid Markdown                                | Fenced `mermaid` source                         | Mermaid         | Parse and render once with the active capsule  |
| Reusable editable source                                               | `.mmd`                                          | Mermaid         | Parse and render once with the active capsule  |
| Generic image of a focused supported diagram                           | `.png`                                          | Mermaid         | Pinned render and visual inspection            |
| Scalable web diagram                                                   | `.svg`                                          | Mermaid         | Pinned render and SVG accessibility check      |
| Standalone printable diagram                                           | `.pdf`                                          | Mermaid         | Pinned render and page-bounds inspection       |
| Markdown with static diagram assets                                    | `.md` plus explicitly requested linked assets   | Mermaid         | Verify every transformation and generated link |
| Rich page containing diagrams                                          | `.html` with embedded accessible SVG by default | Combined        | Mermaid proof plus final HTML/browser proof    |
| Excalidraw or editable whiteboard                                      | Adapter-specific output                         | Mermaid adapter | Disclose native shapes versus image fallback   |

A generic focused-diagram image defaults to PNG only after Mermaid fitness is
established. Never return both source and render merely because both exist
internally.

## Preference precedence

Resolve presentation decisions in this order:

1. Explicit instructions in the current request
2. Explicit decisions in the active conversation
3. Stable user preferences available in context
4. Subject-project design and content conventions
5. Skill fallback defaults

A recent specific choice overrides an older general preference. Inference never
overrides an explicit instruction.

## Multi-output and source authority

Return one primary artifact by default. When the user explicitly asks for
several outputs, treat exactly those files as one co-primary set. Route each
member through its owner, validate each member, and report per-file plus
set-level evidence. Do not promote temporary source, QA renders, embedded source
records, or evidence into user deliverables.

HTML source is canonical for the page. Mermaid source is canonical for every
Mermaid-derived diagram, including one embedded in HTML. Preserve both source
authorities in a combined artifact.

## Composition ownership

For combined HTML, embed pinned pre-rendered accessible SVG by default. Mermaid
owns diagram selection, source, versioned validation, render, and text
alternative. HTML owns page hierarchy, narrative, design, interaction,
portability, embedded asset policy, final validation, and browser QA.

For a rich externally composed artifact, the outer capability owns final
composition, output format, accessibility, and delivery QA. Mermaid may provide
temporary validated SVG, canonical source, capsule evidence, and a text
alternative through an internal handoff. These inputs are not extra user
deliverables unless requested, and this flow does not claim the combined-HTML
contract.

The same ownership rule applies when a specialized plot, statistical chart, map,
floor plan, or spatial visualization appears inside a richer HTML page. Route
and validate that visualization through its specialized capability first; HTML
may compose only the validated output. The specialized capability retains
ownership of its data transformations, visual encoding, scales or projection,
accessibility, and visualization proof. HTML owns only the surrounding page,
safe embedding, narrative, portability, and final page-level browser QA.
