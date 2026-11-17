# Fight Night — Nikhil Mohan

A first-person walk around an MMA arena. The fight card is my portfolio: projects are bouts,
experience is fight history, education is training camp.

## Controls

| Input | Action |
| --- | --- |
| Scroll / trackpad, ↑↓ / W S, vertical swipe | Walk the aisle (loops forever) |
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

No external assets; everything is procedural. Branding is a generic "NM Fight Night" — no real league logos.

## Scripts

`npm run dev` · `npm run build` · `npm run preview`
