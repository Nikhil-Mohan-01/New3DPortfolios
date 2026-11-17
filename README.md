# Nikhil Mohan — 3D portfolios

Two standalone, Vercel-ready portfolio sites. Both use the "infinite path" technique: a closed
Catmull-Rom curve, a scroll-driven target progress that the camera lerps toward, and
progress wrapped modulo the loop length, so you can scroll forever in either direction.

| Folder | Concept |
| --- | --- |
| [`drive-portfolio/`](drive-portfolio) | **Night Drive.** You sit in the driver's seat of an R34 GT-R (right-hand drive). Scroll to drive a looping neon Tokyo street; projects, experience and education are posters on the buildings outside the driver's window. |
| [`fight-night-portfolio/`](fight-night-portfolio) | **Fight Night.** First-person in an MMA arena. Scroll to walk a looping aisle around the octagon past fight-card posters. Throw jabs/crosses (J/K) — three clean strikes knock a poster open. |

Portfolio content lives in `src/data/portfolio.js` in each project (same file in both).

## Run locally

```bash
cd drive-portfolio        # or fight-night-portfolio
npm install
npm run dev
```

## Deploy to Vercel

Each folder is its own Vercel project (Vite is auto-detected; `vercel.json` pins it).

**Dashboard:** New Project → import the repo → set **Root Directory** to `drive-portfolio`
(or `fight-night-portfolio`) → Deploy. Do this once per site.

**CLI:**

```bash
cd drive-portfolio && npx vercel --prod
```
