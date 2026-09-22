# Media provenance

Every clip and photograph on this site is public domain or CC0, except two
home page clips under CC BY 4.0 (beats 3 and 4), whose credit is on /work/.
The record is kept for everything, so a future swap knows what it is
replacing and where to go back to.

## Beat loops — `assets/media/`

All six beat loops are **1560×902**, 1.5x the plate at its widest
(`min(1040px, 62vw)`), and cut from sources that actually carry that much
detail. That second condition is the one that bit twice. The first cut was
484×280; a later pass upscaled those cuts to 1452×840; a third recut them
from the original Commons uploads at 1560×902, but several of those "4K"
uploads are themselves upscales holding about 1000px of real detail, and the
plate still read as 480p. **Check a source before cutting from it**: scale a
frame down to a third and back up and compare (ffmpeg `ssim`). A source that
comes back above about 0.97 does not have the detail, whatever its frame size
says. Every clip below was checked that way at its crop.

Each is cropped to the plate's 484:280 aspect and given a crossfade loop (the
tail dissolved over the head) so the cycle has no seam. Encoded h.264 High,
24 fps, light `hqdn3d` for sensor grain, `crf 27` to `crf 32`.

| Beat | Subject | Source | In | Crop | Licence |
| --- | --- | --- | --- | --- | --- |
| 1 | Moonlit cloud and city lights, Iberia, from the ISS | *Earth from Space in 4K – Expedition 65 Edition* (NASA JSC, `jsc2022m000172`, images.nasa.gov, 4096×2160 `~orig.mp4`), rotated 180° | segment from 36:55, +18s, 8s | 3734×2160 centred | Public domain |
| 2 | Ocean surface currents, eastern Pacific | `Perpetual Ocean (EQUIRECTANGULAR) final beauty 16384×8192p30.webm` (Commons; NASA SVS 3827) | 60s, 6s | 2340×1352 at 1000,3480 | Public domain |
| 3 | Whitewater stream over a mossy bank | `Stream into Lower Dolgoch Falls.webm` (Commons, 3840×2160), saturation 0.72 | 14s, 8s | 1600×926 at 1300,900 | CC BY 4.0, Pierre Marshall |
| 4 | Lenticular cloud, timelapse | `Time-lapse recording of a lenticular cloud.webm` (Commons, 2880×2160) | 2s, 12s | 2600×1504 at 0,40 | CC BY 4.0, Paethon |
| 5 | Sunlit iceberg, Disko Bay | `GreenlandReel Icebergs 2160APR.webm` (Commons; NASA OMG) | 114s, 11s | 3734×2160 at 53,0 | Public domain |
| 6 | Dawn limb over city lights from the ISS | *Earth from Space in 4K – Expedition 65 Edition* (as beat 1), rotated 180° | segment from 32:55, +11s, 8s | 3734×2160 centred | Public domain |

The table is keyed by **file**, and the home page now has seven beats to six
files: the problems beat (index 4) points at `beat-2`, the ocean currents. It
sits three beats after the one that shows that clip first, which is far enough
apart that it does not read as a repeat, and being the same `src` it is served
from cache rather than downloaded twice. If a seventh cut is made, it goes
there.

"In" is where the loop starts and its length; the crossfade takes 1–1.5s
more after it. Beats 1 and 6 were fetched as 40s segments by seeking into the
4 GB original over HTTP (`ffmpeg -ss 2215` and `-ss 1975`, `-c copy`), so
their in-points are relative to those segments.

Beat 5's reel is the softest source left (about 1300px of real detail); its
sunlit iceberg is the sharpest shot in it. A sharper public-domain iceberg
would be an upgrade.

**The two CC BY clips need attribution**, which is on /work/ (`#credits`) and
linked from the home page footer. Keep both if either clip changes.

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
- Everything else via Wikimedia Commons: public domain and CC0, plus the two
  CC BY clips. The uploads originate with NASA JSC and Goddard, the NASA
  Oceans Melting Greenland campaign, Unsplash, and the two named authors.

Masters are not kept in the repo; the clips run 12 MB to 450 MB each and the
photographs 0.7 MB to 21 MB. Re-download from the links above if a recut is
needed.
