import { Suspense, useMemo } from 'react';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import City from './City';
import Posters from './Posters';
import DriveRig from './DriveRig';

function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color('#04030a') },
          mid: { value: new THREE.Color('#150b2e') },
          horizon: { value: new THREE.Color('#4a1747') },
        },
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 mid; uniform vec3 horizon;
          varying vec3 vPos;
          void main() {
            float h = clamp(vPos.y, -0.2, 1.0);
            vec3 c = mix(horizon, mid, smoothstep(-0.02, 0.18, h));
            c = mix(c, top, smoothstep(0.18, 0.7, h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[1200, 32, 16]} />
    </mesh>
  );
}

export default function World() {
  return (
    <>
      <color attach="background" args={['#06040d']} />
      <fog attach="fog" args={['#160c26', 45, 330]} />
      <Sky />
      <Stars radius={600} depth={120} count={2500} factor={6} fade speed={0.4} />

      <hemisphereLight args={['#6d5bd0', '#1a1020', 0.55]} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[80, 140, 40]} intensity={0.35} color="#a9b8ff" />

      {/* local, download-free environment for glossy paint / dash reflections */}
      <Environment resolution={128} environmentIntensity={0.55} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ff2e88" position={[-6, 3, 0]} scale={[2, 8, 1]} />
        <Lightformer form="rect" intensity={3} color="#22d3ee" position={[6, 3, 0]} scale={[2, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffe2b0" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="ring" intensity={2} color="#a855f7" position={[0, 2, -9]} scale={4} />
      </Environment>

      <City />
      <Posters />
      <Suspense fallback={null}>
        <DriveRig />
      </Suspense>

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.95} luminanceSmoothing={0.25} radius={0.7} />
        <Vignette offset={0.25} darkness={0.75} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}
