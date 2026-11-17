# Fight Night — Nikhil Mohan

You're in the octagon with a low-poly Nikhil. Scroll to circle him — each step brings up the next card of the fight card beside him. Land 3 strikes to knock him down and open the card.

A first-person MMA arena. The fight card is my portfolio: projects are bouts,
experience is fight history, education is training camp.

## Controls

| Input | Action |
| --- | --- |
| Scroll / trackpad, ↑↓ / W S, vertical swipe | Circle the opponent (loops forever) |
| Drag, ← → / A D, horizontal swipe | Look around |
| J / K (or the JAB / CROSS buttons) | Throw strikes — 3 on the poster you face = KO, opens it |
| Click a poster, Enter, **Open** | Open the details panel |
| Space / **Auto-walk** | Walk automatically |
| Fight-card strip (bottom) | Jump to any bout |
| **List view** | Plain readable page |

## Where things live

- `src/data/portfolio.js` — all content.
- `src/scene/track.js` — walkway loop, poster ring, bout billing (main event, prelims…).
- `src/scene/Rig.jsx` — input, camera, intro fly-in, gloves, strike/KO logic.
- `src/scene/Arena.jsx` — octagon, cage, lighting rig, jumbotron, crowd, LED boards.
- `src/scene/Posters.jsx` + `textures.js` — canvas-drawn fight posters.

- `src/scene/Fighter.jsx` — the low-poly Nikhil (stance, jabs, hit reactions, knockdown).
- `src/audio/crowd.js` — procedural crowd cheering, whistles, applause, punch/KO-bell effects (Web Audio).

Everything is procedural except the walkout song: "Many Men (Wish Death)" by 50 Cent loops via Spotify's official embed player (full track for visitors logged in to Spotify, 30-second preview otherwise). Branding is a generic "NM Fight Night" — no real league logos.

## Scripts

`npm run dev` · `npm run build` · `npm run preview`
