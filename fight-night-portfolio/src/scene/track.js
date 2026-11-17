import * as THREE from 'three';
import { profile, experience, projects, education } from '../data/portfolio';

// Arena layout (metres)
export const CAGE_R = 7.2; // octagon fence radius (to the flat sides)
export const STAGE_H = 1.1; // platform height
export const POSTER_R = 16.2; // poster ring radius
export const CROWD_R = 18.5; // first crowd row
export const EYE_Y = 1.72;
export const UP = new THREE.Vector3(0, 1, 0);

// ---- The walkway: a closed loop around the cage --------------------------
function makeCurve() {
  const pts = [];
  const N = 24;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 11.4 + 0.7 * Math.sin(2 * a + 0.6) + 0.35 * Math.cos(3 * a);
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, -Math.sin(a) * r));
  }
  const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  c.arcLengthDivisions = 2000;
  return c;
}
export const curve = makeCurve();
export const LENGTH = curve.getLength();
export const wrap = (s) => ((s % LENGTH) + LENGTH) % LENGTH;
export const loopDelta = (a, b) => {
  let d = wrap(b) - wrap(a);
  if (d > LENGTH / 2) d -= LENGTH;
  if (d < -LENGTH / 2) d += LENGTH;
  return d;
};

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
export function frameAt(s, out = {}) {
  const u = wrap(s) / LENGTH;
  curve.getPointAt(u, _p);
  curve.getTangentAt(u, _t);
  out.pos = (out.pos || new THREE.Vector3()).copy(_p);
  out.tan = (out.tan || new THREE.Vector3()).copy(_t);
  out.right = (out.right || new THREE.Vector3()).crossVectors(_t, UP).normalize(); // = outward
  return out;
}

// ---- The fight card -------------------------------------------------------
const sequence = [
  { kind: 'intro', id: 'intro', title: profile.name, section: 'Weigh-in' },
  ...experience.map((e) => ({ kind: 'experience', id: e.id, title: e.company, data: e, section: 'Fight History' })),
  ...projects.map((p, i) => ({
    kind: 'project',
    id: p.id,
    title: p.title,
    data: p,
    section: 'Fight Card',
    index: i + 1,
    total: projects.length,
    billing: i === 0 ? 'MAIN EVENT' : i === 1 ? 'CO-MAIN EVENT' : i < 5 ? 'MAIN CARD' : 'PRELIMS',
  })),
  ...education.map((e) => ({ kind: 'education', id: e.id, title: e.name, data: e, section: 'Training Camp' })),
  { kind: 'contact', id: 'contact', title: 'Book the next fight', section: 'Contact' },
];

const slot = LENGTH / sequence.length;
export const posters = sequence.map((item, i) => ({ ...item, s: 2 + i * slot }));

export const sections = ['Weigh-in', 'Fight History', 'Fight Card', 'Training Camp', 'Contact'].map((name, i) => {
  const first = posters.find((s) => s.section === name);
  return { name, round: i + 1, s: first.s };
});

export const VIEW_OFFSET = 0.6;

/** World position + facing for a poster stop: on the outer ring, facing the cage. */
export function posterPlacement(stop) {
  const f = frameAt(stop.s);
  const dir = new THREE.Vector3(f.pos.x, 0, f.pos.z).normalize();
  const pos = dir.clone().multiplyScalar(POSTER_R).setY(2.55);
  const rotY = Math.atan2(-dir.x, -dir.z); // local +Z faces the centre
  return { pos, rotY, dir };
}
