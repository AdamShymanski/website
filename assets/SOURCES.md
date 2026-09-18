# Media provenance

Every clip and photograph on this site is public domain or CC0, so nothing here
needs an attribution line in the page chrome. The record is kept anyway, so a
future swap knows what it is replacing and where to go back to.

## Beat loops — `assets/media/`

All six beat loops are cut from five source clips, at **1560×902** — 1.5x the
plate at its widest (`min(1040px, 62vw)`) — from sources that actually carry
that much detail. The first cut was 484×280, and a later pass upscaled those
same small cuts to 1452×840: the frame grew but the detail did not, and on a
Retina screen the plate read as 480p. Each is a full-height crop of its source
to the plate's 484:280 aspect, then a crossfade loop (the tail dissolved over
the head) so the cycle has no seam. Encoded h.264 High, 24 fps, `hqdn3d` for
sensor grain, `crf 27` (`crf 32` for beat 2, whose particle field is the
worst case for compression). Beat 3's source is 720p, so it ships at its
native 1232×712 rather than being upscaled.

| Beat | Subject | Source (Wikimedia Commons file) | In | Crop | Licence |
| --- | --- | --- | --- | --- | --- |
| 1 | Moonlit cloud over the night side of Earth | `Ocean Moon Glint and City Night Lights in 4K UHD.webm` (NASA JSC, 3840×2160) | 0.25s, 5s | 3734×2160 at x 84 | Public domain |
| 2 | Ocean surface currents, eastern Pacific | `Perpetual Ocean (EQUIRECTANGULAR) final beauty 16384×8192p30.webm` (NASA SVS 3827) | 60s, 6s | 2340×1352 at 1000,3480 | Public domain |
| 3 | Standing wave in a rapid, slow motion | `Grand Canyon National Park B-roll Video- River Rapids - Slow Motion (8660897919).webm` (NPS, 1280×720) | 34s, 12s | 1232×712 at x 6 | Public domain |
| 4 | Lenticular cloud forming over a ridge | `Lenticular cloud over Longs Peak, Colorado (time lapse).ogv` (1920×1080) | 6s, 12s | 1848×1068 at 36,6 | CC0 |
| 5 | Iceberg wall and brash ice | `GreenlandReel Icebergs 2160APR.webm` (NASA OMG, 3840×2160) | 73s, 11s | 3696×2136 at 144,12 | Public domain |
| 6 | Dawn limb and city lights from orbit | `Ocean Moon Glint and City Night Lights in 4K UHD.webm` (NASA JSC, 3840×2160) | 11.7s, 3.2s | 3734×2160 at x 90 | Public domain |

"In" is the source timestamp the loop starts at and the loop's length; the
crossfade takes one more second (0.8s for beat 6) after it. The in-points and
crops were recovered by template-matching the original 484×280 cuts against
each source, so these are the same shots, re-cut at full resolution.

Beats 1 and 6 are two moments of one continuous orbital pass — the night side
at the opening, the dawn limb at the close. That bookend is deliberate.

## `/work/` stills — `assets/editorial/`

**These are photographs, not frames from the clips above.** The first pass
grabbed stills out of the video and they were visibly soft: the hero alone
needs 2720×896 for a 2x display, and a 1920-wide compressed video frame cannot
carry that. Every still below is a full-resolution public-domain or CC0
photograph, downscaled into its slot, so each is served at or under its native
resolution. Subjects deliberately echo the beat loops, so the two pages read as
one set.

| File | Rendered | Subject | Source | Native |
| --- | --- | --- | --- | --- |
| `work-hero.webp` | 2720×896 | Stratocumulus deck and the limb, from orbit | `ISS034E016601 — Stratocumulus Clouds, Pacific Ocean` (NASA) | 4256×2832 |
| `problems.webp` | 1112×594 | Open and closed cell clouds over the Pacific | MODIS (NASA) | 4091×3216 |
| `blueprints.webp` | 1112×594 | Lenticular cloud over the Antarctic plain | `Lenticular clouds (15822214045)` | 4608×3456 |
| `touchmarket.webp` | 1112×594 | Aerial surf, Vazon Bay | `Surfing in Vazon Bay` (Unsplash, CC0) | 4096×2160 |
| `tcm.webp` | 1112×594 | Europe's city lights and the limb, from the ISS | `ISS-65 Europe, city lights from space` (NASA) | 5568×3712 |
| `varp.webp` | 1112×594 | Iceberg under a starlit twilight | `Iceberg in North Star Bay, Greenland` | 3747×3178 |

All public domain except Vazon Bay, which is CC0.

## Wordmarks — `assets/logos/`

| File | Origin |
| --- | --- |
| `blueprints.svg` | supplied, 304×50 |
| `touchmarket.svg` | supplied, 114×16 |
| `tcm.png` | `assets/TCM.png` in `AdamShymanski/TCM`, 640×315 |
| `varp.png` | `packages/client/src/resources/icons/logo.png` in `AdamShymanski/Varp`, 710×189 |

TCM's and Varp's originals are white-on-transparent, drawn for the dark app
UIs, with a blue accent (the `M`, and Varp's pyramid `A`). Both were flattened
to a single ink — RGB forced to black, original alpha kept — and trimmed to
their ink bounds. That is what makes four marks from four different hands read
as one set on a page whose only colour is a pale blue highlight, and it lets
`filter: var(--sig)` invert them to white wherever the theme is dark.

Varp's repo also carries `logo.f76541a9.svg`, which is a *different* mark
(a pyramid captioned PYRAMID). It is not the Varp wordmark; do not use it.

## Where the originals came from

- NASA Goddard Scientific Visualization Studio — `svs.gsfc.nasa.gov/3827/`
- NASA image library — `images-api.nasa.gov`
- Everything else via Wikimedia Commons, filtered to public domain and CC0.
  The uploads originate with NASA JSC and Goddard, the National Park Service,
  the NASA Oceans Melting Greenland campaign, and Unsplash.

Masters are not kept in the repo; the clips run 12 MB to 450 MB each and the
photographs 0.7 MB to 21 MB. Re-download from the links above if a recut is
needed.
