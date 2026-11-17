import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { posterPlacement, posters } from './track';
import { GOLD, makePosterTexture } from './textures';
import { walk, uiStore } from '../state';

export const PW = 3.1;
export const PH = PW * 1.5;

function Poster({ stop }) {
  const { tex, pos, rotY } = useMemo(() => {
    const { pos, rotY } = posterPlacement(stop);
    return { tex: makePosterTexture(stop), pos, rotY };
  }, [stop]);
  const swing = useRef();
  const trim = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD), toneMapped: false }), []);

  useFrame((state) => {
    const hit = walk.hits[stop.id];
    const t = state.clock.elapsedTime;
    const g = swing.current;
    if (hit && t - hit.last < 0.9) {
      const k = 1 - (t - hit.last) / 0.9;
      g.rotation.x = -Math.sin((t - hit.last) * 26) * 0.09 * k;
      g.rotation.z = Math.sin((t - hit.last) * 31) * 0.035 * k;
      g.position.z = -0.12 * k * k;
    } else {
      g.rotation.x = g.rotation.z = g.position.z = 0;
    }
    const active = walk.nearest?.id === stop.id ? walk.nearestWeight : 0;
    trim.color.set(GOLD).multiplyScalar(0.55 + active * 1.1);
  });

  const open = (e) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    uiStore.set({ open: stop.id });
  };

  return (
    <group position={pos} rotation-y={rotY}>
      {/* stand */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (PW / 2 + 0.12), -0.05, -0.05]}>
          <boxGeometry args={[0.1, PH + 0.6, 0.1]} />
          <meshStandardMaterial color="#141414" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
      <group ref={swing}>
        <mesh position-z={-0.04}>
          <boxGeometry args={[PW + 0.18, PH + 0.18, 0.06]} />
          <primitive object={trim} attach="material" />
        </mesh>
        <mesh
          onClick={open}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <planeGeometry args={[PW, PH]} />
          <meshBasicMaterial map={tex} toneMapped={false} color={[0.95, 0.95, 0.95]} />
        </mesh>
      </group>
      {/* floor uplight */}
      <mesh position={[0, -2.53, 0.6]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.4, 24]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

export default function Posters() {
  return posters.map((p) => <Poster key={p.id} stop={p} />);
}
