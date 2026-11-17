import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BUILDING_LINE,
  LENGTH,
  ROAD_HALF,
  frameAt,
  gates,
  loopDelta,
  minDistToRoad,
  posters,
} from './track';
import { makeAsphaltTexture, makeGateTexture, makeSidewalkTexture, makeWindowTexture } from './textures';

const NEON = ['#ff2e88', '#22d3ee', '#a855f7', '#facc15', '#34d399', '#fb7185', '#60a5fa', '#f97316'];
const SIGN_WORDS = ['ラーメン', 'カラオケ', '居酒屋', 'ホテル', 'ゲーム', '寿司', 'カフェ', '電気', '薬局', '24時間', 'バー', '焼肉'];

function rng(seed) {
  let s = seed % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// --------------------------------------------------------------------------
// A flat strip that follows the loop, from lateral offset a to b.
function ribbon(a, b, y, step, vLen) {
  const n = Math.ceil(LENGTH / step);
  const pos = new Float32Array((n + 1) * 2 * 3);
  const uv = new Float32Array((n + 1) * 2 * 2);
  const nor = new Float32Array((n + 1) * 2 * 3);
  const idx = [];
  const f = {};
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * LENGTH;
    frameAt(s, f);
    const A = f.pos.clone().addScaledVector(f.right, a);
    const B = f.pos.clone().addScaledVector(f.right, b);
    pos.set([A.x, y, A.z, B.x, y, B.z], i * 6);
    uv.set([0, s / vLen, 1, s / vLen], i * 4);
    nor.set([0, 1, 0, 0, 1, 0], i * 6);
    if (i < n) {
      const a0 = i * 2;
      idx.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// --------------------------------------------------------------------------
// Procedural city layout (deterministic)
function layoutCity() {
  const r = rng(1337);
  const buildings = [[], [], []]; // three window-texture variants
  const signs = []; // blade signs
  const strips = []; // horizontal neon strips
  const vending = [];
  const beacons = [];
  const f = {};

  const tryPlace = (side, s, w, d, h, lateral, front) => {
    frameAt(s, f);
    const c = f.pos.clone().addScaledVector(f.right, side * lateral);
    const rotY = Math.atan2(f.tan.x, f.tan.z);
    // corners in world space
    const ax = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY)); // local x
    const az = new THREE.Vector3(Math.sin(rotY), 0, Math.cos(rotY)); // local z
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const p = c.clone().addScaledVector(ax, (sx * d) / 2).addScaledVector(az, (sz * w) / 2);
      if (minDistToRoad(p.x, p.z) < BUILDING_LINE - 0.2) return null;
    }
    const geo = new THREE.BoxGeometry(d, h, w);
    const uv = geo.attributes.uv;
    const off = Math.floor(r() * 4) * 0.25;
    for (let face = 0; face < 6; face++) {
      for (let k = 0; k < 4; k++) {
        const i = face * 4 + k;
        let u = uv.getX(i);
        let v = uv.getY(i);
        if (face === 2 || face === 3) {
          u = 0.005;
          v = 0.005;
        } else {
          const span = face < 2 ? w : d;
          u = u * (span / 12) + off;
          v = v * (h / 14);
        }
        uv.setXY(i, u, v);
      }
    }
    geo.rotateY(rotY);
    geo.translate(c.x, h / 2 - 0.5, c.z);
    buildings[Math.floor(r() * 3)].push(geo);
    if (h > 34) beacons.push(new THREE.Vector3(c.x, h - 0.3, c.z));

    if (front) {
      const facade = c.clone().addScaledVector(f.right, -side * (d / 2));
      if (r() < 0.75) {
        const along = (r() - 0.5) * w * 0.7;
        const sh = 3 + r() * 5;
        signs.push({
          p: facade.clone().addScaledVector(f.right, -side * 0.9).addScaledVector(f.tan, along).setY(4.2 + sh / 2 + r() * 3),
          rotY,
          h: sh,
          word: Math.floor(r() * SIGN_WORDS.length),
          color: NEON[Math.floor(r() * NEON.length)],
        });
      }
      if (r() < 0.6) {
        strips.push({
          p: facade.clone().addScaledVector(f.right, -side * 0.2).setY(3.4),
          rotY,
          w: w * (0.5 + r() * 0.4),
          color: NEON[Math.floor(r() * NEON.length)],
        });
      }
      if (r() < 0.22) {
        vending.push({
          p: facade.clone().addScaledVector(f.right, -side * 0.55).addScaledVector(f.tan, (r() - 0.5) * w * 0.6).setY(0.95),
          rotY,
          color: ['#e8f4ff', '#ff4d6d', '#4dabff', '#f5f5f5'][Math.floor(r() * 4)],
        });
      }
    }
    return true;
  };

  for (const side of [-1, 1]) {
    // front row
    let s = 0;
    while (s < LENGTH - 6) {
      const w = 7 + r() * 9;
      const mid = s + w / 2;
      const nearPoster = side === 1 && posters.some((p) => Math.abs(loopDelta(mid, p.s)) < w / 2 + 10);
      if (!nearPoster) {
        const d = 9 + r() * 7;
        const h = 9 + r() * r() * 46;
        tryPlace(side, mid, w, d, h, BUILDING_LINE + d / 2 + r() * 0.6, true);
      }
      s += w + 0.4 + r() * 1.4;
    }
    // back row — taller, fills the skyline
    s = r() * 10;
    while (s < LENGTH - 10) {
      const w = 12 + r() * 14;
      const d = 12 + r() * 10;
      const h = 22 + r() * 60;
      tryPlace(side, s + w / 2, w, d, h, BUILDING_LINE + 20 + d / 2 + r() * 8, false);
      s += w + 2 + r() * 6;
    }
  }

  // lamps every ~26 m, alternating sides
  const lamps = [];
  for (let s = 8, i = 0; s < LENGTH; s += 26, i++) {
    frameAt(s, f);
    const side = i % 2 ? 1 : -1;
    // keep the driver-side view of posters (and the gates) clear
    if (side === 1 && posters.some((p) => Math.abs(loopDelta(s, p.s)) < 11)) continue;
    if (gates.some((g) => Math.abs(loopDelta(s, g.s)) < 4)) continue;
    lamps.push({
      p: f.pos.clone().addScaledVector(f.right, side * (ROAD_HALF + 0.9)),
      arm: f.right.clone().multiplyScalar(-side),
      rotY: Math.atan2(f.tan.x, f.tan.z),
    });
  }

  return {
    buildingGeos: buildings.map((list) => mergeGeometries(list, false)),
    signs,
    strips,
    vending,
    beacons,
    lamps,
  };
}

function makeSignTexture(word, color) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(0, 0, 128, 512);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 116, 500);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  const chars = [...word];
  const size = Math.min(96, 460 / chars.length);
  ctx.font = `700 ${size}px "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  chars.forEach((ch, i) => ctx.fillText(ch, 64, 256 + (i - (chars.length - 1) / 2) * size * 1.05));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --------------------------------------------------------------------------
function Instanced({ items, geometry, material, apply }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      apply(it, q, sc, col);
      m.compose(it.p, q, sc);
      ref.current.setMatrixAt(i, m);
      if (it.color) ref.current.setColorAt(i, col);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [items, apply]);
  if (!items.length) return null;
  return <instancedMesh ref={ref} args={[geometry, material, items.length]} frustumCulled={false} />;
}

const Y = new THREE.Vector3(0, 1, 0);

export default function City() {
  const city = useMemo(layoutCity, []);

  const mats = useMemo(() => {
    const asphalt = makeAsphaltTexture();
    asphalt.repeat.set(1, 1);
    const walk = makeSidewalkTexture();
    const tints = ['#8a86a8', '#a59a9a', '#7f97a8'];
    return {
      road: new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.55, metalness: 0.15, color: '#cfcbe0' }),
      walk: new THREE.MeshStandardMaterial({ map: walk, roughness: 0.9, color: '#b8b4c8' }),
      buildings: [1, 2, 3].map((seed, i) => {
        const tex = makeWindowTexture(seed);
        return new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive: new THREE.Color('#ffffff'),
          emissiveIntensity: 1.15,
          color: tints[i],
          roughness: 0.85,
        });
      }),
      glow: new THREE.MeshBasicMaterial({ toneMapped: false }),
      pole: new THREE.MeshStandardMaterial({ color: '#3a3846', roughness: 0.6, metalness: 0.6 }),
      pool: new THREE.MeshBasicMaterial({
        map: (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 128;
          const ctx = c.getContext('2d');
          const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
          g.addColorStop(0, 'rgba(255,190,120,0.55)');
          g.addColorStop(1, 'rgba(255,190,120,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 128, 128);
          return new THREE.CanvasTexture(c);
        })(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    };
  }, []);

  const geos = useMemo(() => {
    const road = ribbon(-ROAD_HALF, ROAD_HALF, 0.02, 2, ROAD_HALF * 2);
    const walkL = ribbon(-BUILDING_LINE - 3, -ROAD_HALF, 0.14, 2, 4.6);
    const walkR = ribbon(ROAD_HALF, BUILDING_LINE + 3, 0.14, 2, 4.6);
    // put the left sidewalk's kerb on the road side
    const uvL = walkL.attributes.uv;
    for (let i = 0; i < uvL.count; i++) uvL.setX(i, 1 - uvL.getX(i));
    return {
      road,
      walkL,
      walkR,
      box: new THREE.BoxGeometry(1, 1, 1),
      pole: new THREE.CylinderGeometry(0.09, 0.13, 1, 8),
      plane: new THREE.PlaneGeometry(1, 1),
    };
  }, []);

  // blade signs grouped by word so each group shares a texture
  const signGroups = useMemo(() => {
    const groups = new Map();
    city.signs.forEach((s) => {
      const key = s.word + '|' + s.color;
      if (!groups.has(key)) groups.set(key, { word: SIGN_WORDS[s.word], color: s.color, items: [] });
      groups.get(key).items.push(s);
    });
    return [...groups.values()].map((g) => ({
      ...g,
      material: new THREE.MeshBasicMaterial({ map: makeSignTexture(g.word, g.color), toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }),
    }));
  }, [city]);

  const applySign = useMemo(
    () => (it, q, sc) => {
      q.setFromAxisAngle(Y, it.rotY);
      sc.set(it.h / 4, it.h, 0.3);
    },
    [],
  );
  const applyStrip = useMemo(
    () => (it, q, sc, col) => {
      q.setFromAxisAngle(Y, it.rotY);
      sc.set(0.25, 0.35, it.w);
      col.set(it.color).multiplyScalar(3);
    },
    [],
  );
  const applyVending = useMemo(
    () => (it, q, sc, col) => {
      q.setFromAxisAngle(Y, it.rotY);
      sc.set(0.8, 1.9, 1.1);
      col.set(it.color).multiplyScalar(1.4);
    },
    [],
  );
  const applyBeacon = useMemo(
    () => (it, q, sc, col) => {
      q.identity();
      sc.setScalar(0.6);
      col.set('#ff2a2a').multiplyScalar(4);
    },
    [],
  );
  const beacons = useMemo(() => city.beacons.map((p) => ({ p, color: '#ff2a2a' })), [city]);

  // lamps
  const lampParts = useMemo(() => {
    const poles = [];
    const arms = [];
    const heads = [];
    const pools = [];
    city.lamps.forEach((l) => {
      poles.push({ p: l.p.clone().setY(3.6), rotY: l.rotY });
      const armMid = l.p.clone().addScaledVector(l.arm, 1.1).setY(7.1);
      arms.push({ p: armMid, rotY: l.rotY });
      const head = l.p.clone().addScaledVector(l.arm, 2.1).setY(7.0);
      heads.push({ p: head, rotY: l.rotY, color: '#ffd8a8' });
      pools.push({ p: head.clone().setY(0.05), rotY: l.rotY });
    });
    return { poles, arms, heads, pools };
  }, [city]);

  return (
    <group>
      {/* ground */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <circleGeometry args={[900, 48]} />
        <meshStandardMaterial color="#0a0910" roughness={1} />
      </mesh>
      <mesh geometry={geos.road} material={mats.road} />
      <mesh geometry={geos.walkL} material={mats.walk} />
      <mesh geometry={geos.walkR} material={mats.walk} />

      {city.buildingGeos.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.buildings[i]} />
      ))}

      {signGroups.map((g, i) => (
        <Instanced key={i} items={g.items} geometry={geos.box} material={g.material} apply={applySign} />
      ))}
      <Instanced items={city.strips} geometry={geos.box} material={mats.glow} apply={applyStrip} />
      <Instanced items={city.vending} geometry={geos.box} material={mats.glow} apply={applyVending} />
      <Instanced items={beacons} geometry={geos.box} material={mats.glow} apply={applyBeacon} />

      <Instanced
        items={lampParts.poles}
        geometry={geos.pole}
        material={mats.pole}
        apply={(it, q, sc) => {
          q.identity();
          sc.set(1, 7.2, 1);
        }}
      />
      <Instanced
        items={lampParts.arms}
        geometry={geos.box}
        material={mats.pole}
        apply={(it, q, sc) => {
          q.setFromAxisAngle(Y, it.rotY);
          sc.set(2.4, 0.12, 0.12);
        }}
      />
      <Instanced
        items={lampParts.heads}
        geometry={geos.box}
        material={mats.glow}
        apply={(it, q, sc, col) => {
          q.setFromAxisAngle(Y, it.rotY);
          sc.set(0.9, 0.12, 0.35);
          col.set(it.color).multiplyScalar(3.5);
        }}
      />
      <Instanced
        items={lampParts.pools}
        geometry={geos.plane}
        material={mats.pool}
        apply={(it, q, sc) => {
          q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
          sc.set(11, 11, 1);
        }}
      />

      <Gates />
    </group>
  );
}

// --------------------------------------------------------------------------
const GATE_COLORS = { 'gate-exp': '#22d3ee', 'gate-proj': '#ff2e88', 'gate-edu': '#a3e635', 'gate-contact': '#facc15' };

function Gates() {
  const items = useMemo(
    () =>
      gates.map((g) => {
        const f = frameAt(g.s);
        const color = GATE_COLORS[g.id] || '#ff2e88';
        return {
          ...g,
          pos: f.pos,
          rotY: Math.atan2(f.tan.x, f.tan.z),
          color,
          tex: makeGateTexture(g.label, color),
        };
      }),
    [],
  );
  const span = ROAD_HALF * 2 + 2.4;
  return items.map((g) => (
    <group key={g.id} position={g.pos} rotation-y={g.rotY}>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (span / 2), 3.9, 0]}>
          <boxGeometry args={[0.5, 7.8, 0.5]} />
          <meshStandardMaterial color="#1c1a26" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 7.4, 0]}>
        <boxGeometry args={[span + 0.6, 1.9, 0.4]} />
        <meshStandardMaterial color="#121019" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* sign faces both directions; car approaches from -Z (local) */}
      {[0, Math.PI].map((ry) => (
        <mesh key={ry} position={[0, 7.4, ry ? 0.21 : -0.21]} rotation-y={ry ? 0 : Math.PI}>
          <planeGeometry args={[span - 0.4, (span - 0.4) * (192 / 1024)]} />
          <meshBasicMaterial map={g.tex} toneMapped={false} color={[1.25, 1.25, 1.25]} />
        </mesh>
      ))}
      <mesh position={[0, 8.42, 0]}>
        <boxGeometry args={[span + 0.6, 0.08, 0.42]} />
        <meshBasicMaterial color={new THREE.Color(g.color).multiplyScalar(4)} toneMapped={false} />
      </mesh>
    </group>
  ));
}
