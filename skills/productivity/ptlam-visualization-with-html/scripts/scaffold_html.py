#!/usr/bin/env python3
"""Create a portable HTML visualization shell with no external dependencies."""

from __future__ import annotations

import argparse
import html
from pathlib import Path


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    :root {{
      color-scheme: dark;
      --ink-0:#090e15;--ink-1:#0f1622;--ink-2:#151f2d;--ink-3:#1b2838;--ink-panel:#0c131d;
      --line:#2a3a4f;--line-strong:#63748c;--text:#e7edf5;--muted:#9caabe;
      --signal:#e8b84c;--signal-soft:#372d19;--signal-ink:#17130a;--cyan:#65c7d9;
      --green:#69c69a;--orange:#e6874f;--violet:#a997e8;--danger:#ef6b69;
      --radius-sm:.5rem;--radius-md:.75rem;--radius-lg:1rem;
      --shadow-focus:0 0 0 .2rem rgba(101,199,217,.28);--shadow-panel:0 1.25rem 4rem rgba(0,0,0,.2);
      --content:76rem;--gap-1:.375rem;--gap-2:.625rem;--gap-3:1rem;--gap-4:1.5rem;--gap-5:2.25rem;
    }}
    * {{ box-sizing:border-box; }}
    html,body {{ overflow-x:hidden; }}
    html {{ scroll-behavior:smooth; }}
    body {{ margin:0;background:var(--ink-0);color:var(--text);font:400 1rem/1.65 ui-sans-serif,system-ui,sans-serif; }}
    img,svg {{ display:block;max-width:100%; }}
    svg {{ width:100%;height:auto; }}
    :focus-visible {{ outline:2px solid var(--cyan);outline-offset:3px; }}
    .skip-link {{ position:fixed;left:1rem;top:-5rem;z-index:10;padding:.7rem 1rem;background:var(--signal);color:var(--signal-ink); }}
    .skip-link:focus {{ top:1rem; }}
    .hero,.field-nav,main,footer {{ width:min(calc(100% - 2rem),var(--content));margin-inline:auto; }}
    .hero {{ padding-block:clamp(4rem,10vw,8rem) 3rem; }}
    h1,h2 {{ margin:0;font-family:ui-serif,Georgia,serif;line-height:1.08;text-wrap:balance; }}
    h1 {{ font-size:clamp(2.25rem,7vw,5rem); }}
    h2 {{ font-size:clamp(1.7rem,4vw,3rem); }}
    p {{ max-width:68ch; }}
    .eyebrow {{ color:var(--signal);font:700 .72rem/1.4 ui-monospace,monospace;letter-spacing:.15em;text-transform:uppercase; }}
    .lede {{ color:var(--muted);font-size:clamp(1.05rem,2vw,1.3rem); }}
    .field-nav {{ display:flex;flex-wrap:wrap;gap:.5rem;padding:.75rem;border:1px solid var(--line);border-radius:var(--radius-md);background:var(--ink-1); }}
    .field-nav a {{ flex:1 1 auto;min-width:0;padding:.6rem .75rem;color:var(--muted);text-align:center;text-decoration:none;overflow-wrap:anywhere; }}
    main {{ display:grid;gap:6rem;padding-block:4rem 8rem; }}
    section {{ display:grid;gap:1.5rem;min-width:0;scroll-margin-top:1rem; }}
    .visual-stage {{ min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:1rem;background:var(--ink-1);padding:clamp(1rem,3vw,2rem); }}
    .placeholder {{ min-height:18rem;display:grid;place-items:center;border:1px dashed var(--line);border-radius:var(--radius-md);color:var(--muted);text-align:center;padding:2rem; }}
    footer {{ border-top:1px solid var(--line);padding-block:2rem 4rem;color:var(--muted); }}
    @media (prefers-reduced-motion:reduce) {{
      html {{ scroll-behavior:auto; }}
      *,*::before,*::after {{ animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important; }}
    }}
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to the field guide</a>
  <header class="hero">
    <p class="eyebrow">Interactive field guide</p>
    <h1>{title}</h1>
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
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="HTML file to create")
    parser.add_argument("--title", default="How the system works", help="Document title and H1")
    parser.add_argument("--force", action="store_true", help="Replace an existing file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output = args.output.expanduser().resolve()
    if output.suffix.lower() != ".html":
        raise SystemExit("output must end in .html")
    if output.exists() and not args.force:
        raise SystemExit(f"refusing to overwrite existing file: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)
    safe_title = html.escape(args.title.strip() or "How the system works")
    output.write_text(TEMPLATE.format(title=safe_title), encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
