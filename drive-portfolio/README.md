# Night Drive — Nikhil Mohan

You're in the driver's seat of an R34 GT-R on an endless neon street. My work is on posters
outside the driver's (right-hand) window.

## Controls

| Input | Action |
| --- | --- |
| Scroll / trackpad, ↑↓ / W S, vertical swipe | Drive forward / reverse |
| Drag, ← → / A D, horizontal swipe | Look around |
| Space / **Cruise** | Auto-drive |
| Click a poster, Enter, **Open details** | Open the details panel |
| Route bar (bottom) | Drive to any stop |
| Centre-console touchscreen, P / N / B / M | Play-pause, next, previous, mute the playlist |
| **List view** | Plain readable page (also used automatically when WebGL is missing) |

## Where things live

- `src/data/portfolio.js` — all content.
- `src/scene/track.js` — the loop curve, road widths, and where each stop sits.
- `src/scene/DriveRig.jsx` — scroll/drag input, lerped progress, auto head-turn toward posters, driver's eye position (`EYE`; override with `?eye=x,y,z` while tuning).
- `src/scene/City.jsx` — procedural road, buildings, neon signs, lamps, section gates.
- `src/scene/Posters.jsx` + `textures.js` — poster buildings and the canvas-drawn poster art.
- `public/models/r34/r34-runtime.glb` — optimised car (12.6 MB → 2.4 MB, meshopt + WebP). See `ATTRIBUTION.md` there: the model is **CC BY-NC-SA 4.0** by Ddiaz Design, credited in the intro and list view.

## Music

The playlist (Drake, Travis Scott, Michael Jackson) streams through Spotify's official embed player (`src/audio/playlist.js`) — in-page, no redirect, nothing hosted by this site. The centre console and the top-bar button control it; Spotify's player is docked bottom-left. Visitors logged in to Spotify in their browser hear full tracks; everyone else gets Spotify's 30-second previews. Sound starts on the first click/tap/key (browsers block it before that). Tune the screen's placement with `?console=x,y,z,pitch,yaw`.

## Scripts

`npm run dev` · `npm run build` · `npm run preview`
