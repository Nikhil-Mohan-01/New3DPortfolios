import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { EYE_Y, LENGTH, STAGE_H, VIEW_OFFSET, frameAt, loopDelta, posters, wrap } from './track';
import { makeCardTexture } from './textures';
import Fighter, { opponent } from './Fighter';
import { sfx } from '../audio/crowd';
import { uiStore, walk } from '../state';

const MAX_YAW = 2.2;
const MAX_PITCH = 0.65;
const WHEEL_METRES = 0.0035; // slow: one notch ≈ 0.35 m
const MAX_SPEED = 3.2;
const KO_HITS = 3;
const LOOK_AT = new THREE.Vector3(0, STAGE_H + 1, 0);
const UP = new THREE.Vector3(0, 1, 0);

const GLOVE = '#1f4fd1'; // you're in the blue corner
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Step to the next (+1) or previous (−1) card on the fight card. */
export function stepStop(dir) {
  const here = wrap(walk.target);
  let idx = 0;
  let best = Infinity;
  posters.forEach((p, i) => {
    const d = Math.abs(loopDelta(here, p.s));
    if (d < best) {
      best = d;
      idx = i;
    }
  });
  const next = posters[(idx + dir + posters.length) % posters.length];
  walk.target += loopDelta(here, next.s);
  walk.auto = false;
  walk.lastWalkInput = performance.now();
  walk.stepped = true;
  if (!uiStore.get().started) uiStore.set({ started: true });
}

export function walkTo(stop) {
  const here = wrap(walk.progress);
  let d = loopDelta(here, stop.s - VIEW_OFFSET);
  if (d < -6) d += LENGTH;
  walk.target = walk.progress + d;
  walk.auto = false;
}

/** Throw a strike at Nikhil. 3 clean hits = KO, which opens the current card. */
export function strike(hand) {
  const now = performance.now() / 1000;
  const side = hand === 'left' ? 'left' : 'right';
  if (now - walk.punch[side] < 0.22) return;
  walk.punch[side] = now;
  if (!uiStore.get().started) uiStore.set({ started: true });
  const target = walk.nearest;
  const knockedDown = now - opponent.koAt < 2.9;
  if (target && !knockedDown && Math.abs(walk.facingError) < 0.45) {
    walk.shake = 1;
    walk.landed += 1;
    opponent.hitAt = now;
    opponent.hitSide = side === 'left' ? 1 : -1;
    opponent.nextJab = Math.max(opponent.nextJab, now + 1.2);
    sfx.punch();
    const h = (walk.hits[target.id] = walk.hits[target.id] || { count: 0, last: 0 });
    h.count += 1;
    h.last = now;
    uiStore.set((u) => ({ combo: u.combo + 1 }));
    if (h.count >= KO_HITS) {
      h.count = 0;
      opponent.koAt = now;
      sfx.ko();
      uiStore.set({ ko: target.id });
      setTimeout(() => uiStore.set({ ko: null, open: target.id, combo: 0 }), 1200);
    }
  } else {
    sfx.whiff();
  }
}

function Glove({ side }) {
  const s = side === 'left' ? -1 : 1;
  return (
    <group>
      <RoundedBox args={[0.16, 0.15, 0.2]} radius={0.06} smoothness={3}>
        <meshPhysicalMaterial color={GLOVE} roughness={0.35} clearcoat={1} clearcoatRoughness={0.25} />
      </RoundedBox>
      {/* thumb */}
      <RoundedBox args={[0.05, 0.08, 0.12]} radius={0.024} position={[-s * 0.085, -0.02, 0.0]}>
        <meshPhysicalMaterial color={GLOVE} roughness={0.35} clearcoat={1} />
      </RoundedBox>
      {/* cuff */}
      <mesh position={[0, -0.01, 0.15]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.07, 0.065, 0.14, 16]} />
        <meshStandardMaterial color="#141414" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.01, 0.13]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.072, 0.072, 0.025, 16]} />
        <meshStandardMaterial color="#f2c94c" roughness={0.4} metalness={0.4} />
      </mesh>
    </group>
  );
}

export function useWalkInput() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    let last = null;
    const start = () => !uiStore.get().started && uiStore.set({ started: true });

    const onWheel = (e) => {
      const ui = uiStore.get();
      if (ui.open || ui.view !== 'arena') return;
      if (e.target instanceof Element && e.target.closest('.panel, .list-view')) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      walk.target += clamp(e.deltaY * unit, -240, 240) * WHEEL_METRES;
      walk.lastWalkInput = performance.now();
      walk.auto = false;
      start();
    };
    const onDown = (e) => {
      last = { x: e.clientX, y: e.clientY, type: e.pointerType };
      walk.dragging = true;
    };
    const onMove = (e) => {
      if (!last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      walk.lastLookInput = performance.now();
      if (last.type === 'touch') {
        walk.userYaw = clamp(walk.userYaw - dx * 0.006, -MAX_YAW, MAX_YAW);
        walk.target += -dy * 0.01;
        walk.lastWalkInput = performance.now();
        start();
      } else {
        walk.userYaw = clamp(walk.userYaw - dx * 0.0042, -MAX_YAW, MAX_YAW);
        walk.userPitch = clamp(walk.userPitch - dy * 0.0035, -MAX_PITCH, MAX_PITCH);
      }
    };
    const onUp = () => {
      last = null;
      walk.dragging = false;
    };
    const held = new Set();
    let heldSince = 0;
    const onKey = (e) => {
      const ui = uiStore.get();
      if (e.key === 'Escape') return uiStore.set({ open: null });
      if (ui.open || ui.view !== 'arena' || e.repeat && (e.key === 'j' || e.key === 'k')) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'w', 'arrowdown', 's'].includes(k)) {
        if (!e.repeat) {
          held.add(k);
          heldSince = performance.now();
          stepStop(k === 'w' || k === 'arrowup' ? 1 : -1);
        }
        walk.auto = false;
        start();
        e.preventDefault();
      }
      if (k === 'arrowleft' || k === 'a') walk.userYaw = clamp(walk.userYaw + 0.14, -MAX_YAW, MAX_YAW);
      if (k === 'arrowright' || k === 'd') walk.userYaw = clamp(walk.userYaw - 0.14, -MAX_YAW, MAX_YAW);
      if (['arrowleft', 'a', 'arrowright', 'd'].includes(k)) walk.lastLookInput = performance.now();
      if (k === 'j' || k === 'f') strike('left');
      if (k === 'k' || k === 'g') strike('right');
      if (k === ' ') {
        e.preventDefault();
        walk.auto = !walk.auto;
        start();
      }
      if (k === 'enter' && walk.nearest) uiStore.set({ open: walk.nearest.id });
    };
    const onKeyUp = (e) => held.delete(e.key.toLowerCase());
    let raf;
    const tick = () => {
      // holding W/S keeps walking, one card at a time
      const fwd = held.has('arrowup') || held.has('w');
      const back = held.has('arrowdown') || held.has('s');
      if ((fwd || back) && performance.now() - heldSince > 700) {
        heldSince = performance.now();
        stepStop(fwd ? 1 : -1);
      }
      walk.keys = { fwd, back };
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gl]);
}

const angleLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

/** The broadcast card that floats beside the opponent for the current stop. */
function StopCard({ cardRef }) {
  const textures = useMemo(() => Object.fromEntries(posters.map((p) => [p.id, makeCardTexture(p)])), []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, color: new THREE.Color(1.05, 1.05, 1.05) }), []);
  const shown = useRef(null);
  const flip = useRef(1);
  useFrame((_, dt) => {
    const id = walk.nearest?.id;
    if (id && id !== shown.current) {
      // swap texture at the narrowest point of the flip
      if (flip.current <= 0.05 || !shown.current) {
        shown.current = id;
        mat.map = textures[id];
        mat.needsUpdate = true;
      } else flip.current = Math.max(0, flip.current - dt * 9);
    } else flip.current = Math.min(1, flip.current + dt * 6);
    cardRef.current.scale.set(Math.max(0.02, flip.current), 1, 1);
    mat.opacity = 0.35 + 0.65 * flip.current;
  });
  const open = (e) => {
    e.stopPropagation();
    if (e.delta > 6 || !shown.current) return;
    uiStore.set({ open: shown.current });
  };
  return (
    <group ref={cardRef}>
      <mesh
        material={mat}
        onClick={open}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <planeGeometry args={[2.3, 2.3 * (640 / 1024)]} />
      </mesh>
    </group>
  );
}

export default function Rig() {
  const body = useRef();
  const cam = useRef();
  const left = useRef();
  const right = useRef();
  const card = useRef();
  const f = useMemo(() => ({}), []);
  const look = useRef({ yaw: 0, pitch: 0, baseYaw: 0, basePitch: 0, init: false });
  const tmp = useMemo(
    () => ({
      eye: new THREE.Vector3(),
      head: new THREE.Vector3(0, STAGE_H + 1.55, 0),
      toC: new THREE.Vector3(),
      side: new THREE.Vector3(),
      aim: new THREE.Vector3(),
      cardPos: new THREE.Vector3(),
      introPos: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      qIntro: new THREE.Quaternion(),
      m: new THREE.Matrix4(),
      e: new THREE.Euler(0, 0, 0, 'YXZ'),
    }),
    [],
  );

  useWalkInput();

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const ui = uiStore.get();
    const t = state.clock.elapsedTime;
    const nowS = performance.now() / 1000;

    if (ui.started) walk.intro = Math.min(1, walk.intro + dt / 2.6);
    if (walk.auto && !ui.open) walk.target += 0.55 * dt;

    // when you stop scrolling, settle on the nearest card so you can't blow past them
    if (!walk.auto && !walk.dragging && performance.now() - (walk.lastWalkInput || 0) > 450) {
      const tw = wrap(walk.target);
      let bd = Infinity;
      let snap = 0;
      for (const p of posters) {
        const d = loopDelta(tw, p.s);
        if (Math.abs(d) < Math.abs(bd)) bd = d;
      }
      snap = bd;
      walk.target += snap * (1 - Math.exp(-dt * 4));
    }

    let step = (walk.target - walk.progress) * (1 - Math.exp(-dt * 2.2));
    step = clamp(step, -MAX_SPEED * dt, MAX_SPEED * dt);
    walk.progress += step;
    walk.speed += (step / Math.max(dt, 1e-4) - walk.speed) * 0.15;

    frameAt(walk.progress, f);

    // current stop = the closest one along the loop
    const here = wrap(walk.progress);
    let best = null;
    let bestD = Infinity;
    for (const p of posters) {
      const d = Math.abs(loopDelta(here, p.s));
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    walk.nearest = best;
    walk.nearestWeight = 1;

    // footwork bob + getting tagged by his jab
    const sp = Math.min(Math.abs(walk.speed) / 2, 1);
    const tagged = nowS - opponent.jabAt;
    if (tagged > 0.16 && tagged < 0.2 && !walk._tagged) {
      walk._tagged = true;
      walk.shake = Math.max(walk.shake, 0.7);
    }
    if (tagged > 0.4) walk._tagged = false;
    walk.shake *= Math.exp(-dt * 9);
    const shake = walk.shake * 0.022;
    const bobY = Math.sin(t * 9) * 0.02 * sp + Math.abs(Math.sin(t * 5.2)) * 0.01;

    tmp.eye.copy(f.pos);
    tmp.eye.y += EYE_Y + bobY + (Math.random() - 0.5) * shake;
    tmp.eye.x += (Math.random() - 0.5) * shake;

    // card sits to the right of the opponent, facing you
    tmp.toC.set(-tmp.eye.x, 0, -tmp.eye.z).normalize();
    tmp.side.crossVectors(tmp.toC, UP).normalize();
    tmp.cardPos.copy(tmp.eye).addScaledVector(tmp.toC, 2.2).addScaledVector(tmp.side, 1.35);
    tmp.cardPos.y = STAGE_H + 1.62;
    const c = card.current;
    c.position.lerp(tmp.cardPos, 1 - Math.exp(-dt * 10));
    c.lookAt(tmp.eye);

    // base aim: between his face and the card
    tmp.aim.copy(tmp.head).lerp(tmp.cardPos, 0.4).sub(tmp.eye);
    const baseYaw = Math.atan2(-tmp.aim.x, -tmp.aim.z);
    const basePitch = Math.atan2(tmp.aim.y, Math.hypot(tmp.aim.x, tmp.aim.z));
    const L = look.current;
    if (!L.init) {
      L.baseYaw = baseYaw;
      L.basePitch = basePitch;
      L.init = true;
    }
    L.baseYaw = angleLerp(L.baseYaw, baseYaw, 1 - Math.exp(-dt * 6));
    L.basePitch += (basePitch - L.basePitch) * (1 - Math.exp(-dt * 6));

    if (!walk.dragging && performance.now() - walk.lastLookInput > 2500) {
      walk.userYaw *= Math.exp(-dt * 1.3);
      walk.userPitch *= Math.exp(-dt * 1.3);
    }
    const k = 1 - Math.exp(-dt * (walk.dragging ? 12 : 4));
    L.yaw += (walk.userYaw - L.yaw) * k;
    L.pitch += (walk.userPitch - L.pitch) * k;
    const yaw = L.baseYaw - L.yaw;
    const pitch = clamp(L.basePitch + L.pitch, -MAX_PITCH, MAX_PITCH);

    // how far off his head you're aiming (strikes need you roughly facing him)
    tmp.toC.copy(tmp.head).sub(tmp.eye);
    const yawToHim = Math.atan2(-tmp.toC.x, -tmp.toC.z);
    walk.facingError = Math.atan2(Math.sin(yaw - yawToHim), Math.cos(yaw - yawToHim));

    tmp.e.set(pitch, yaw, 0, 'YXZ');
    tmp.q.setFromEuler(tmp.e);

    const cm = cam.current;
    const fov = state.size.width / state.size.height < 0.9 ? 86 : 70;
    if (cm.fov !== fov) {
      cm.fov = fov;
      cm.updateProjectionMatrix();
    }
    const e = walk.intro < 1 ? 1 - Math.pow(1 - walk.intro, 3) : 1;
    if (e < 1) {
      // orbit the arena, then drop into the cage
      tmp.introPos.set(Math.sin(t * 0.12) * 13.5, 8.5, Math.cos(t * 0.12) * 13.5);
      tmp.m.lookAt(tmp.introPos, LOOK_AT, UP);
      tmp.qIntro.setFromRotationMatrix(tmp.m);
      cm.position.lerpVectors(tmp.introPos, tmp.eye, e);
      cm.quaternion.copy(tmp.qIntro).slerp(tmp.q, e);
    } else {
      cm.position.copy(tmp.eye);
      cm.quaternion.copy(tmp.q);
    }
    if (body.current) body.current.position.copy(f.pos);

    // your gloves: guard up, breathing, punches
    const glove = (g, side, s) => {
      const since = nowS - walk.punch[side];
      const p = since < 0.32 ? Math.sin((since / 0.32) * Math.PI) : 0;
      const breathe = Math.sin(t * 2.2 + (s > 0 ? 0.6 : 0)) * 0.008;
      g.position.set(s * (0.25 - p * 0.17), -0.37 + breathe + p * 0.2 + bobY * 0.4, -0.52 - p * 0.42);
      g.rotation.set(0.25 - p * 0.3, s * (-0.25 + p * 0.25), s * (-0.3 + p * 0.5));
      g.visible = walk.intro > 0.85;
    };
    glove(left.current, 'left', -1);
    glove(right.current, 'right', 1);
  });

  return (
    <>
      <group ref={body} />
      <Fighter cameraRef={cam} />
      <StopCard cardRef={card} />
      <PerspectiveCamera ref={cam} makeDefault fov={70} near={0.05} far={300} position={[9, 14, 9]}>
        <group ref={left}>
          <Glove side="left" />
        </group>
        <group ref={right}>
          <Glove side="right" />
        </group>
        <pointLight position={[0, 0.2, -0.2]} intensity={0.6} distance={1.2} decay={2} color="#cfe0ff" />
        {/* soft fill so the opponent isn't just backlit */}
        <pointLight position={[0.4, 0.6, -0.5]} intensity={6} distance={9} decay={1.6} color="#ffe6d0" />
      </PerspectiveCamera>
    </>
  );
}
