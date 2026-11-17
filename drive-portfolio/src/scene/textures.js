import * as THREE from 'three';
import { profile } from '../data/portfolio';

export const DISPLAY = '"Archivo Black", Impact, sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, monospace';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat = false, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
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

function fitFont(ctx, text, family, maxWidth, start, min = 40) {
  let size = start;
  ctx.font = `${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > min) {
    size -= 4;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------------------------------------------------------------------------
// Building windows — one tile = 4 window columns x 4 floors.
export function makeWindowTexture(seed = 1) {
  const [c, ctx] = canvas(256, 256);
  let s = seed * 9301;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  ctx.fillStyle = '#0d0c16';
  ctx.fillRect(0, 0, 256, 256);
  const palette = ['#ffd9a0', '#ffe9c4', '#bfe3ff', '#ffc27a', '#f5f0ff'];
  for (let fy = 0; fy < 4; fy++) {
    for (let fx = 0; fx < 4; fx++) {
      const x = 14 + fx * 60;
      const y = 14 + fy * 60;
      const lit = rnd() > 0.45;
      if (lit) {
        const col = palette[Math.floor(rnd() * palette.length)];
        const g = ctx.createLinearGradient(0, y, 0, y + 40);
        g.addColorStop(0, col);
        g.addColorStop(1, hexA('#ff9e5e', 0.85));
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.55 + rnd() * 0.45;
      } else {
        ctx.fillStyle = '#1b1a2c';
        ctx.globalAlpha = 1;
      }
      ctx.fillRect(x, y, 34, 40);
      ctx.globalAlpha = 1;
      // mullion
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 16, y, 2, 40);
    }
  }
  // keep the very corner dark — roofs map their UVs there
  ctx.fillStyle = '#0d0c16';
  ctx.fillRect(0, 0, 10, 10);
  return toTexture(c, { repeat: true, aniso: 4 });
}

export function makeAsphaltTexture() {
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#16151d';
  ctx.fillRect(0, 0, 512, 512);
  const img = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n + 2;
  }
  ctx.putImageData(img, 0, 0);
  // tyre tracks — darker bands in each lane
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (const x of [70, 150, 362, 442]) ctx.fillRect(x - 18, 0, 36, 512);
  // centre double line (yellow-ish) and dashed lane edges
  ctx.fillStyle = '#e8d9a6';
  ctx.fillRect(250, 0, 4, 512);
  ctx.fillRect(258, 0, 4, 512);
  ctx.fillStyle = '#dcdce6';
  ctx.fillRect(14, 0, 6, 512);
  ctx.fillRect(492, 0, 6, 512);
  return toTexture(c, { repeat: true, aniso: 8 });
}

export function makeSidewalkTexture() {
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#2a2833';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#1c1b24';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  ctx.fillStyle = '#5b5866';
  ctx.fillRect(0, 0, 18, 256); // kerb
  return toTexture(c, { repeat: true });
}

// ---------------------------------------------------------------------------
// Overhead section gates
export function makeGateTexture(label, accent) {
  const [c, ctx] = canvas(1024, 192);
  ctx.fillStyle = '#07060d';
  ctx.fillRect(0, 0, 1024, 192);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 1004, 172);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = accent;
  ctx.shadowBlur = 28;
  fitFont(ctx, label, DISPLAY, 760, 120);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 512, 100);
  ctx.shadowBlur = 0;
  ctx.fillStyle = accent;
  ctx.font = `600 30px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.fillText('▶▶', 40, 100);
  ctx.textAlign = 'right';
  ctx.fillText('◀◀', 984, 100);
  return toTexture(c);
}

// ---------------------------------------------------------------------------
// Posters (1280 x 800 → 10 m x 6.25 m)
const PW = 1280;
const PH = 800;

function posterBase(ctx, accent) {
  const g = ctx.createLinearGradient(0, 0, PW, PH);
  g.addColorStop(0, '#120f22');
  g.addColorStop(1, '#06050c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PW, PH);
  // accent glow blob
  const r = ctx.createRadialGradient(PW * 0.92, PH * 0.1, 10, PW * 0.92, PH * 0.1, 700);
  r.addColorStop(0, hexA(accent, 0.45));
  r.addColorStop(1, hexA(accent, 0));
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, PW, PH);
  // halftone dots
  ctx.fillStyle = hexA(accent, 0.12);
  for (let y = 30; y < PH; y += 26) for (let x = PW - 360; x < PW; x += 26) {
    const k = (x - (PW - 360)) / 360;
    ctx.beginPath();
    ctx.arc(x + ((y / 26) % 2) * 13, y, 2 + k * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 22, PH);
}

function chip(ctx, text, x, y, accent) {
  ctx.font = `600 30px ${MONO}`;
  const w = ctx.measureText(text).width + 36;
  ctx.fillStyle = hexA(accent, 0.16);
  ctx.strokeStyle = hexA(accent, 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 52, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4f2ff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 18, y + 27);
  return w;
}

function footer(ctx, accent, text = 'CLICK POSTER OR PRESS ENTER ↗') {
  ctx.font = `600 26px ${MONO}`;
  ctx.fillStyle = hexA('#ffffff', 0.55);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, PW - 56, PH - 40);
  ctx.textAlign = 'left';
  ctx.fillStyle = accent;
  ctx.fillText('NM//', 64, PH - 40);
}

export function makePosterTexture(stop) {
  const [c, ctx] = canvas(PW, PH);
  const d = stop.data;
  const accent = stop.accent;
  posterBase(ctx, accent);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const L = 64;

  if (stop.kind === 'project') {
    ctx.font = `600 30px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText(`PROJECT ${String(stop.index).padStart(2, '0')} / ${String(stop.total).padStart(2, '0')}`, L, 86);
    ctx.fillStyle = hexA('#ffffff', 0.7);
    ctx.fillText(d.kicker.toUpperCase(), L, 132);
    ctx.fillStyle = '#ffffff';
    const size = fitFont(ctx, d.title.toUpperCase(), DISPLAY, PW - 2 * L, 150, 60);
    ctx.fillText(d.title.toUpperCase(), L - 4, 140 + size);
    let y = 160 + size + 54;
    ctx.font = `400 36px ${MONO}`;
    ctx.fillStyle = '#d9d5ee';
    for (const line of wrapLines(ctx, d.summary, PW - 2 * L - 40).slice(0, 4)) {
      ctx.fillText(line, L, y);
      y += 50;
    }
    let x = L;
    let cy = PH - 170;
    for (const s of d.stack.slice(0, 6)) {
      ctx.font = `600 30px ${MONO}`;
      const w = ctx.measureText(s).width + 36;
      if (x + w > PW - L) break;
      x += chip(ctx, s, x, cy, accent) + 14;
    }
    footer(ctx, accent);
  } else if (stop.kind === 'experience') {
    ctx.font = `600 30px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText('EXPERIENCE', L, 90);
    ctx.fillStyle = '#ffffff';
    const size = fitFont(ctx, d.company.toUpperCase(), DISPLAY, PW - 2 * L, 140, 60);
    ctx.fillText(d.company.toUpperCase(), L - 4, 150 + size);
    ctx.font = `600 44px ${MONO}`;
    ctx.fillStyle = accent;
    let y = 190 + size + 50;
    for (const line of wrapLines(ctx, d.role, PW - 2 * L)) {
      ctx.fillText(line, L, y);
      y += 58;
    }
    ctx.font = `400 36px ${MONO}`;
    ctx.fillStyle = '#d9d5ee';
    y += 20;
    for (const line of wrapLines(ctx, d.blurb, PW - 2 * L)) {
      ctx.fillText(line, L, y);
      y += 50;
    }
    footer(ctx, accent);
  } else if (stop.kind === 'education') {
    ctx.font = `600 30px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText('EDUCATION', L, 90);
    ctx.fillStyle = '#ffffff';
    const size = fitFont(ctx, d.name.toUpperCase(), DISPLAY, PW - 2 * L, 140, 60);
    ctx.fillText(d.name.toUpperCase(), L - 4, 160 + size);
    ctx.font = `400 40px ${MONO}`;
    ctx.fillStyle = '#d9d5ee';
    let y = 220 + size + 40;
    for (const line of wrapLines(ctx, d.detail, PW - 2 * L)) {
      ctx.fillText(line, L, y);
      y += 56;
    }
    footer(ctx, accent, '');
  } else if (stop.kind === 'intro') {
    ctx.font = `600 32px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText('NOW ENTERING // ポートフォリオ', L, 100);
    ctx.fillStyle = '#ffffff';
    const size = fitFont(ctx, 'NIKHIL', DISPLAY, PW - 2 * L, 230, 80);
    ctx.fillText('NIKHIL', L - 6, 110 + size);
    ctx.fillText('MOHAN', L - 6, 110 + size * 1.92);
    ctx.font = `600 46px ${MONO}`;
    ctx.fillStyle = accent;
    let y = 150 + size * 1.92 + 40;
    ctx.fillText(profile.role.toUpperCase(), L, y);
    ctx.font = `400 34px ${MONO}`;
    ctx.fillStyle = '#d9d5ee';
    ctx.fillText(profile.school, L, y + 56);
    footer(ctx, accent, 'SCROLL TO DRIVE ▶');
  } else if (stop.kind === 'contact') {
    ctx.font = `600 30px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText('END OF THE ROAD? NOT QUITE.', L, 90);
    ctx.fillStyle = '#ffffff';
    const size = fitFont(ctx, "LET'S TALK", DISPLAY, PW - 2 * L, 190, 60);
    ctx.fillText("LET'S TALK", L - 4, 120 + size);
    const rows = [
      ['GITHUB', 'github.com/Nikhil-Mohan-01'],
      ['LINKEDIN', 'in/nikhil-mohan'],
      ['EMAIL', profile.links.email.replace('mailto:', '')],
    ];
    let y = 200 + size + 30;
    for (const [k, v] of rows) {
      ctx.font = `600 34px ${MONO}`;
      ctx.fillStyle = accent;
      ctx.fillText(k, L, y);
      ctx.fillStyle = '#ffffff';
      ctx.font = `400 38px ${MONO}`;
      ctx.fillText(v, L + 230, y);
      y += 66;
    }
    footer(ctx, accent, 'KEEP SCROLLING — THE ROAD LOOPS ↻');
  }
  return toTexture(c, { aniso: 16 });
}
