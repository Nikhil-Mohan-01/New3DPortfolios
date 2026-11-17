import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TRACKS, controls, player } from '../audio/playlist';
import { MONO, DISPLAY } from './textures';

// The touchscreen head unit mounted on the R34's centre console.
// Position is in normalised car space (+Z front, −X driver side). Tune with ?console=x,y,z,rx,ry
const params = new URLSearchParams(window.location.search);
const cp = params.get('console')?.split(',').map(Number);
const POS = cp?.length >= 3 ? cp.slice(0, 3) : [0.035, 0.795, 0.372];
const ROT = cp?.length === 5 ? [cp[3], cp[4], 0, 'YXZ'] : [-0.3, Math.PI + 0.2, 0, 'YXZ'];
const W = 0.22; // metres
const CW = 640;
const CH = 400;
const H = (W * CH) / CW;

// Hit regions in canvas pixels
const BTN_Y = 250;
const BTNS = [
  { id: 'prev', x: 40, w: 110 },
  { id: 'toggle', x: 165, w: 150 },
  { id: 'next', x: 330, w: 110 },
  { id: 'mute', x: 455, w: 145 },
];
const LIST_Y = 330;

function hitTest(px, py) {
  if (py >= BTN_Y && py <= BTN_Y + 62) return BTNS.find((b) => px >= b.x && px <= b.x + b.w)?.id;
  if (py >= LIST_Y && py <= LIST_Y + 54) {
    const slot = Math.floor((px - 20) / 200);
    if (slot >= 0 && slot < 3) return `pick:${slot}`;
  }
  return null;
}

function fmt(t) {
  if (!isFinite(t)) return '0:00';
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

export default function ConsoleScreen() {
  const { canvas, ctx, tex } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return { canvas, ctx, tex };
  }, []);
  void canvas;
  const hover = useRef(null);
  const upcoming = useRef([]);
  const last = useRef(0);

  const draw = () => {
    const s = player.get();
    const { t, d } = player.time();
    const tr = TRACKS[s.index];
    const any = s.available.some(Boolean);
    ctx.fillStyle = '#05040b';
    ctx.fillRect(0, 0, CW, CH);
    const g = ctx.createLinearGradient(0, 0, CW, CH);
    g.addColorStop(0, 'rgba(255,46,136,0.25)');
    g.addColorStop(1, 'rgba(34,211,238,0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, CW - 8, CH - 8);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ff2e88';
    ctx.font = `600 22px ${MONO}`;
    ctx.fillText(s.playing ? '● NOW PLAYING' : s.blocked ? '◌ TAP ANYWHERE TO START' : '❚❚ PAUSED', 26, 42);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`NM AUDIO  ${String(s.index + 1).padStart(2, '0')}/${TRACKS.length}`, CW - 26, 42);
    ctx.textAlign = 'left';

    if (!any && s.ready === true) {
      ctx.fillStyle = '#fff';
      ctx.font = `400 40px ${DISPLAY}`;
      ctx.fillText('NO TRACKS LOADED', 26, 110);
      ctx.font = `400 22px ${MONO}`;
      ctx.fillStyle = '#cfcbe0';
      ctx.fillText('Add MP3s to public/music/', 26, 150);
      ctx.fillText('(see public/music/README.md)', 26, 180);
    } else {
      ctx.fillStyle = '#fff';
      let size = 52;
      ctx.font = `400 ${size}px ${DISPLAY}`;
      while (ctx.measureText(tr.title.toUpperCase()).width > CW - 52 && size > 26) {
        size -= 3;
        ctx.font = `400 ${size}px ${DISPLAY}`;
      }
      ctx.fillText(tr.title.toUpperCase(), 26, 112);
      ctx.fillStyle = '#22d3ee';
      ctx.font = `600 26px ${MONO}`;
      ctx.fillText(tr.artist, 26, 152);
      // progress
      const pct = d ? t / d : 0;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(26, 180, CW - 52, 8);
      ctx.fillStyle = '#ff2e88';
      ctx.fillRect(26, 180, (CW - 52) * pct, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = `400 18px ${MONO}`;
      ctx.fillText(fmt(t), 26, 214);
      ctx.textAlign = 'right';
      ctx.fillText(fmt(d), CW - 26, 214);
      ctx.textAlign = 'left';
    }

    // buttons
    const labels = { prev: '⏮', toggle: s.playing ? '❚❚' : '▶', next: '⏭', mute: s.muted ? 'MUTED' : 'VOL' };
    for (const b of BTNS) {
      const hot = hover.current === b.id;
      ctx.fillStyle = hot ? 'rgba(255,46,136,0.85)' : b.id === 'toggle' ? 'rgba(255,46,136,0.35)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(b.x, BTN_Y, b.w, 62, 14);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = b.id === 'mute' ? `600 24px ${MONO}` : `600 34px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[b.id], b.x + b.w / 2, BTN_Y + 33);
    }
    ctx.textAlign = 'left';

    // up next — tap to play
    const up = [];
    for (let k = 1; up.length < 3 && k <= TRACKS.length; k++) {
      const i = (s.index + k) % TRACKS.length;
      if (s.available[i] !== false) up.push(i);
    }
    upcoming.current = up;
    up.forEach((i, slot) => {
      const x = 20 + slot * 200;
      const hot = hover.current === `pick:${slot}`;
      ctx.fillStyle = hot ? 'rgba(34,211,238,0.35)' : 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(x, LIST_Y, 190, 54, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `600 17px ${MONO}`;
      let title = TRACKS[i].title;
      while (ctx.measureText(title).width > 170 && title.length > 3) title = title.slice(0, -2);
      if (title !== TRACKS[i].title) title += '…';
      ctx.fillText(title, x + 10, LIST_Y + 21);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `400 14px ${MONO}`;
      ctx.fillText(TRACKS[i].artist, x + 10, LIST_Y + 41);
    });
    ctx.textBaseline = 'alphabetic';
    tex.needsUpdate = true;
  };

  useEffect(() => {
    draw();
    return player.subscribe(draw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFrame((state) => {
    // progress bar refresh ~4×/s
    if (state.clock.elapsedTime - last.current > 0.25) {
      last.current = state.clock.elapsedTime;
      draw();
    }
  });

  const toPx = (uv) => [uv.x * CW, (1 - uv.y) * CH];
  const onMove = (e) => {
    e.stopPropagation();
    const id = e.uv ? hitTest(...toPx(e.uv)) : null;
    document.body.style.cursor = id ? 'pointer' : '';
    if (id !== hover.current) {
      hover.current = id;
      draw();
    }
  };
  const onClick = (e) => {
    e.stopPropagation();
    if (e.delta > 6 || !e.uv) return;
    const id = hitTest(...toPx(e.uv));
    if (!id) return;
    if (id.startsWith('pick:')) {
      const i = upcoming.current[Number(id.slice(5))];
      if (i !== undefined) controls.select(i);
    } else controls[id]();
  };

  return (
    <group position={POS} rotation={ROT}>
      {/* bezel */}
      <mesh position-z={-0.004}>
        <boxGeometry args={[W + 0.014, H + 0.014, 0.006]} />
        <meshStandardMaterial color="#0a0a0d" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh
        onPointerMove={onMove}
        onPointerOut={() => {
          hover.current = null;
          document.body.style.cursor = '';
          draw();
        }}
        onClick={onClick}
      >
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}
