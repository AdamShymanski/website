# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Adam Szymański's personal site — a single static page deployed to GitHub Pages at `adamszymanski.xyz` (see `CNAME`). No build step, no package manager, no tests.

## Files

- `index.html` — the entire page. A vertical sequence of full-height panels: four **thesis** panels, a **work** (projects) panel, and a **contact** panel (the last panel). The `<head>` carries all SEO/OG/favicon metadata; keep it.
- `style.css` — all styling. Theme tokens live in CSS custom properties on `.page` and are swapped by the `.page[data-theme="bright"]` override. A single `@media (max-width: 900px)` block switches from the desktop layout (left rail nav + fixed right image frame) to the mobile layout (inline images + bottom pill nav).
- `app.js` — vanilla JS (no framework, no build). Drives scroll behaviour: sets `data-theme` per active section, drifts the background flares, crossfades the desktop image frame, toggles `.in` on `[data-reveal]` elements, and highlights the active nav item. Adds `js` to `<html>` so reveal-hiding only applies when JS runs (no-JS stays readable).
- `assets/editorial/` — six deterministic placeholder photos (`thesis-1..4`, `work`, `contact`), one per panel. **These are stock placeholders** (originally picsum IDs 1015/1016/1018/1036/1039/1043) — swap in real imagery when available. Shown in the fixed right frame on desktop and inline on mobile.
- `assets/signature.webp` — signature. Fixed top-left. Inverted to white on the dark theme via `filter: var(--sig)`; rendered as-is (`--sig: none`) on the bright Work section.
- `assets/logos/` — `blueprints.svg`, `touchmarket.svg`. **Currently unused** by the redesign (projects are text rows now); kept in case wordmarks return.
- `assets/favicon/`, `assets/og/` — favicons and Open Graph images referenced from `<head>`.
- `CNAME` — GitHub Pages custom domain.

## Local preview

Open `index.html` directly in a browser, or serve the directory: `python3 -m http.server 8000`. To eyeball the mobile layout without a device, load the page inside a 390px-wide `<iframe>` (an iframe's width is the viewport for its media queries) — the OS Chrome window has a minimum width that won't shrink below the 900px breakpoint.

## Design system

Dark theme (`--bg:#050505`) with a single **bright** section (`--bg:#efece4`) for Work. As you scroll, `app.js` flips `data-theme` (recolouring text/tokens instantly) and slides a full-viewport colour layer (`.theme-wash`) vertically over the settled colour (`.theme-base`) to reveal the new theme — a **vertical wipe, not a crossfade**. The wipe enters from the side the incoming content comes from (bottom when scrolling down, top when scrolling up), so content stays readable throughout the transition.

Two-font pairing (unchanged from before):

- **JetBrains Mono** — nav (rail + pill), project tags/years, contact handles, footer.
- **Newsreader** (serif) — thesis paragraphs, project names, the "Let's talk." line, and the "Hi, I'm Adam" lede. Italic on emphasis (`<em>`) and the contact heading. Loaded with optical-size axis `6..72`, italic + roman weights 300/400/500.

Layout / interaction:

- **Panels** — each `section.panel` is `min-height:100vh` (`100svh` on mobile) with `scroll-snap-align:start`; `html` uses `scroll-snap-type:y mandatory`. Contact is the last panel; since it's a full-height snap target there's no trailing content to trap scrolling.
- **Accent word** — `.accent` colors a key phrase in each thesis paragraph with `var(--accent)` at weight 400.
- **Ambient background** — two large, soft radial `.flare`s drifting slowly (60–80s loops, no opacity pulse) over a static SVG `feTurbulence` `.grain`, in the fixed `.bg` layer. Stacking behind content: `.theme-base` (z0) → `.theme-wash` (z1) → `.bg` flares/grain (z2) → `main` content (z3).
- **Navigation** — desktop `.rail` (left, active item grows its bar); mobile `.pillnav` (bottom, active item filled with `--accent`). Both are driven by `data-nav` matching the active section.
- **Reveal** — `[data-reveal]` elements fade in via the `.in` class as they enter the viewport; per-element `data-delay` staggers them.

When adding a project or contact row, follow the existing `.proj` / `.contact-row` markup (a serif name + `↗` on the left, a mono descriptor on the right) rather than introducing a new pattern. On mobile the project `.proj-year` is hidden.

## Deployment

Pushing to the default branch publishes via GitHub Pages. There is no CI.
