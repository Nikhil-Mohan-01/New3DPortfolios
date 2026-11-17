import * as THREE from 'three';
import { profile, projects, experience } from '../data/portfolio';

export const DISPLAY = 'Anton, Impact, sans-serif';
export const COND = '"Barlow Condensed", "Arial Narrow", sans-serif';
export const RED = '#d4001c';
export const GOLD = '#f2c94c';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, { aniso = 8, repeat = false } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function wrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}
function fit(ctx, text, family, weight, maxWidth, start, min = 30) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > min) {
    size -= 3;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------------------
// Fight posters — 800 x 1200 (2:3)
const W = 800;
const H = 1200;

function base(ctx, accent) {
  ctx.fillStyle = '#070707';
  ctx.fillRect(0, 0, W, H);
  // spotlight
  const g = ctx.createRadialGradient(W / 2, H * 0.3, 20, W / 2, H * 0.32, 700);
  g.addColorStop(0, hexA(accent, 0.55));
  g.addColorStop(0.45, hexA(accent, 0.12));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // diagonal red slash
  ctx.save();
  ctx.translate(W / 2, H * 0.58);
  ctx.rotate(-0.12);
  ctx.fillStyle = RED;
  ctx.fillRect(-W, -46, W * 2, 92);
  ctx.restore();
  // octagon outline motif
  ctx.strokeStyle = hexA('#ffffff', 0.07);
  ctx.lineWidth = 3;
  for (const r of [260, 330, 400]) {
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = W / 2 + Math.cos(a) * r;
      const y = H * 0.3 + Math.sin(a) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // grain
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let i = 0; i < 2500; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  // gold border
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, W - 28, H - 28);
}

function header(ctx, left, right) {
  ctx.fillStyle = '#fff';
  ctx.font = `700 34px ${COND}`;
  ctx.textAlign = 'left';
  ctx.fillText(left, 50, 82);
  ctx.textAlign = 'right';
  ctx.fillStyle = GOLD;
  ctx.fillText(right, W - 50, 82);
  ctx.textAlign = 'left';
}

function bigTitle(ctx, text, y, max = 190) {
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 20;
  const words = text.toUpperCase().split(' ');
  // stack words if the title is long
  const lines = words.length > 1 && text.length > 11 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [text.toUpperCase()];
  let yy = y;
  for (const l of lines) {
    const size = fit(ctx, l, DISPLAY, 400, W - 110, max, 60);
    yy += size * 0.92;
    ctx.fillText(l, W / 2, yy);
  }
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
  return yy;
}

function tape(ctx, rows, y, accent) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(50, y, W - 100, rows.length * 62 + 70);
  ctx.fillStyle = GOLD;
  ctx.font = `700 30px ${COND}`;
  ctx.textAlign = 'center';
  ctx.fillText('— TALE OF THE TAPE —', W / 2, y + 44);
  ctx.textAlign = 'left';
  rows.forEach(([k, v], i) => {
    const yy = y + 104 + i * 62;
    ctx.fillStyle = hexA('#ffffff', 0.55);
    ctx.font = `600 28px ${COND}`;
    ctx.fillText(k.toUpperCase(), 76, yy);
    ctx.fillStyle = '#fff';
    ctx.font = `600 30px ${COND}`;
    const size = fit(ctx, v, COND, 600, W - 330, 30, 20);
    ctx.font = `600 ${size}px ${COND}`;
    ctx.textAlign = 'right';
    ctx.fillText(v, W - 76, yy);
    ctx.textAlign = 'left';
    ctx.fillStyle = hexA(accent, 0.6);
    ctx.fillRect(76, yy + 18, W - 152, 2);
  });
}

function foot(ctx, text = 'CLICK TO OPEN  ·  J / K TO STRIKE') {
  ctx.fillStyle = hexA('#ffffff', 0.6);
  ctx.font = `700 28px ${COND}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, H - 50);
  ctx.textAlign = 'left';
}

export function makePosterTexture(stop) {
  const [c, ctx] = canvas(W, H);
  const d = stop.data;
  const accent = d?.color || { intro: RED, experience: '#3b82f6', education: '#22c55e', contact: GOLD }[stop.kind];
  base(ctx, accent);
  ctx.textBaseline = 'alphabetic';

  if (stop.kind === 'project') {
    header(ctx, `BOUT ${String(stop.index).padStart(2, '0')}`, stop.billing);
    let y = bigTitle(ctx, d.title, 150);
    ctx.fillStyle = GOLD;
    ctx.font = `700 40px ${COND}`;
    ctx.textAlign = 'center';
    ctx.fillText(`VS. ${d.kicker.split('·')[0].trim().toUpperCase()}`, W / 2, y + 70);
    ctx.textAlign = 'left';
    // summary inside the red slash area
    ctx.font = `500 32px ${COND}`;
    ctx.fillStyle = '#e8e8e8';
    let yy = y + 130;
    for (const l of wrapLines(ctx, d.summary, W - 120).slice(0, 4)) {
      ctx.textAlign = 'center';
      ctx.fillText(l, W / 2, yy);
      yy += 40;
    }
    ctx.textAlign = 'left';
    tape(
      ctx,
      [
        ['Weight class', d.kicker.split('·')[1]?.trim() || d.kicker],
        ['Stack', d.stack.slice(0, 3).join(' · ')],
        ['Corner', d.stack.slice(3, 6).join(' · ') || '—'],
      ],
      Math.max(yy + 10, 770),
      accent,
    );
    foot(ctx);
  } else if (stop.kind === 'experience') {
    const i = experience.findIndex((e) => e.id === d.id);
    header(ctx, 'FIGHT HISTORY', `BOUT ${i + 1} OF ${experience.length}`);
    let y = bigTitle(ctx, d.company, 170, 150);
    ctx.fillStyle = GOLD;
    ctx.font = `700 42px ${COND}`;
    ctx.textAlign = 'center';
    let yy = y + 80;
    for (const l of wrapLines(ctx, d.role.toUpperCase(), W - 120)) {
      ctx.fillText(l, W / 2, yy);
      yy += 48;
    }
    ctx.font = `500 32px ${COND}`;
    ctx.fillStyle = '#e8e8e8';
    yy += 16;
    for (const l of wrapLines(ctx, d.blurb, W - 140)) {
      ctx.fillText(l, W / 2, yy);
      yy += 40;
    }
    ctx.textAlign = 'left';
    // result stamp
    ctx.save();
    ctx.translate(W / 2, 930);
    ctx.rotate(-0.08);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 8;
    ctx.strokeRect(-170, -70, 340, 140);
    ctx.fillStyle = GOLD;
    ctx.font = `400 88px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText('W', 0, 30);
    ctx.restore();
    foot(ctx);
  } else if (stop.kind === 'education') {
    header(ctx, 'TRAINING CAMP', 'CAMP');
    let y = bigTitle(ctx, d.name, 190, 150);
    ctx.fillStyle = '#e8e8e8';
    ctx.font = `500 38px ${COND}`;
    ctx.textAlign = 'center';
    let yy = y + 90;
    for (const l of wrapLines(ctx, d.detail, W - 140)) {
      ctx.fillText(l, W / 2, yy);
      yy += 46;
    }
    ctx.textAlign = 'left';
    foot(ctx, 'CLICK TO OPEN');
  } else if (stop.kind === 'intro') {
    header(ctx, 'OFFICIAL WEIGH-IN', 'NM 01');
    ctx.fillStyle = GOLD;
    ctx.font = `700 40px ${COND}`;
    ctx.textAlign = 'center';
    ctx.fillText('IN THE RED CORNER', W / 2, 190);
    let y = bigTitle(ctx, 'Nikhil Mohan', 210, 200);
    ctx.fillStyle = '#fff';
    ctx.font = `700 40px ${COND}`;
    ctx.fillText(`"THE ENGINEER"`, W / 2, y + 66);
    ctx.textAlign = 'left';
    tape(
      ctx,
      [
        ['Division', 'Software & ML'],
        ['Camp', 'UWaterloo CS'],
        ['Record', `${projects.length} projects · ${experience.length} roles`],
        ['Style', 'AI agents · CV · Real-time'],
      ],
      760,
      RED,
    );
    foot(ctx, 'SCROLL TO WALK THE ARENA');
  } else if (stop.kind === 'contact') {
    header(ctx, 'NEXT FIGHT', 'TBA');
    let y = bigTitle(ctx, 'Book the fight', 200, 170);
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = `700 40px ${COND}`;
    ctx.fillText('YOUR TEAM VS. NIKHIL MOHAN', W / 2, y + 70);
    ctx.fillStyle = '#fff';
    ctx.font = `600 34px ${COND}`;
    const rows = ['GITHUB — Nikhil-Mohan-01', 'LINKEDIN — nikhil-mohan', profile.links.email.replace('mailto:', '').toUpperCase()];
    rows.forEach((r, i) => ctx.fillText(r, W / 2, 800 + i * 64));
    ctx.textAlign = 'left';
    foot(ctx, 'CLICK TO OPEN');
  }
  return tex(c, { aniso: 16 });
}

// ---------------------------------------------------------------------------
export function makeMatTexture() {
  const S = 2048;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#e9e6df';
  ctx.fillRect(0, 0, S, S);
  // canvas weave noise
  ctx.fillStyle = 'rgba(0,0,0,0.035)';
  for (let i = 0; i < 9000; i++) ctx.fillRect(Math.random() * S, Math.random() * S, 3, 3);
  const cx = S / 2;
  // centre ring + logo
  ctx.strokeStyle = RED;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(cx, cx, 330, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = cx + Math.cos(a) * 280;
    const y = cx + Math.sin(a) * 280;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.fill();
  ctx.fillStyle = GOLD;
  ctx.font = `400 300px ${DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NM', cx, cx + 6);
  ctx.fillStyle = '#fff';
  ctx.font = `700 54px ${COND}`;
  ctx.fillText('FIGHT NIGHT', cx, cx + 200);
  // side prints
  const prints = ['WATERLOO CS', 'PYTHON', 'TYPESCRIPT', 'COMPUTER VISION', 'LANGGRAPH', 'REACT', 'C++', 'SOCKET.IO'];
  ctx.font = `400 92px ${DISPLAY}`;
  prints.forEach((p, i) => {
    const a = (i / 8) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * 640, cx + Math.sin(a) * 640);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = i % 2 ? 'rgba(212,0,28,0.85)' : 'rgba(20,20,20,0.75)';
    ctx.fillText(p, 0, 0);
    ctx.restore();
  });
  return tex(c, { aniso: 8 });
}

export function makeChainTexture() {
  const [c, ctx] = canvas(128, 128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(64, 0);
  ctx.lineTo(128, 64);
  ctx.lineTo(64, 128);
  ctx.closePath();
  ctx.moveTo(-64, 64);
  ctx.lineTo(0, 0);
  ctx.moveTo(128, 0);
  ctx.lineTo(192, 64);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function makeBannerTexture(text, sub) {
  const [c, ctx] = canvas(1024, 256);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, 1024, 14);
  ctx.fillRect(0, 242, 1024, 14);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fit(ctx, text, DISPLAY, 400, 900, 130);
  ctx.fillText(text, 512, 118);
  ctx.fillStyle = GOLD;
  ctx.font = `700 36px ${COND}`;
  ctx.fillText(sub, 512, 205);
  return tex(c);
}

// Jumbotron — redrawn when the round/poster changes
export function makeJumboCanvas() {
  const [c, ctx] = canvas(1024, 576);
  const t = tex(c, { aniso: 4 });
  const draw = ({ round, section, title, sub }) => {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 1024, 576);
    const g = ctx.createLinearGradient(0, 0, 1024, 576);
    g.addColorStop(0, 'rgba(212,0,28,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 576);
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, 1024, 80);
    ctx.fillStyle = '#fff';
    ctx.font = `700 50px ${COND}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`ROUND ${round}`, 34, 42);
    ctx.textAlign = 'right';
    ctx.fillText(section.toUpperCase(), 990, 42);
    ctx.textAlign = 'center';
    fit(ctx, title.toUpperCase(), DISPLAY, 400, 940, 170);
    ctx.fillStyle = '#fff';
    ctx.fillText(title.toUpperCase(), 512, 270);
    ctx.fillStyle = GOLD;
    ctx.font = `700 46px ${COND}`;
    ctx.fillText(sub.toUpperCase(), 512, 420);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `600 30px ${COND}`;
    ctx.fillText('NM FIGHT NIGHT · LIVE', 512, 520);
    t.needsUpdate = true;
  };
  return { texture: t, draw };
}

// ---------------------------------------------------------------------------
// Broadcast "tale of the tape" card shown next to the opponent — 1024 x 640
export function makeCardTexture(stop) {
  const CW = 1024;
  const CH = 640;
  const [c, ctx] = canvas(CW, CH);
  const d = stop.data;
  const accent = d?.color || { intro: RED, experience: '#3b82f6', education: '#22c55e', contact: GOLD }[stop.kind];
  ctx.fillStyle = 'rgba(6,6,6,0.94)';
  ctx.fillRect(0, 0, CW, CH);
  const g = ctx.createLinearGradient(0, 0, CW, 0);
  g.addColorStop(0, hexA(accent, 0.35));
  g.addColorStop(0.6, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, CH);
  // header bar
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(CW * 0.62, 0);
  ctx.lineTo(CW * 0.62 - 40, 84);
  ctx.lineTo(0, 84);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(0, 84, CW, 6);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, CW - 6, CH - 6);

  let tag = '';
  let title = '';
  let sub = '';
  let body = '';
  let chips = [];
  if (stop.kind === 'project') {
    tag = `BOUT ${String(stop.index).padStart(2, '0')} · ${stop.billing}`;
    title = d.title;
    sub = d.kicker;
    body = d.summary;
    chips = d.stack;
  } else if (stop.kind === 'experience') {
    tag = 'FIGHT HISTORY';
    title = d.company;
    sub = d.role;
    body = d.blurb;
  } else if (stop.kind === 'education') {
    tag = 'TRAINING CAMP';
    title = d.name;
    body = d.detail;
  } else if (stop.kind === 'intro') {
    tag = 'RED CORNER · OFFICIAL WEIGH-IN';
    title = profile.name;
    sub = `"The Engineer" · ${profile.role}`;
    body = `${profile.school}. ${profile.tagline}`;
  } else {
    tag = 'NEXT FIGHT';
    title = 'Book the fight';
    sub = 'GitHub · LinkedIn · Email';
    body = profile.links.email.replace('mailto:', '');
  }

  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = `700 40px ${COND}`;
  ctx.fillText(tag.toUpperCase(), 34, 44);
  ctx.textBaseline = 'alphabetic';
  const size = fit(ctx, title.toUpperCase(), DISPLAY, 400, CW - 80, 130, 56);
  ctx.fillStyle = '#fff';
  ctx.fillText(title.toUpperCase(), 34, 110 + size);
  let y = 110 + size + 58;
  if (sub) {
    ctx.fillStyle = GOLD;
    ctx.font = `700 40px ${COND}`;
    ctx.fillText(sub.toUpperCase(), 36, y);
    y += 58;
  }
  ctx.fillStyle = '#e6e6e6';
  ctx.font = `500 38px ${COND}`;
  for (const l of wrapLines(ctx, body, CW - 80).slice(0, 3)) {
    ctx.fillText(l, 36, y);
    y += 46;
  }
  let x = 36;
  for (const s of chips.slice(0, 6)) {
    ctx.font = `600 30px ${COND}`;
    const w = ctx.measureText(s).width + 30;
    if (x + w > CW - 36) break;
    ctx.fillStyle = hexA(accent, 0.22);
    ctx.fillRect(x, CH - 112, w, 46);
    ctx.fillStyle = '#fff';
    ctx.fillText(s, x + 15, CH - 78);
    x += w + 10;
  }
  ctx.fillStyle = hexA('#ffffff', 0.55);
  ctx.font = `700 26px ${COND}`;
  ctx.textAlign = 'right';
  ctx.fillText('LAND 3 STRIKES (J/K) TO KO & OPEN  ·  OR CLICK', CW - 30, CH - 26);
  ctx.textAlign = 'left';
  return tex(c, { aniso: 8 });
}
