import * as THREE from 'three';
import { profile, experience, projects, education } from '../data/portfolio';

// ---- Road dimensions (metres) ---------------------------------------------
export const ROAD_HALF = 5.4; // asphalt half-width
export const LANE_OFFSET = -2.7; // car sits in the left lane (Tokyo drives on the left)
export const SIDEWALK = 4.6; // sidewalk width
export const BUILDING_LINE = ROAD_HALF + SIDEWALK; // facade distance from centreline
export const UP = new THREE.Vector3(0, 1, 0);

// ---- The loop ---------------------------------------------------------------
// A closed Catmull-Rom curve — the "infinite" road. Progress wraps modulo its
// length, so you can scroll forever in either direction.
function makeCurve() {
  const pts = [];
  const N = 30;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 175 + 18 * Math.sin(3 * a + 0.4) + 7 * Math.cos(5 * a);
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r));
  }
  const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  c.arcLengthDivisions = 3000;
  return c;
}

export const curve = makeCurve();
export const LENGTH = curve.getLength();

export const wrap = (s) => ((s % LENGTH) + LENGTH) % LENGTH;
/** signed shortest distance from a to b along the loop */
export const loopDelta = (a, b) => {
  let d = wrap(b) - wrap(a);
  if (d > LENGTH / 2) d -= LENGTH;
  if (d < -LENGTH / 2) d += LENGTH;
  return d;
};

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
/** Frame at arc-length s: position, tangent, right vector. */
export function frameAt(s, out = {}) {
  const u = wrap(s) / LENGTH;
  curve.getPointAt(u, _p);
  curve.getTangentAt(u, _t);
  out.pos = (out.pos || new THREE.Vector3()).copy(_p);
  out.tan = (out.tan || new THREE.Vector3()).copy(_t);
  out.right = (out.right || new THREE.Vector3()).crossVectors(_t, UP).normalize();
  return out;
}

// ---- Stops: what lives where along the road -------------------------------
// Each poster is mounted on a building on the RIGHT (driver's side of the R34).
const sequence = [
  { kind: 'intro', id: 'intro', title: profile.name, section: 'Welcome' },
  { kind: 'gate', id: 'gate-exp', label: 'EXPERIENCE', section: 'Experience' },
  ...experience.map((e) => ({ kind: 'experience', id: e.id, title: e.company, data: e, section: 'Experience' })),
  { kind: 'gate', id: 'gate-proj', label: 'PROJECTS', section: 'Projects' },
  ...projects.map((p) => ({ kind: 'project', id: p.id, title: p.title, data: p, section: 'Projects' })),
  { kind: 'gate', id: 'gate-edu', label: 'EDUCATION', section: 'Education' },
  ...education.map((e) => ({ kind: 'education', id: e.id, title: e.name, data: e, section: 'Education' })),
  { kind: 'gate', id: 'gate-contact', label: 'CONTACT', section: 'Contact' },
  { kind: 'contact', id: 'contact', title: 'Get in touch', section: 'Contact' },
];

// Evenly spread the sequence around the loop, leaving one extra slot of open
// road between "Contact" and the welcome poster so the lap feels like a lap.
const slot = LENGTH / (sequence.length + 1.2);
export const START_S = 0;
export const stops = sequence.map((item, i) => ({ ...item, s: 34 + i * slot }));
export const posters = stops.filter((s) => s.kind !== 'gate');
export const gates = stops.filter((s) => s.kind === 'gate');

projects.forEach((p, i) => {
  const stop = posters.find((s) => s.id === p.id);
  stop.index = i + 1;
  stop.total = projects.length;
});

export const sections = ['Welcome', 'Experience', 'Projects', 'Education', 'Contact'].map((name) => {
  const first = stops.find((s) => s.section === name);
  return { name, s: first.s };
});

/** Distance at which the car stops when jumping to a poster (a little before abeam). */
export const VIEW_OFFSET = 3.5;

// Dense samples of the centreline — used for placement collision checks.
export const centreSamples = (() => {
  const out = [];
  const n = Math.ceil(LENGTH / 2.5);
  for (let i = 0; i < n; i++) {
    const p = curve.getPointAt(i / n);
    out.push(new THREE.Vector2(p.x, p.z));
  }
  return out;
})();

export function minDistToRoad(x, z) {
  let best = Infinity;
  for (let i = 0; i < centreSamples.length; i++) {
    const c = centreSamples[i];
    const dx = c.x - x;
    const dz = c.y - z;
    const d = dx * dx + dz * dz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
