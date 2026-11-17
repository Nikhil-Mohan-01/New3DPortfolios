import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export const MODEL_URL = '/models/r34/r34-runtime.glb';
const CAR_LENGTH = 4.6; // metres — a real R34 GT-R is ~4.6 m long

// Model facts (inspected): Y-up, front faces +Z, right-hand drive.
// It ships at 1/100 scale, so we normalise from its bounding box.
export default function Car() {
  const { scene } = useGLTF(MODEL_URL);

  const { object, scale, offset } = useMemo(() => {
    const root = scene;
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const scale = CAR_LENGTH / size.z;

    root.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false; // we're inside it — never cull the cabin
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        const name = (m.name || '').toLowerCase();
        // transmission triggers an extra full-scene render pass; fake it instead
        if (m.transmission > 0) {
          m.transmission = 0;
          m.transparent = true;
          m.opacity = Math.min(m.opacity, 0.25);
        }
        if (name.includes('window')) {
          m.transparent = true;
          m.opacity = 0.14;
          m.depthWrite = false;
          m.roughness = 0.05;
          m.metalness = 0.2;
        }
        if (name.includes('paint')) {
          m.color = new THREE.Color('#1d2a52'); // Bayside Blue-ish
          m.roughness = 0.25;
          m.metalness = 0.6;
          if ('clearcoat' in m) m.clearcoat = 1;
        }
        m.side = name.includes('window') ? THREE.DoubleSide : m.side;
      });
    });

    return {
      object: root,
      scale,
      offset: new THREE.Vector3(-centre.x * scale, -box.min.y * scale, -centre.z * scale),
    };
  }, [scene]);

  return (
    <group position={offset} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
