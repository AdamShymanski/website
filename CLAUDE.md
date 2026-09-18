# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Adam Szymański's personal site — a static site deployed to GitHub Pages at `adamszymanski.xyz` (see `CNAME`). No build step, no package manager, no tests.

The design system: a single grotesque, three page themes that cross-fade, a media plate that holds still while the picture inside it changes, and a 325 / 248 / 556 content grid on the document pages. Measurements in `style.css` are deliberate, so when in doubt, treat them as fixed rather than inventing a new number.

Two things worth knowing about the design intent:

- **Typeface** — **Plus Jakarta Sans** (Google Fonts), picked by rendering candidates against the headline: circular bowls, double-story `a`, straight-tail `y`, weight 300 available. One family for everything; there is no second face.
- **The media plate never moves.** Its geometry — solved once from the tallest beat's copy and the viewport, then written back as fixed CSS custom properties — is identical on every beat; only the picture inside it changes, by an inner vertical slide clipped to the plate's own edges. This is a requirement, not an oversight.

## Pages

- `index.html` — the **beat experience**. The page does not scroll. Six beats (`.copy[data-beat]`) are stacked at one origin over a single fixed media plate, and each beat's copy rises into place with a staggered reveal rather than sliding; a section list on the left doubles as the progress indicator; the theme recolours per beat. The beats are who I am · what I build · why it matters · where it goes · **the work** · compare notes; the work beat carries the two company wordmarks and is the entry point to `/work/`.
- `work/index.html` — projects, laid out on a `/work` grid: a 325px label column, a 248px gutter, a 556px measure. Intro, full-bleed hero, then one `.project-row` per project.
- `problems/index.html` + eleven `problems/*.html` — the open-problems index and detail pages. Long-form documents on the same grid: `h2` in the label column, prose in the measure column.
- `style.css` — the whole design system, in numbered sections (tokens, reset, themes, backdrop, chrome, stage, media, no-JS, documents, work, responsive).
- `app.js` — the beat controller, only used by `index.html`.

## The beat experience

`app.js` keeps one number: the current beat index. Everything else is derived from it.

Each `.media-beat` is parked by one rule — **before the current beat sits one screen up (`is-past`), after it sits one screen down (`is-future`)** — which gives both directions of travel without branching. `.copy` doesn't use that rule: instead of sliding a full screen height, a beat's copy holds its position and only its own children (headline, sub-line, CTA row) rise into place, since a full-screen slide would fight the picture it's standing on. `.copy` only ever toggles `is-current` (visible, interactive) and, briefly while it exits, `is-leaving` (visible, not interactive).

- **Media**: the plate wipes with an inner `transform: translate3d()` slide, clipped by the plate window's `overflow: hidden`, over `--dur-plate` (1.05s) on `--easing-plate`: past slides out toward the top, future slides in from the bottom. Its dimming is per theme — `--plate-op` (0.30 dark / 0.15 blue / 0.13 light) — because the same alpha reads far heavier on white than on black.
- **Copy**: `app.js`'s `revealIn`/`revealOut` set each child's `opacity`/`transform`/`clip-path` directly and stagger them 90ms apart on entry (headline first), 40ms apart in reverse on exit — there's no single CSS transition to point to, so the timings live only in `app.js`, not in `style.css`.
- **The plate's geometry** (`--plate-top/left/w/h` and `--copy-top`) is solved by `app.js`'s `solvePlate()`, not hand-set: it measures the tallest beat's rendered copy, locks the plate to the clips' own 484:280 aspect, and centres it in the band above the footer (sized so the closing beat's footer never overlaps it). It re-solves on resize (debounced) and once the webfont replaces the fallback face, since that changes the copy's own metrics.
- The theme comes from `data-theme` on the active `.copy`, applied to `.page`.
- The footer is absolutely positioned and only fades in on the closing beat (`data-ending`), so the stage stays exactly one viewport tall and nothing ever scrolls.

Input: wheel, arrow/page/space/home/end keys, touch swipe, the section list, and the focus-only step buttons. Deep links work via each beat's `id` (`/#contact`). Input handling is unchanged by any of the above — it only calls `step()`/`go()`.

**One wheel gesture moves one beat.** A trackpad keeps sending a decaying tail of deltas for up to a second after the fingers lift, and accumulating those re-triggered the moment the slide unlocked, so a single flick carried the page two beats. A gesture is now disarmed once it has stepped, and re-arms only when the wheel falls quiet (`WHEEL_QUIET_MS`) or when a delta comes back within `WHEEL_REARM_RATIO` of the gesture's peak — a decaying tail never does, a fresh push or a steady mouse wheel does, so a continuous wheel still advances, paced by the slide. `WHEEL_THRESHOLD` (90, about one firm notch) is what a gesture must clear at all, so a nudge does nothing. `wheelDelta()` normalises line- and page-mode wheels, which would otherwise never reach the threshold.

`app.js` adds `js` to `<html>`. Without it the stage collapses into an ordinary scrolling document (`html:not(.js)` block in `style.css`) — keep that working.

If you change `--dur-plate`, change `PLATE_MS` in `app.js` to match — it's how long a departing beat's clip keeps playing while it slides out of the window. The copy reveal's several durations (0.86s/0.62s enter, 0.42s/0.34s exit) and its two easings only exist as `app.js` constants (`ENTER_EASE`/`EXIT_EASE`); there's no CSS token for them to drift out of sync with.

## The clip slot

`assets/media/beat-{1..6}.mp4` (1560×902; beat 3 1232×712, its source's
native size), each with a `.webp` poster of its first frame. **Resolution is
set by the plate, not the old cut**: the plate reaches 1040 CSS px, 2080
device px on Retina, and a clip with less real detail than that reads as
480p however large its frame is — upscaling a small cut does not help. Recut
from the sources in `assets/SOURCES.md`, never from the files here. The plate
always plays the clip at its 484:280 aspect —
`solvePlate()` (see "The beat experience" above) locks the plate to that ratio
so nothing is ever cropped, whatever size it solves to. `beat-{1..6}-small.mp4`
and their posters are still in the repo from an earlier two-frame layout but
are no longer referenced by `index.html`.

These are `<video muted loop playsinline>`, not GIFs. **That is measured, not a
preference**: the same six clips as GIF ran 4–7 MB *each* at 484×280, because
real footage has no flat runs for LZW to collapse. The MP4s are 0.9–3.9 MB at 1560×902 and
run 24 fps instead of 12.

`app.js` plays only the beat on screen and pauses the rest, primes the two
neighbours' `preload`, and plays nothing at all under `prefers-reduced-motion`
— the poster stands in. Everything past the neighbours stays at `preload="none"`.

To recut a beat: crop to 484:280, scale to 1560×902, and give it a crossfade
loop so the cycle has no seam — the tail is dissolved over the head, which for
water, cloud and drifting ice is invisible. `assets/SOURCES.md` records what
each clip is, where it came from and its licence. The masters are not in the
repo.

To use one clip across every beat, point all six `.media-plate` sources at the
same file — the plate position is identical either way.

## Other assets

- `assets/editorial/` — six WebP stills for the `/work/` hero and project rows. They are **full-resolution public-domain photographs**, not frames pulled from the beat clips; an earlier pass did that and the hero was visibly soft, because a 2x display wants 2720×896 there and a compressed 1920-wide video frame cannot carry it. Each file is served at or under its native resolution: hero 2720×896, rows 1112×594. Subjects echo the beat loops so the two pages read as one set. See `assets/SOURCES.md`.
- `assets/signature.webp` — the logo. Inverted to white on the dark theme via `filter: var(--sig)`; rendered as-is on blue and light.
- `assets/logos/` — four wordmarks: `blueprints.svg` (304×50, mark plus wordmark), `touchmarket.svg` (114×16, wordmark only), `tcm.png` (640×315, boxed logotype) and `varp.png` (710×189, wordmark with a glyph for its `A`). TCM's and Varp's were exported from their own repos and flattened to one ink — see `assets/SOURCES.md` for what changed and why.

  On `/work/` each **named project** shows its wordmark in place of the text `h2` (`.project-mark`); Open Problems, having none, keeps the heading. The home page's work beat shows the two company marks (`.work-marks`).

  **Sizing rule: match cap height, not box height.** The four marks are built differently, so a common `height` makes their lettering look different sizes. They are sized instead so their letters match each other and the 24px `h2` beside them — 30 / 26 / 42 / 30 px on `/work/`. TCM's frame therefore stands taller than the rest; that is the mark, not a mistake. Every heading box in that column is `--mark-box` (42px, the tallest mark) so a logo row and a text row put their `learn-more` on the same line. All four take `filter: var(--sig)`, so they invert wherever the theme is dark.
- `assets/favicon/`, `assets/og/` — referenced from every `<head>`. Keep the SEO/OG block intact when editing a page.

## Design system reference

Themes (`.page[data-theme]`): `dark` #000/#fff, `blue` #deebf3/#000, `light` #fff/#000. Document pages are always `light`.

Type: beat copy 58/300/1.08/-0.018em at desktop (scales down at each breakpoint — see `--copy-fs`/`--copy-lh`/`--copy-ls` in `style.css`, down to 1.1 line-height on a phone) · beat sub 19/400/1.4 · doc h1 38/300/1.3 · standfirst and lede 24/400/1.3 · h2 24/400/1.4 · body 16/400/1.6 · chrome and labels 12/400/-0.02em · section list 16/400.

Colour beyond the themes: `#66747c` muted, `#acb6bc` secondary, `#d7e4eb` highlight, `#b7ccd9` highlight hover, `#9bafbb` media placeholder.

Emphasis is a **background block**, never italic or a colour change: `.mark` in beat copy, and the hover on a link in beat sub-copy. Both use `box-decoration-break: clone` so they wrap cleanly. Document prose (`/problems/`) does not use it — an `em` version existed on every problem title (`.doc .ptitle em`, and `.doc .card-title em` on the index cards) and read as noise on a handful of large, short words; it was removed rather than restyled. If it comes back for running prose, wire it through `--mark-band-h`/`--mark-band-y` the same way `.mark` does.

The block is painted as a **band of a set height** (`--mark-band-h` / `--mark-band-y`), not as a plain `background`. An inline background fills the font's *content area*, which is 1.271em in Plus Jakarta Sans — taller than the beat copy's line-height, so the bands on consecutive lines would otherwise overlap. The band matches the beat copy's line-height exactly, which is the most it can take before overlapping again and the only value that leaves no seam, so a mark running over several lines reads as one continuous block rather than as stripes: **1.08em**, since the beat copy is 1.08 at desktop and medium widths, reverting to **1.1em** at the 760px breakpoint alongside `--copy-lh`. Offset 0.221em from the top of the content area regardless — that offset comes from font metrics, not line-height. Being in `em` it holds across every breakpoint; document copy is set looser than its line-height assumes, so there the same band leaves a gap. If you change the beat copy's line-height, change `--mark-band-h` with it at the same breakpoint. The colour goes through `--mark-paint`, registered with `@property` so a hover can still transition it; `.doc .result` is a block, not inline emphasis, and keeps a full background.

Breakpoints: 1200 (stage tightens), 1190 (document grid narrows), 1000 (footer reflows), 760/767 (single column), 760 × 650 for short phones, where the stage stops being proportional and gets pinned in px, and a height-only `(min-width: 761px) and (max-height: 700px)` query that scales the beat copy down for a short desktop or laptop window, independent of its width — the plate needs the room back regardless of how wide the window is.

## Local preview

Open a file directly, or serve the directory: `python3 -m http.server 8000`. Serving is better — every path is absolute (`/style.css`, `/assets/...`).

To eyeball mobile without a device, load the page inside a 390px-wide `<iframe>` (an iframe's width is the viewport for its media queries) — the OS Chrome window has a minimum width that won't shrink below the 760px breakpoint.

Note for browser automation: the Chrome extension's scroll action does not dispatch `wheel` events, so it cannot drive the beats. Use the keyboard, click the section list, or dispatch a real `WheelEvent`.

## Deployment

Pushing to the default branch publishes via GitHub Pages. There is no CI.
