import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import World from './scene/World';
import Hud, { Intro, Panel } from './ui/Hud';
import ListView from './ui/ListView';
import { useUI } from './state';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function App() {
  const ui = useUI();
  const webgl = useMemo(hasWebGL, []);
  if (!webgl) return <ListView canDrive={false} />;

  return (
    <>
      <div className="stage" aria-hidden={ui.view === 'list'}>
        <Canvas
          dpr={[1, 1.6]}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          frameloop={ui.view === 'list' ? 'never' : 'always'}
        >
          <World />
        </Canvas>
      </div>
      {ui.view === 'drive' && (
        <>
          <Hud />
          <Panel />
          <Intro />
        </>
      )}
      {ui.view === 'list' && <ListView />}
    </>
  );
}
