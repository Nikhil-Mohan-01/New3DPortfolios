import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { EYE_Y, LENGTH, VIEW_OFFSET, frameAt, loopDelta, posterPlacement, posters, wrap } from './track';
import { RED } from './textures';
import { uiStore, walk } from '../state';

const MAX_YAW = 2.2;
const MAX_PITCH = 0.65;
const WHEEL_METRES = 0.011;
const MAX_SPEED = 14;
const KO_HITS = 3;
const LOOK_AT = new THREE.Vector3(0, 1, 0);
const UP = new THREE.Vector3(0, 1, 0);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function walkTo(stop) {
  const here = wrap(walk.progress);
  let d = loopDelta(here, stop.s - VIEW_OFFSET);
  if (d < -6) d += LENGTH;
  walk.target = walk.progress + d;
  walk.auto = false;
}

/** Throw a strike. Lands on the poster you're facing; 3 clean hits = KO (opens it). */
export function strike(hand) {
  const now = performance.now() / 1000;
  const side = hand === 'left' ? 'left' : 'right';
  if (now - walk.punch[side] < 0.22) return;
  walk.punch[side] = now;
  if (!uiStore.get().started) uiStore.set({ started: true });
  const target = walk.nearest;
  if (target && walk.nearestWeight > 0.55 && Math.abs(walk.facingError) < 0.5) {
    walk.shake = 1;
    walk.landed += 1;
    const h = (walk.hits[target.id] = walk.hits[target.id] || { count: 0, last: 0 });
    h.count += 1;
    h.last = performance.now() / 1000;
    walk._hitClock = h.last;
    uiStore.set((u) => ({ combo: u.combo + 1 }));
    if (h.count >= KO_HITS) {
      h.count = 0;
      uiStore.set({ ko: target.id });
      setTimeout(() => uiStore.set({ ko: null, open: target.id, combo: 0 }), 1100);
    }
  }
}

function Glove({ side }) {
  const s = side === 'left' ? -1 : 1;
  return (
    <group>
      <RoundedBox args={[0.16, 0.15, 0.2]} radius={0.06} smoothness={3}>
        <meshPhysicalMaterial color={RED} roughness={0.35} clearcoat={1} clearcoatRoughness={0.25} />
      </RoundedBox>
      {/* thumb */}
      <RoundedBox args={[0.05, 0.08, 0.12]} radius={0.024} position={[-s * 0.085, -0.02, 0.0]}>
        <meshPhysicalMaterial color={RED} roughness={0.35} clearcoat={1} />
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
        walk.target += -dy * 0.03;
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
    const onKey = (e) => {
      const ui = uiStore.get();
      if (e.key === 'Escape') return uiStore.set({ open: null });
      if (ui.open || ui.view !== 'arena' || e.repeat && (e.key === 'j' || e.key === 'k')) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'w', 'arrowdown', 's'].includes(k)) {
        held.add(k);
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
      if (k === 'enter' && walk.nearest && walk.nearestWeight > 0.4) uiStore.set({ open: walk.nearest.id });
    };
    const onKeyUp = (e) => held.delete(e.key.toLowerCase());
    let raf;
    const tick = () => {
      if (held.has('arrowup') || held.has('w')) walk.target += 0.16;
      if (held.has('arrowdown') || held.has('s')) walk.target -= 0.16;
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

export default function Rig() {
  const body = useRef();
  const cam = useRef();
  const left = useRef();
  const right = useRef();
  const f = useMemo(() => ({}), []);
  const look = useRef({ yaw: 0, pitch: 0 });
  const placed = useMemo(() => posters.map((p) => ({ stop: p, pos: posterPlacement(p).pos })), []);
  const tmp = useMemo(
    () => ({
      v: new THREE.Vector3(),
      aim: new THREE.Vector3(),
      eye: new THREE.Vector3(),
      introPos: new THREE.Vector3(0, 15, 0.01),
      q: new THREE.Quaternion(),
      qIntro: new THREE.Quaternion(),
      m: new THREE.Matrix4(),
    }),
    [],
  );
  const camWorld = useMemo(() => new THREE.Object3D(), []);

  useWalkInput();

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const ui = uiStore.get();
    const t = state.clock.elapsedTime;

    if (ui.started) walk.intro = Math.min(1, walk.intro + dt / 2.6);
    if (walk.auto && !ui.open) walk.target += 2.2 * dt;

    let step = (walk.target - walk.progress) * (1 - Math.exp(-dt * 3));
    step = clamp(step, -MAX_SPEED * dt, MAX_SPEED * dt);
    walk.progress += step;
    walk.speed += (step / Math.max(dt, 1e-4) - walk.speed) * 0.15;

    frameAt(walk.progress, f);
    const b = body.current;
    b.position.copy(f.pos);
    // face along the walkway
    tmp.aim.copy(b.position).add(f.tan);
    b.lookAt(tmp.aim);
    b.updateMatrixWorld();

    // nearest poster (outer ring is on our right)
    const here = wrap(walk.progress);
    let best = null;
    let bestScore = Infinity;
    for (const pp of placed) {
      const d = loopDelta(here, pp.stop.s);
      if (d < -4 || d > 9) continue;
      const score = Math.abs(d - 0.8);
      if (score < bestScore) {
        bestScore = score;
        best = { ...pp, d };
      }
    }
    let autoYaw = 0;
    let autoPitch = 0;
    let w = 0;
    let theta = 0;
    if (best) {
      w = best.d > 3 ? smooth(9, 3, best.d) : smooth(-4, -1.2, best.d);
      tmp.eye.set(0, EYE_Y, 0).applyMatrix4(b.matrixWorld);
      tmp.v.copy(best.pos).sub(tmp.eye);
      const fwd = tmp.v.dot(f.tan);
      const rgt = tmp.v.dot(f.right);
      theta = Math.atan2(rgt, fwd);
      autoYaw = clamp(theta, -MAX_YAW, MAX_YAW) * w;
      autoPitch = Math.atan2(tmp.v.y, Math.hypot(fwd, rgt)) * w * 0.85;
    }
    walk.nearest = best?.stop || null;
    walk.nearestWeight = w;

    if (!walk.dragging && performance.now() - walk.lastLookInput > 2500) {
      walk.userYaw *= Math.exp(-dt * 1.3);
      walk.userPitch *= Math.exp(-dt * 1.3);
    }
    const tYaw = clamp(autoYaw + walk.userYaw, -MAX_YAW, MAX_YAW);
    const tPitch = clamp(autoPitch + walk.userPitch, -MAX_PITCH, MAX_PITCH);
    const k = 1 - Math.exp(-dt * (walk.dragging ? 12 : 3.5));
    look.current.yaw += (tYaw - look.current.yaw) * k;
    look.current.pitch += (tPitch - look.current.pitch) * k;
    // how far off-centre the poster is from where we're looking (for strikes)
    walk.facingError = best ? theta - look.current.yaw : 9;

    // walking bob + hit shake
    const sp = Math.min(Math.abs(walk.speed) / 3, 1);
    walk.shake *= Math.exp(-dt * 9);
    const shake = walk.shake * 0.02;
    const bobY = Math.sin(t * 9) * 0.025 * sp;
    const bobX = Math.cos(t * 4.5) * 0.015 * sp;

    // camera in body space, then blend with the intro fly-over
    camWorld.position.set(bobX + (Math.random() - 0.5) * shake, EYE_Y + bobY + (Math.random() - 0.5) * shake, 0);
    camWorld.rotation.set(look.current.pitch, Math.PI - look.current.yaw, 0, 'YXZ');
    camWorld.updateMatrix();
    tmp.m.multiplyMatrices(b.matrixWorld, camWorld.matrix);
    const cm = cam.current;
    const fov = state.size.width / state.size.height < 0.9 ? 86 : 70;
    if (cm.fov !== fov) {
      cm.fov = fov;
      cm.updateProjectionMatrix();
    }
    const e = walk.intro < 1 ? 1 - Math.pow(1 - walk.intro, 3) : 1;
    tmp.eye.setFromMatrixPosition(tmp.m);
    tmp.q.setFromRotationMatrix(tmp.m);
    if (e < 1) {
      // orbit above the octagon, then swoop down into first person
      tmp.introPos.set(Math.sin(t * 0.12) * 13.5, 8.5, Math.cos(t * 0.12) * 13.5);
      tmp.m.lookAt(tmp.introPos, LOOK_AT, UP);
      tmp.qIntro.setFromRotationMatrix(tmp.m);
      cm.position.lerpVectors(tmp.introPos, tmp.eye, e);
      cm.quaternion.copy(tmp.qIntro).slerp(tmp.q, e);
    } else {
      cm.position.copy(tmp.eye);
      cm.quaternion.copy(tmp.q);
    }

    // gloves: guard up, breathing, punches
    const now = performance.now() / 1000;
    const glove = (g, side, s) => {
      const since = now - walk.punch[side];
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
      <PerspectiveCamera ref={cam} makeDefault fov={70} near={0.05} far={300} position={[9, 14, 9]}>
        <group ref={left}>
          <Glove side="left" />
        </group>
        <group ref={right}>
          <Glove side="right" />
        </group>
        <pointLight position={[0, 0.2, -0.2]} intensity={0.6} distance={1.2} decay={2} color="#ffe2c0" />
      </PerspectiveCamera>
    </>
  );
}
