import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Car from './Car';
import { LANE_OFFSET, LENGTH, frameAt, loopDelta, posters, VIEW_OFFSET, wrap } from './track';
import { posterWorld } from './Posters';
import { drive, uiStore } from '../state';

// Driver's eye in normalised car space (metres; +Z = front, −X = right side / RHD seat).
const params = new URLSearchParams(window.location.search);
const eyeParam = params.get('eye')?.split(',').map(Number);
export const EYE = new THREE.Vector3(...(eyeParam?.length === 3 ? eyeParam : [-0.36, 1.08, -0.32]));

const MAX_YAW = 1.95; // ~112° — far enough to look out the driver window and a bit behind
const MAX_PITCH = 0.6;
const WHEEL_METRES = 0.06; // metres per wheel delta unit
const MAX_SPEED = 95; // m/s cap when jumping between stops

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Move the car so it ends up just before the given stop, going forward. */
export function driveTo(stop) {
  const here = wrap(drive.progress);
  let d = loopDelta(here, stop.s - VIEW_OFFSET);
  if (d < -40) d += LENGTH; // prefer driving forward unless it's just behind us
  drive.target = drive.progress + d;
  drive.cruise = false;
}

export function useDriveInput() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'none';
    let last = null;
    let startTarget = 0;

    const onWheel = (e) => {
      const ui = uiStore.get();
      if (ui.open || ui.view !== 'drive') return;
      if (e.target instanceof Element && e.target.closest('.panel, .list-view')) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dy = clamp(e.deltaY * unit, -240, 240);
      drive.target += dy * WHEEL_METRES;
      drive.cruise = false;
      if (!uiStore.get().started) uiStore.set({ started: true });
    };
    const onDown = (e) => {
      last = { x: e.clientX, y: e.clientY, type: e.pointerType };
      startTarget = drive.target;
      drive.dragging = true;
    };
    const onMove = (e) => {
      if (!last) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      drive.lastLookInput = performance.now();
      if (last.type === 'touch') {
        // horizontal swipes look around, vertical swipes drive
        drive.userYaw = clamp(drive.userYaw - dx * 0.006, -MAX_YAW, MAX_YAW);
        drive.target += -dy * 0.16;
        if (!uiStore.get().started) uiStore.set({ started: true });
      } else {
        drive.userYaw = clamp(drive.userYaw - dx * 0.0042, -MAX_YAW, MAX_YAW);
        drive.userPitch = clamp(drive.userPitch - dy * 0.0035, -MAX_PITCH, MAX_PITCH);
      }
    };
    const onUp = () => {
      last = null;
      drive.dragging = false;
      void startTarget;
    };
    const held = new Set();
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const ui = uiStore.get();
      if (e.key === 'Escape') return uiStore.set({ open: null });
      if (ui.open || ui.view !== 'drive') return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'w', 'arrowdown', 's'].includes(k)) {
        held.add(k);
        drive.cruise = false;
        if (!ui.started) uiStore.set({ started: true });
        e.preventDefault();
      }
      if (k === 'arrowleft' || k === 'a') drive.userYaw = clamp(drive.userYaw + 0.12, -MAX_YAW, MAX_YAW);
      if (k === 'arrowright' || k === 'd') drive.userYaw = clamp(drive.userYaw - 0.12, -MAX_YAW, MAX_YAW);
      if (k === 'arrowleft' || k === 'a' || k === 'arrowright' || k === 'd') drive.lastLookInput = performance.now();
      if (k === ' ') {
        e.preventDefault();
        drive.cruise = !drive.cruise;
        if (!ui.started) uiStore.set({ started: true });
      }
      if (k === 'enter' && drive.nearest && drive.nearestWeight > 0.4) uiStore.set({ open: drive.nearest.id });
    };
    const onKeyUp = (e) => held.delete(e.key.toLowerCase());
    let raf;
    const tick = () => {
      if (held.has('arrowup') || held.has('w')) drive.target += 0.9;
      if (held.has('arrowdown') || held.has('s')) drive.target -= 0.9;
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

export default function DriveRig() {
  const car = useRef();
  const cam = useRef();
  const lightTarget = useRef();
  const head = useRef();
  const f = useMemo(() => ({}), []);
  const look = useRef({ yaw: 0, pitch: 0 });
  const posterPos = useMemo(() => posters.map((p) => ({ stop: p, pos: posterWorld(p) })), []);
  const tmp = useMemo(() => ({ eye: new THREE.Vector3(), v: new THREE.Vector3(), aim: new THREE.Vector3() }), []);

  useDriveInput();

  useEffect(() => {
    if (head.current && lightTarget.current) head.current.target = lightTarget.current;
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const ui = uiStore.get();

    if (drive.cruise && !ui.open) drive.target += 13 * dt;

    let step = (drive.target - drive.progress) * (1 - Math.exp(-dt * 2.4));
    step = clamp(step, -MAX_SPEED * dt, MAX_SPEED * dt);
    drive.progress += step;
    drive.speed += (step / Math.max(dt, 1e-4) - drive.speed) * 0.12;

    frameAt(drive.progress, f);
    const c = car.current;
    c.position.copy(f.pos).addScaledVector(f.right, LANE_OFFSET);
    tmp.aim.copy(c.position).add(f.tan);
    c.lookAt(tmp.aim);
    c.updateMatrixWorld();

    // ---- auto head-turn toward the nearest poster on the driver side ----
    tmp.eye.copy(EYE).applyMatrix4(c.matrixWorld);
    const here = wrap(drive.progress);
    let best = null;
    let bestScore = Infinity;
    for (const pp of posterPos) {
      const d = loopDelta(here, pp.stop.s);
      if (d < -16 || d > 60) continue;
      const score = Math.abs(d - 6);
      if (score < bestScore) {
        bestScore = score;
        best = { ...pp, d };
      }
    }
    let autoYaw = 0;
    let autoPitch = 0;
    let w = 0;
    if (best) {
      w = best.d > 22 ? smooth(60, 22, best.d) : smooth(-16, -5, best.d);
      tmp.v.copy(best.pos).sub(tmp.eye);
      const fwd = tmp.v.dot(f.tan);
      const rgt = tmp.v.dot(f.right);
      const theta = Math.atan2(rgt, fwd); // + = to the right
      autoYaw = clamp(theta, -MAX_YAW, MAX_YAW) * w * 0.9;
      autoPitch = Math.atan2(tmp.v.y, Math.hypot(fwd, rgt)) * w * 0.75;
    }
    drive.nearest = best?.stop || null;
    drive.nearestWeight = w;

    // user look offsets ease back after a few seconds of no input
    if (!drive.dragging && performance.now() - drive.lastLookInput > 2500) {
      drive.userYaw *= Math.exp(-dt * 1.4);
      drive.userPitch *= Math.exp(-dt * 1.4);
    }
    const tYaw = clamp(autoYaw + drive.userYaw, -MAX_YAW, MAX_YAW);
    const tPitch = clamp(autoPitch + drive.userPitch - 0.02, -MAX_PITCH, MAX_PITCH);
    const k = 1 - Math.exp(-dt * (drive.dragging ? 12 : 3.2));
    look.current.yaw += (tYaw - look.current.yaw) * k;
    look.current.pitch += (tPitch - look.current.pitch) * k;

    const cm = cam.current;
    // portrait phones get a wider lens so the road isn't all steering wheel
    const fov = state.size.width / state.size.height < 0.9 ? 88 : 68;
    if (cm.fov !== fov) {
      cm.fov = fov;
      cm.updateProjectionMatrix();
    }
    const sp = Math.min(Math.abs(drive.speed) / 30, 1);
    cm.position.set(EYE.x, EYE.y + Math.sin(state.clock.elapsedTime * 17) * 0.0035 * sp, EYE.z);
    cm.rotation.set(look.current.pitch, Math.PI - look.current.yaw, 0, 'YXZ');
  });

  return (
    <group ref={car}>
      <Car />
      <PerspectiveCamera ref={cam} makeDefault fov={68} near={0.03} far={1400} position={EYE.toArray()} />
      {/* headlights */}
      <spotLight ref={head} position={[0, 0.75, 2.3]} angle={0.5} penumbra={0.7} intensity={900} distance={90} decay={2} color="#fff1d6" />
      <object3D ref={lightTarget} position={[0, 0, 26]} />
      {/* cabin fill so the dash reads at night */}
      <pointLight position={[-0.1, 1.15, 0.1]} intensity={0.9} distance={1.8} decay={2} color="#b9a7ff" />
      <pointLight position={[-0.35, 0.95, 0.55]} intensity={0.35} distance={0.9} decay={2} color="#ffb070" />
    </group>
  );
}
