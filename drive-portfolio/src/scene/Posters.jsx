import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BUILDING_LINE, frameAt, posters } from './track';
import { makePosterTexture, makeWindowTexture } from './textures';
import { drive, uiStore } from '../state';

export const POSTER_W = 10;
export const POSTER_H = 6.25;
export const POSTER_Y = 4.25; // centre height

const ACCENTS = {
  intro: '#ff2e88',
  experience: '#22d3ee',
  education: '#a3e635',
  contact: '#facc15',
};

export function posterWorld(stop) {
  const f = frameAt(stop.s);
  return f.pos.clone().addScaledVector(f.right, BUILDING_LINE - 0.45).setY(POSTER_Y);
}

function Poster({ stop, wallMat }) {
  const accent = stop.data?.color || ACCENTS[stop.kind] || '#ff2e88';
  const { tex, pos, rotY, depth, height, frameMat, base } = useMemo(() => {
    const f = frameAt(stop.s);
    const tex = makePosterTexture({ ...stop, accent });
    // the poster faces the road (−right)
    const facing = f.right.clone().negate();
    return {
      tex,
      pos: f.pos.clone().addScaledVector(f.right, BUILDING_LINE),
      rotY: Math.atan2(facing.x, facing.z),
      depth: 12,
      height: 15 + ((stop.s * 7) % 9),
      frameMat: new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(3.2), toneMapped: false }),
      base: new THREE.Color(accent).multiplyScalar(3.2),
    };
  }, [stop, accent]);

  useFrame(() => {
    // pulse the frame when this is the poster you're looking at
    const active = drive.nearest?.id === stop.id ? drive.nearestWeight : 0;
    frameMat.color.copy(base).multiplyScalar(0.55 + active * 0.8);
  });

  const open = (e) => {
    e.stopPropagation();
    if (e.delta > 6) return; // was a drag-to-look, not a click
    uiStore.set({ open: stop.id });
  };

  const fw = POSTER_W + 0.5;
  const fh = POSTER_H + 0.5;
  return (
    // local +Z points at the road; building extends to −Z
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, height / 2 - 0.5, -depth / 2]} material={wallMat}>
        <boxGeometry args={[18, height, depth]} />
      </mesh>
      {/* backing panel */}
      <mesh position={[0, POSTER_Y, 0.25]}>
        <boxGeometry args={[fw + 0.3, fh + 0.3, 0.3]} />
        <meshStandardMaterial color="#0b0a10" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh
        position={[0, POSTER_Y, 0.42]}
        onClick={open}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <planeGeometry args={[POSTER_W, POSTER_H]} />
        <meshBasicMaterial map={tex} toneMapped={false} color={[0.96, 0.96, 0.96]} />
      </mesh>
      {/* neon frame */}
      <group position={[0, POSTER_Y, 0.42]}>
        {[
          [0, fh / 2, fw + 0.16, 0.16],
          [0, -fh / 2, fw + 0.16, 0.16],
          [fw / 2, 0, 0.16, fh],
          [-fw / 2, 0, 0.16, fh],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} position={[x, y, 0]} material={frameMat}>
            <boxGeometry args={[w, h, 0.12]} />
          </mesh>
        ))}
      </group>
      {/* little flood lamps */}
      {[-3.2, 3.2].map((x) => (
        <group key={x} position={[x, POSTER_Y + fh / 2 + 0.7, 1.1]}>
          <mesh>
            <boxGeometry args={[0.1, 0.1, 1.6]} />
            <meshStandardMaterial color="#2c2a36" />
          </mesh>
          <mesh position={[0, -0.1, 0.8]}>
            <boxGeometry args={[0.7, 0.18, 0.3]} />
            <meshBasicMaterial color={[3, 2.8, 2.5]} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Posters() {
  const wallMat = useMemo(() => {
    const t = makeWindowTexture(7);
    t.repeat.set(1.5, 1);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.6, color: '#6d6880', roughness: 0.9 });
  }, []);
  return posters.map((p) => <Poster key={p.id} stop={p} wallMat={wallMat} />);
}
