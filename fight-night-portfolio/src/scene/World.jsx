import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import Arena from './Arena';
import Posters from './Posters';
import Rig from './Rig';

export default function World() {
  return (
    <>
      <color attach="background" args={['#030304']} />
      <fog attach="fog" args={['#07060a', 20, 70]} />
      <hemisphereLight args={['#5a4a6a', '#0a0608', 0.55]} />
      <ambientLight intensity={0.12} />
      {/* rim lights from the corners of the arena */}
      <directionalLight position={[20, 12, -10]} intensity={0.35} color="#ff3045" />
      <directionalLight position={[-20, 12, 10]} intensity={0.25} color="#5b8cff" />

      <Environment resolution={128} environmentIntensity={0.45} frames={1}>
        <Lightformer form="rect" intensity={4} color="#fff3e0" position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={2} color="#d4001c" position={[-8, 3, 0]} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#f2c94c" position={[8, 3, 0]} scale={[3, 6, 1]} />
      </Environment>

      <Arena />
      <Posters />
      <Rig />

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.95} luminanceSmoothing={0.2} radius={0.65} />
        <Vignette offset={0.22} darkness={0.8} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}
