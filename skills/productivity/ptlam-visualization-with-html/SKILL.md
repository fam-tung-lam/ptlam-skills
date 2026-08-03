---
name: ptlam-visualization-with-html
description:
  Create polished, interactive, local HTML artifacts that make complex content
  easier to scan, understand, and explore. Use when the user explicitly asks for
  an HTML artifact, visual report, explainer, comparison, plan, review surface,
  or similar visualization, and use automatically when visual structure would
  materially improve a complex response; keep simple answers in chat.
---

# PTLam Visualization with HTML

Create a complete local HTML deliverable and keep the chat handoff concise.
Choose the visual form from the user's goal and the information itself; do not
force the request into a fixed artifact type.

## Workflow

1. Decide whether an artifact is justified. Honor an explicit request. For
   implicit use, continue only when visual structure materially improves
   comprehension; answer simple requests in chat.
2. Extract presentation preferences in this order: the current request, active
   conversation decisions, stable user preferences in context, subject-project
   conventions, then this skill's fallback design system. A recent explicit
   instruction always wins.
3. Read [references/visualization.md](references/visualization.md) to select the
   smallest useful visual treatment. Read
   [references/design-system.md](references/design-system.md) before choosing or
   customizing a design system. Read
   [references/quality-and-safety.md](references/quality-and-safety.md) before
   authoring and again before delivery.
4. Resolve the output path. Use an exact user path first, an existing project
   convention second, or
   `.ptlam/ptlam-visualization-with-html/<descriptive-name>.html` otherwise. Use
   a kebab-case name, continue an existing file only for the same artifact, and
   never overwrite an unrelated file.
5. For a new fallback-based artifact, resolve the absolute directory containing
   this `SKILL.md`, then run:

   ```bash
   node <skill-directory>/scripts/scaffold.mjs \
     --title <title> --lang <language-tag> --output <html-path>
   ```

6. Author the complete result in HTML. Keep core content available without
   JavaScript, add only useful read-only exploration, and inline the resources
   the artifact needs. Do not add feedback submission, persistence, hidden
   network access, publishing, or sharing. Obtain user consent before adding a
   new CDN dependency.
7. Run deterministic validation:

   ```bash
   node <skill-directory>/scripts/validate.mjs <html-path>
   ```

   Repair every error. Treat browser-only checks as unverified until the next
   step; warnings block delivery only when they expose a material defect.

8. Open the artifact in the user's default system browser first. Use a separate
   controllable browser only when required for QA, and keep that context
   isolated from signed-in browsing data. Verify the real page at desktop width,
   320 CSS pixels, and 200% zoom or equivalent layout pressure. Exercise its
   controls and inspect keyboard access, focus, overflow, clipping, assets, and
   console output.
9. Deliver a short chat handoff naming the artifact, linking its local path, and
   saying what to inspect first. Disclose material warnings, fallbacks, or
   unverified checks. Never claim an incomplete check passed.

## Lifecycle

- Keep generated artifacts local unless the user explicitly asks for a Git
  operation. Never upload or publish them in v1.
- Never delete old artifacts automatically.
- Never migrate an artifact to a newer design-system version automatically.
  Upgrade it only on explicit request.
- Prefer one portable HTML file. Use sibling files only for justified large
  media or assets.
