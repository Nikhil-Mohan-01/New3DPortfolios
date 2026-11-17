import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { armAutoplay } from './audio/crowd';
import World from './scene/World';
import Hud, { Intro, Panel } from './ui/Hud';
import ListView from './ui/ListView';
import ViewCounter from './ui/ViewCounter';
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
  useEffect(() => armAutoplay(), []);
  if (!webgl)
    return (
      <>
        <ListView canDrive={false} />
        <ViewCounter />
      </>
    );

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
      {ui.view === 'arena' && (
        <>
          <Hud />
          <Panel />
          <Intro />
        </>
      )}
      {ui.view === 'list' && <ListView />}
      <ViewCounter />
    </>
  );
}
