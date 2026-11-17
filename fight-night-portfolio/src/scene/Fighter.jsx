import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STAGE_H } from './track';

// Shared fight state for the opponent (Nikhil). Rig.jsx writes to it, we animate from it.
export const opponent = {
  hitAt: -10, // seconds (performance clock) of the last strike that landed
  hitSide: 1,
  koAt: -10,
  jabAt: -10, // his own jab
  jabHand: 'left',
  nextJab: 4,
  position: new THREE.Vector3(0, STAGE_H, 0),
};

const now = () => performance.now() / 1000;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Palette taken from the reference photo
const SKIN = '#9a6445';
const SKIN_DARK = '#7c4e34';
const HAIR = '#16100c';
const GLOVE = '#c8102e';

function useShortsTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const ctx = c.getContext('2d');
    // teal waistband → teal → coral → teal hem (board shorts)
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#2fc2c6');
    g.addColorStop(0.42, '#3fc9c0');
    g.addColorStop(0.62, '#e8786e');
    g.addColorStop(0.86, '#ee5a5f');
    g.addColorStop(0.93, '#7fc7cf');
    g.addColorStop(1, '#5fd0d4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    // faint dashed grid print
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let y = 30; y < 240; y += 12) for (let x = (y / 12) % 2 ? 0 : 6; x < 64; x += 12) ctx.fillRect(x, y, 6, 3);
    ctx.fillStyle = '#1f9fa3';
    ctx.fillRect(0, 0, 64, 18);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Limb({ length, r1, r2, material, segments = 6 }) {
  // a tapered cylinder hanging down from its origin
  return (
    <mesh position-y={-length / 2} material={material}>
      <cylinderGeometry args={[r1, r2, length, segments]} />
    </mesh>
  );
}

export default function Fighter({ cameraRef }) {
  const shortsTex = useShortsTexture();
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.65, flatShading: true }),
      skinDark: new THREE.MeshStandardMaterial({ color: SKIN_DARK, roughness: 0.7, flatShading: true }),
      hair: new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.9, flatShading: true }),
      beard: new THREE.MeshStandardMaterial({ color: '#1d140f', roughness: 0.95, flatShading: true }),
      shorts: new THREE.MeshStandardMaterial({ map: shortsTex, roughness: 0.75, flatShading: true }),
      glove: new THREE.MeshStandardMaterial({ color: GLOVE, roughness: 0.4, flatShading: true }),
      cuff: new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.6, flatShading: true }),
      chain: new THREE.MeshStandardMaterial({ color: '#e8e8ee', roughness: 0.2, metalness: 1 }),
      eye: new THREE.MeshBasicMaterial({ color: '#0b0705' }),
      tape: new THREE.MeshStandardMaterial({ color: '#f1f1f1', roughness: 0.8, flatShading: true }),
    }),
    [shortsTex],
  );

  const root = useRef();
  const fall = useRef();
  const hips = useRef();
  const torso = useRef();
  const head = useRef();
  const arm = { left: { sh: useRef(), el: useRef() }, right: { sh: useRef(), el: useRef() } };
  const facing = useRef(0);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const n = now();
    const cam = cameraRef.current;

    // face the visitor
    if (cam && root.current) {
      const want = Math.atan2(cam.position.x - opponent.position.x, cam.position.z - opponent.position.z);
      let d = want - facing.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      facing.current += d * 0.08;
      root.current.rotation.y = facing.current;
    }

    // knockout: fall backwards, stay down, get back up
    const ko = n - opponent.koAt;
    let down = 0;
    if (ko < 0.55) down = ease(ko / 0.55);
    else if (ko < 2.1) down = 1;
    else if (ko < 2.9) down = 1 - ease((ko - 2.1) / 0.8);
    fall.current.rotation.x = -1.42 * down;
    fall.current.position.z = -0.25 * down;

    // he throws his own jab every few seconds (only when upright)
    if (down === 0 && n > opponent.nextJab) {
      opponent.jabAt = n;
      opponent.jabHand = Math.random() < 0.65 ? 'left' : 'right';
      opponent.nextJab = n + 3 + Math.random() * 4;
    }

    // hit reaction
    const hit = n - opponent.hitAt;
    const recoil = hit < 0.45 ? Math.sin((hit / 0.45) * Math.PI) * (1 - hit / 0.45) * 2 : 0;

    // bounce on the toes
    const bounce = down ? 0 : Math.abs(Math.sin(t * 5.2)) * 0.035;
    hips.current.position.y = 0.92 + bounce;
    torso.current.rotation.x = 0.14 - recoil * 0.35;
    torso.current.rotation.z = Math.sin(t * 2.6) * 0.04 + recoil * 0.12 * opponent.hitSide;
    head.current.rotation.x = -recoil * 0.55;
    head.current.rotation.y = 0.32 + recoil * 0.4 * opponent.hitSide;

    // arms: guard → punch
    for (const side of ['left', 'right']) {
      const s = side === 'left' ? 1 : -1; // his left is +X
      const since = n - opponent.jabAt;
      const p = opponent.jabHand === side && since < 0.36 && !down ? Math.sin((since / 0.36) * Math.PI) : 0;
      const guardDrop = down ? 0.9 : 0;
      const sway = Math.sin(t * 2.6 + (s > 0 ? 0 : 1.4)) * 0.06;
      arm[side].sh.current.rotation.set(-0.95 - p * 0.65 + sway + guardDrop * 0.6, 0, -0.32 * s * (1 - p * 0.6));
      arm[side].el.current.rotation.set(-2.05 * (1 - p) + guardDrop, 0, 0);
    }
    torso.current.rotation.y = -0.38 + (opponent.jabHand === 'right' && n - opponent.jabAt < 0.36 ? 0.45 : 0) * Math.sin(Math.min(1, (n - opponent.jabAt) / 0.36) * Math.PI);
  });

  const Arm = ({ side }) => {
    const s = side === 'left' ? 1 : -1;
    return (
      <group ref={arm[side].sh} position={[0.27 * s, 0.56, 0]}>
        <mesh material={mats.skin}>
          <icosahedronGeometry args={[0.105, 0]} />
        </mesh>
        <Limb length={0.29} r1={0.088} r2={0.068} material={mats.skin} />
        <group ref={arm[side].el} position-y={-0.29}>
          <Limb length={0.24} r1={0.07} r2={0.055} material={mats.skin} />
          <mesh position-y={-0.2} material={mats.tape}>
            <cylinderGeometry args={[0.052, 0.052, 0.06, 6]} />
          </mesh>
          <group position-y={-0.3}>
            <mesh material={mats.glove} scale={[1, 1.15, 1.1]}>
              <dodecahedronGeometry args={[0.085, 0]} />
            </mesh>
            <mesh position-y={0.075} material={mats.cuff}>
              <cylinderGeometry args={[0.06, 0.058, 0.06, 6]} />
            </mesh>
          </group>
        </group>
      </group>
    );
  };

  const Leg = ({ side }) => {
    const s = side === 'left' ? 1 : -1;
    const rx = side === 'left' ? -0.3 : 0.24;
    return (
      <group position={[0.1 * s, 0, 0]} rotation={[rx, 0, 0.1 * s]}>
        {/* board-short leg */}
        <mesh position-y={-0.22} material={mats.shorts}>
          <cylinderGeometry args={[0.125, 0.115, 0.46, 7]} />
        </mesh>
        {/* knee + calf */}
        <mesh position-y={-0.5} material={mats.skin}>
          <icosahedronGeometry args={[0.062, 0]} />
        </mesh>
        <group position-y={-0.5}>
          <Limb length={0.38} r1={0.078} r2={0.05} material={mats.skin} />
        </group>
        <mesh position={[0, -0.9, 0.06]} material={mats.skinDark}>
          <boxGeometry args={[0.09, 0.06, 0.23]} />
        </mesh>
      </group>
    );
  };

  return (
    <group ref={root} position={opponent.position.toArray()} scale={1.1}>
      <group ref={fall}>
        <group ref={hips} position-y={0.92}>
          {/* waist / shorts */}
          <mesh position-y={0.02} material={mats.shorts} scale={[1, 1, 0.82]}>
            <cylinderGeometry args={[0.175, 0.19, 0.22, 7]} />
          </mesh>
          <mesh position={[0.03, 0.08, 0.155]} material={mats.tape}>
            <boxGeometry args={[0.06, 0.05, 0.01]} />
          </mesh>
          <Leg side="left" />
          <Leg side="right" />

          <group ref={torso} position-y={0.12}>
            {/* abs */}
            <mesh position-y={0.13} material={mats.skin} scale={[1, 1, 0.78]}>
              <cylinderGeometry args={[0.185, 0.165, 0.28, 7]} />
            </mesh>
            {/* chest — V taper, flat front */}
            <mesh position-y={0.42} material={mats.skin} scale={[1, 1, 0.6]}>
              <cylinderGeometry args={[0.27, 0.19, 0.32, 8]} />
            </mesh>
            {/* subtle pec plates: wide and flat, barely proud of the chest */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[0.085 * s, 0.47, 0.135]} rotation={[-0.12, 0.28 * s, 0]} material={mats.skin}>
                <boxGeometry args={[0.15, 0.1, 0.03]} />
              </mesh>
            ))}
            {/* traps + neck */}
            <mesh position-y={0.6} material={mats.skin} scale={[1.7, 0.5, 0.9]}>
              <icosahedronGeometry args={[0.1, 0]} />
            </mesh>
            <mesh position-y={0.66} material={mats.skin}>
              <cylinderGeometry args={[0.058, 0.07, 0.12, 6]} />
            </mesh>
            {/* silver chain */}
            <mesh position={[0, 0.6, 0.03]} rotation-x={Math.PI / 2 - 0.35} material={mats.chain}>
              <torusGeometry args={[0.1, 0.009, 4, 14]} />
            </mesh>

            <group ref={head} position-y={0.8}>
              <mesh material={mats.skin} scale={[0.9, 1.12, 0.98]}>
                <icosahedronGeometry args={[0.115, 1]} />
              </mesh>
              {/* curly top + skin fade on the sides */}
              <mesh position={[0, 0.075, -0.01]} material={mats.hair} scale={[0.98, 0.62, 1.04]}>
                <dodecahedronGeometry args={[0.112, 1]} />
              </mesh>
              <mesh position={[0, 0.02, -0.03]} material={mats.hair} scale={[0.93, 0.7, 0.95]}>
                <icosahedronGeometry args={[0.11, 0]} />
              </mesh>
              {/* beard + moustache */}
              <mesh position={[0, -0.075, 0.035]} material={mats.beard} scale={[0.8, 0.5, 0.82]}>
                <icosahedronGeometry args={[0.1, 0]} />
              </mesh>
              <mesh position={[0, -0.03, 0.1]} material={mats.beard}>
                <boxGeometry args={[0.07, 0.012, 0.012]} />
              </mesh>
              {/* eyes, brows, nose, ears */}
              {[-1, 1].map((s) => (
                <group key={s}>
                  <mesh position={[0.038 * s, 0.025, 0.1]} material={mats.eye}>
                    <boxGeometry args={[0.026, 0.012, 0.01]} />
                  </mesh>
                  <mesh position={[0.04 * s, 0.05, 0.1]} material={mats.hair} rotation-z={-0.12 * s}>
                    <boxGeometry args={[0.04, 0.01, 0.012]} />
                  </mesh>
                  <mesh position={[0.103 * s, 0.0, 0]} material={mats.skinDark} scale={[0.5, 1, 0.8]}>
                    <icosahedronGeometry args={[0.03, 0]} />
                  </mesh>
                </group>
              ))}
              <mesh position={[0, -0.005, 0.115]} rotation-x={Math.PI / 2} material={mats.skinDark}>
                <coneGeometry args={[0.018, 0.04, 4]} />
              </mesh>
            </group>

            <Arm side="left" />
            <Arm side="right" />
          </group>
        </group>
      </group>
    </group>
  );
}
