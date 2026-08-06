const DEFAULT_TITLE = "How the system works";
const TITLE_PLACEHOLDER = "{{DOCUMENT_TITLE}}";

const HTML_SCAFFOLD = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${TITLE_PLACEHOLDER}</title>
  <style>
    :root {
      color-scheme: dark;
      --color-canvas:#090e15;--color-surface:#0f1622;--color-surface-container-low:#0c131d;--color-surface-container:#151f2d;--color-surface-container-high:#1b2838;
      --color-outline:#2a3a4f;--color-outline-strong:#63748c;--color-on-surface:#e7edf5;--color-on-surface-variant:#9caabe;
      --color-primary:#e8b84c;--color-primary-container:#372d19;--color-on-primary:#17130a;--color-secondary:#65c7d9;
      --color-success:#69c69a;--color-warning:#e6874f;--color-tertiary:#a997e8;--color-error:#ef6b69;
      --shape-small:.5rem;--shape-medium:.75rem;--shape-large:1rem;--shape-full:999rem;
      --elevation-focus:0 0 0 .2rem rgba(101,199,217,.28);--elevation-1:0 .5rem 1.5rem rgba(0,0,0,.16);--elevation-2:0 1.25rem 4rem rgba(0,0,0,.2);
      --content-max:76rem;--space-1:.375rem;--space-2:.625rem;--space-3:1rem;--space-4:1.5rem;--space-5:2.25rem;
    }
    * { box-sizing:border-box; }
    html,body { overflow-x:hidden; }
    html { scroll-behavior:smooth; }
    body { margin:0;background:var(--color-canvas);color:var(--color-on-surface);font:400 1rem/1.65 ui-sans-serif,system-ui,sans-serif; }
    img,svg { display:block;max-width:100%; }
    svg { width:100%;height:auto; }
    :focus-visible { outline:2px solid var(--color-secondary);outline-offset:3px; }
    .skip-link { position:fixed;left:1rem;top:-5rem;z-index:10;padding:.7rem 1rem;background:var(--color-primary);color:var(--color-on-primary); }
    .skip-link:focus { top:1rem; }
    .hero,.field-nav,main,footer { width:min(calc(100% - 2rem),var(--content-max));margin-inline:auto; }
    .hero { padding-block:clamp(4rem,10vw,8rem) 3rem; }
    h1,h2 { margin:0;font-family:ui-serif,Georgia,serif;line-height:1.08;text-wrap:balance; }
    h1 { font-size:clamp(2.25rem,7vw,5rem); }
    h2 { font-size:clamp(1.7rem,4vw,3rem); }
    p { max-width:68ch; }
    .eyebrow { color:var(--color-primary);font:700 .72rem/1.4 ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase; }
    .lede { color:var(--color-on-surface-variant);font-size:clamp(1.05rem,2vw,1.3rem); }
    .field-nav { display:flex;flex-wrap:wrap;gap:.5rem;padding:.75rem;border:1px solid var(--color-outline);border-radius:var(--shape-medium);background:var(--color-surface); }
    .field-nav a { flex:1 1 auto;min-width:0;padding:.6rem .75rem;color:var(--color-on-surface-variant);text-align:center;text-decoration:none;overflow-wrap:anywhere; }
    main { display:grid;gap:6rem;padding-block:4rem 8rem; }
    section { display:grid;gap:1.5rem;min-width:0;scroll-margin-top:1rem; }
    .visual-stage { min-width:0;overflow:hidden;border:1px solid var(--color-outline);border-radius:1rem;background:var(--color-surface);padding:clamp(1rem,3vw,2rem); }
    .placeholder { min-height:18rem;display:grid;place-items:center;border:1px dashed var(--color-outline);border-radius:var(--shape-medium);color:var(--color-on-surface-variant);text-align:center;padding:2rem; }
    footer { border-top:1px solid var(--color-outline);padding-block:2rem 4rem;color:var(--color-on-surface-variant); }
    @media (prefers-reduced-motion:reduce) {
      html { scroll-behavior:auto; }
      *,*::before,*::after { animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important; }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to the field guide</a>
  <header class="hero">
    <p class="eyebrow">Interactive field guide</p>
    <h1>${TITLE_PLACEHOLDER}</h1>
    <p class="lede">Name the learner's goal and the smallest complete system in one sentence.</p>
  </header>
  <nav class="field-nav" aria-label="Field guide sections">
    <a href="#overview"><span aria-hidden="true">01</span> Overview</a>
    <a href="#mechanism"><span aria-hidden="true">02</span> Mechanism</a>
  </nav>
  <main id="main">
    <section id="overview" aria-labelledby="overview-title">
      <header><p class="eyebrow">Step 01 · Orientation</p><h2 id="overview-title">See the whole system</h2></header>
      <div class="visual-stage"><div class="placeholder">Replace with the minimum complete ecosystem.</div></div>
    </section>
    <section id="mechanism" aria-labelledby="mechanism-title">
      <header><p class="eyebrow">Step 02 · Mechanism</p><h2 id="mechanism-title">Watch one real flow</h2></header>
      <div class="visual-stage"><div class="placeholder">Replace with an interactive diagram and observable state.</div></div>
    </section>
  </main>
  <footer>Scope, sources, and the boundary of any analogy.</footer>
</body>
</html>
`;

export interface RenderHtmlScaffoldRequest {
  readonly title?: string;
}

/** Render a portable visualization shell without performing filesystem I/O. */
export function renderHtmlScaffold(
  request: RenderHtmlScaffoldRequest = {},
): string {
  const title = request.title?.trim() || DEFAULT_TITLE;
  return HTML_SCAFFOLD.replaceAll(TITLE_PLACEHOLDER, escapeHtml(title));
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
      })[character] ?? character,
  );
}
