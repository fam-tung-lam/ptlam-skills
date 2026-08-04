# Shared Quality and Safety

Apply this contract to every selected capability. Then apply the route-specific
quality reference linked directly from `SKILL.md`.

## Content integrity

- Use the current request's language unless the user specifies another.
- Preserve exact facts, numbers, units, code, quotations, and uncertainty.
- Separate evidence, inference, recommendation, and open questions.
- Put source links near supported claims.
- Label axes, scales, legends, time ranges, and transformations.
- Do not remove inconvenient detail for visual simplicity.
- Use a current screenshot for existing UI when available. Label proposed UI as
  a concept and distinguish current from proposed state.

## Security and privacy

- Add no analytics, telemetry, tracking pixels, hidden requests, or uploads.
- Never embed secrets, unrelated local files, or private implementation paths.
- Escape imported text, data, and code at the target-format seam.
- Avoid `eval`, constructed scripts, unsafe inline event handlers, and remote
  resources that bypass the selected capability's security policy.
- Use bounded execution, isolated temporary storage, and guaranteed cleanup.
- Never relax a security default merely to make an output render.

## Placement and lifecycle

Use an exact user path first, an existing subject-project convention second, or
`.ptlam/ptlam-visualization/<descriptive-name>.<extension>` otherwise. Use a
descriptive kebab-case filename and never silently overwrite an unrelated file.

Keep generated artifacts local unless the user explicitly requests another
lifecycle action. Do not automatically stage, commit, upload, publish, migrate,
delete, or upgrade artifacts or runtime caches. Do not create an evidence
sidecar unless requested.

## Validation and evidence

- Validate the exact delivered artifact through its owning capability.
- Inspect visual output; parse or static success is not visual QA.
- Record warnings and unexecuted checks as warnings or unverified, never passed.
- For a co-primary set, preserve per-file evidence and one set-level result.
- Keep local paths out of a public handoff when they expose private context.
- State the selected capability, requested format, validation result, material
  warnings, fallbacks, and unverified checks concisely.
