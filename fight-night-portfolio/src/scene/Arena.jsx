import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CAGE_R, CROWD_R, STAGE_H, sections, wrap } from './track';
import { GOLD, RED, makeBannerTexture, makeChainTexture, makeJumboCanvas, makeMatTexture } from './textures';
import { walk } from '../state';

const OCT = 8;
const R_CORNER = CAGE_R / Math.cos(Math.PI / OCT); // radius to the posts
const FENCE_H = 1.85;

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------------------
function Octagon() {
  const mat = useMemo(() => makeMatTexture(), []);
  const chain = useMemo(() => {
    const t = makeChainTexture();
    t.repeat.set(26, 9);
    return t;
  }, []);
  const panelW = 2 * CAGE_R * Math.tan(Math.PI / OCT);

  const corners = useMemo(
    () =>
      Array.from({ length: OCT }, (_, i) => {
        const a = (i / OCT) * Math.PI * 2 + Math.PI / OCT;
        return [Math.cos(a) * R_CORNER, Math.sin(a) * R_CORNER, a];
      }),
    [],
  );
  const panels = useMemo(
    () =>
      Array.from({ length: OCT }, (_, i) => {
        const a = (i / OCT) * Math.PI * 2;
        return { x: Math.cos(a) * CAGE_R, z: Math.sin(a) * CAGE_R, rotY: -a + Math.PI / 2, i };
      }),
    [],
  );

  return (
    <group>
      {/* platform */}
      <mesh position-y={STAGE_H / 2} rotation-y={Math.PI / OCT}>
        <cylinderGeometry args={[R_CORNER + 1.1, R_CORNER + 1.4, STAGE_H, OCT]} />
        <meshStandardMaterial color="#0c0c0c" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* apron LED band */}
      <mesh position-y={STAGE_H - 0.12} rotation-y={Math.PI / OCT}>
        <cylinderGeometry args={[R_CORNER + 1.13, R_CORNER + 1.16, 0.08, OCT, 1, true]} />
        <meshBasicMaterial color={new THREE.Color(RED).multiplyScalar(3)} toneMapped={false} />
      </mesh>
      {/* the canvas */}
      <mesh position-y={STAGE_H + 0.005} rotation-x={-Math.PI / 2} rotation-z={Math.PI / OCT}>
        <circleGeometry args={[R_CORNER + 1.05, OCT]} />
        <meshStandardMaterial map={mat} roughness={0.85} />
      </mesh>

      {/* fence panels */}
      {panels.map((p) => (
        <mesh key={p.i} position={[p.x, STAGE_H + 0.35 + FENCE_H / 2, p.z]} rotation-y={p.rotY}>
          <planeGeometry args={[panelW, FENCE_H]} />
          <meshStandardMaterial
            color="#1a1a1a"
            alphaMap={chain}
            transparent
            alphaTest={0.4}
            side={THREE.DoubleSide}
            metalness={0.8}
            roughness={0.4}
          />
        </mesh>
      ))}
      {/* bottom pads + top rail */}
      {panels.map((p) => (
        <group key={'r' + p.i} position={[p.x, 0, p.z]} rotation-y={p.rotY}>
          <mesh position-y={STAGE_H + 0.18}>
            <boxGeometry args={[panelW, 0.36, 0.22]} />
            <meshStandardMaterial color="#111" roughness={0.5} />
          </mesh>
          <mesh position-y={STAGE_H + 0.35 + FENCE_H + 0.1}>
            <boxGeometry args={[panelW, 0.22, 0.26]} />
            <meshStandardMaterial color="#111" roughness={0.45} metalness={0.2} />
          </mesh>
          <mesh position={[0, STAGE_H + 0.18, 0.115]}>
            <planeGeometry args={[panelW * 0.8, 0.2]} />
            <meshBasicMaterial color={p.i % 2 ? GOLD : RED} toneMapped={false} />
          </mesh>
          <mesh position={[0, STAGE_H + 0.18, -0.115]} rotation-y={Math.PI}>
            <planeGeometry args={[panelW * 0.8, 0.2]} />
            <meshBasicMaterial color={p.i % 2 ? GOLD : RED} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* posts */}
      {corners.map(([x, z], i) => (
        <mesh key={i} position={[x, STAGE_H + (FENCE_H + 0.5) / 2, z]}>
          <cylinderGeometry args={[0.13, 0.13, FENCE_H + 0.5, 12]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.35} metalness={0.3} />
        </mesh>
      ))}
      {/* steps */}
      <mesh position={[CAGE_R + 2.0, 0.35, 0]}>
        <boxGeometry args={[1.3, 0.7, 2.2]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
function LightingRig() {
  const cones = useRef([]);
  const spot = useRef();
  const target = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    target.position.set(0, STAGE_H, 0);
    spot.current.target = target;
  }, [target]);
  const lamps = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return [Math.cos(a) * 6.2, Math.sin(a) * 6.2, a];
      }),
    [],
  );
  const coneMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { color: { value: new THREE.Color('#fff4e0') } },
        vertexShader: /* glsl */ `
          varying float vY; varying vec3 vN; varying vec3 vView;
          void main(){ vY = uv.y; vN = normalize(normalMatrix*normal);
            vec4 mv = modelViewMatrix*vec4(position,1.); vView = normalize(-mv.xyz);
            gl_Position = projectionMatrix*mv; }`,
        fragmentShader: /* glsl */ `
          uniform vec3 color; varying float vY; varying vec3 vN; varying vec3 vView;
          void main(){ float rim = pow(abs(dot(vN, vView)), 1.6);
            gl_FragColor = vec4(color, 0.055 * vY * rim); }`,
      }),
    [],
  );
  return (
    <group>
      <primitive object={target} />
      <spotLight ref={spot} position={[0, 14, 0]} angle={0.62} penumbra={0.5} intensity={650} decay={2} color="#fff6e8" castShadow={false} />
      <pointLight position={[0, 6, 0]} intensity={25} distance={30} decay={2} color="#ffe9cc" />
      {/* truss ring */}
      <mesh position-y={10} rotation-x={Math.PI / 2}>
        <torusGeometry args={[6.4, 0.12, 6, 48]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.4} />
      </mesh>
      {lamps.map(([x, z], i) => (
        <group key={i} position={[x, 9.75, z]}>
          <mesh>
            <cylinderGeometry args={[0.22, 0.28, 0.4, 10]} />
            <meshStandardMaterial color="#1b1b1b" metalness={0.7} />
          </mesh>
          <mesh position-y={-0.21} rotation-x={Math.PI / 2}>
            <circleGeometry args={[0.2, 12]} />
            <meshBasicMaterial color={[6, 5.6, 5]} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          {/* beam */}
          <mesh
            ref={(m) => (cones.current[i] = m)}
            position={[0, -4.3, 0]}
          >
            <cylinderGeometry args={[0.18, 1.5, 8.6, 20, 1, true]} />
            <primitive object={coneMat} attach="material" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
function Jumbotron() {
  const jumbo = useMemo(() => makeJumboCanvas(), []);
  const group = useRef();
  const lastKey = useRef('');
  useFrame((_, dt) => {
    group.current.rotation.y += dt * 0.08;
    const here = wrap(walk.progress);
    let sec = sections[0];
    for (const s of sections) if (here + 1 >= s.s) sec = s;
    const p = walk.nearest && walk.nearestWeight > 0.4 ? walk.nearest : null;
    const title = p ? (p.kind === 'project' ? p.data.title : p.title) : 'Nikhil Mohan';
    const sub = p ? (p.kind === 'project' ? p.billing : p.section) : 'Software & ML Engineer';
    const key = sec.name + title;
    if (key !== lastKey.current) {
      lastKey.current = key;
      jumbo.draw({ round: sec.round, section: sec.name, title, sub });
    }
  });
  const w = 4.2;
  const h = w * (576 / 1024);
  return (
    <group ref={group} position-y={12.4}>
      <mesh>
        <boxGeometry args={[w + 0.3, h + 0.3, w + 0.3]} />
        <meshStandardMaterial color="#090909" metalness={0.6} roughness={0.4} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation-y={(i * Math.PI) / 2} position={[Math.sin((i * Math.PI) / 2) * (w / 2 + 0.16), 0, Math.cos((i * Math.PI) / 2) * (w / 2 + 0.16)]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={jumbo.texture} toneMapped={false} color={[1.15, 1.15, 1.15]} />
        </mesh>
      ))}
      <mesh position-y={-h / 2 - 0.25}>
        <boxGeometry args={[w + 0.5, 0.12, w + 0.5]} />
        <meshBasicMaterial color={new THREE.Color(RED).multiplyScalar(3)} toneMapped={false} />
      </mesh>
      <mesh position-y={h / 2 + 2.5}>
        <cylinderGeometry args={[0.05, 0.05, 5, 6]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
function Crowd() {
  const people = useRef();
  const heads = useRef();
  const flashes = useRef();
  const { items, flashItems } = useMemo(() => {
    const r = rng(42);
    const items = [];
    const rows = 13;
    for (let row = 0; row < rows; row++) {
      const radius = CROWD_R + row * 1.15;
      const y = 0.55 + row * 0.62;
      const n = Math.floor((radius * Math.PI * 2) / 0.62);
      for (let i = 0; i < n; i++) {
        if (r() < 0.07) continue; // empty seat
        const a = (i / n) * Math.PI * 2 + row * 0.13;
        items.push({
          x: Math.cos(a) * radius,
          z: Math.sin(a) * radius,
          y: y + r() * 0.12,
          a,
          s: 0.85 + r() * 0.3,
          c: new THREE.Color().setHSL(r(), 0.12 + r() * 0.25, 0.05 + r() * 0.14),
          phase: r() * Math.PI * 2,
        });
      }
    }
    const flashItems = items.filter(() => r() < 0.06).map((p) => ({ ...p, y: p.y + 0.55 }));
    return { items, flashItems };
  }, []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    items.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p.a - Math.PI / 2);
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.s, p.s, p.s));
      people.current.setMatrixAt(i, m);
      people.current.setColorAt(i, p.c);
    });
    people.current.instanceMatrix.needsUpdate = true;
    people.current.instanceColor.needsUpdate = true;
    const skin = ['#3b2a22', '#5a4032', '#7a5a45', '#2a1d18', '#8a6a52'].map((c) => new THREE.Color(c));
    items.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x, p.y + 0.5 * p.s, p.z), q.identity(), new THREE.Vector3(p.s, p.s, p.s));
      heads.current.setMatrixAt(i, m);
      heads.current.setColorAt(i, skin[i % skin.length]);
    });
    heads.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceColor.needsUpdate = true;
    flashItems.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x * 0.985, p.y, p.z * 0.985), q.identity(), new THREE.Vector3(1, 1, 1));
      flashes.current.setMatrixAt(i, m);
      flashes.current.setColorAt(i, new THREE.Color(0, 0, 0));
    });
    flashes.current.instanceMatrix.needsUpdate = true;
  }, [items, flashItems]);

  // phone camera flashes
  const col = useMemo(() => new THREE.Color(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const fl = flashes.current;
    for (let i = 0; i < flashItems.length; i++) {
      const p = flashItems[i];
      const k = Math.sin(t * 0.9 + p.phase * 7.3) > 0.985 ? 6 : Math.sin(t * 0.5 + p.phase) > 0.6 ? 0.9 : 0;
      col.setRGB(k, k, k * 1.05);
      fl.setColorAt(i, col);
    }
    fl.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={people} args={[null, null, items.length]} frustumCulled={false}>
        <capsuleGeometry args={[0.21, 0.32, 2, 8]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[null, null, items.length]} frustumCulled={false}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={flashes} args={[null, null, flashItems.length]} frustumCulled={false}>
        <sphereGeometry args={[0.05, 6, 4]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {/* tiered seating */}
      {Array.from({ length: 13 }, (_, row) => (
        <mesh key={row} position-y={row * 0.62 + 0.1}>
          <cylinderGeometry args={[CROWD_R + row * 1.15 + 0.6, CROWD_R + row * 1.15 + 0.6, 0.2, 64, 1, true]} />
          <meshStandardMaterial color="#0b0b0d" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position-y={0.01} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[CROWD_R - 0.8, CROWD_R + 16, 64]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
function Barrier() {
  // LED advertising boards around the crowd barrier — they scroll
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 2048, 64);
    const words = ['NIKHIL MOHAN', 'SOFTWARE ENGINEER', 'ML ENGINEER', 'UWATERLOO CS', 'FIGHT NIGHT', 'NM 01'];
    ctx.font = '400 44px Anton, Impact, sans-serif';
    ctx.textBaseline = 'middle';
    let x = 20;
    let i = 0;
    while (x < 2048) {
      const w = words[i % words.length];
      ctx.fillStyle = i % 3 === 0 ? RED : i % 3 === 1 ? '#ffffff' : GOLD;
      ctx.fillText(w, x, 34);
      x += ctx.measureText(w).width + 60;
      i++;
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(-3, 1); // negative: we view the band from inside
    return t;
  }, []);
  useFrame((_, dt) => (tex.offset.x -= dt * 0.03));
  return (
    <group>
      <mesh position-y={0.55}>
        <cylinderGeometry args={[CROWD_R - 1.1, CROWD_R - 1.1, 1.1, 96, 1, true]} />
        <meshBasicMaterial map={tex} side={THREE.BackSide} toneMapped={false} color={[0.85, 0.85, 0.85]} />
      </mesh>
    </group>
  );
}

export default function Arena() {
  const hangers = useMemo(
    () =>
      sections.map((s, i) => {
        const a = (i / sections.length) * Math.PI * 2 + 0.3;
        return { ...s, a, tex: makeBannerTexture(s.name.toUpperCase(), `ROUND ${s.round}`) };
      }),
    [],
  );
  return (
    <group>
      {/* arena floor */}
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[CROWD_R - 0.8, 64]} />
        <meshStandardMaterial color="#0d0d10" roughness={0.35} metalness={0.4} />
      </mesh>
      {/* walkway ring */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <ringGeometry args={[10.2, 12.6, 96]} />
        <meshStandardMaterial color="#141418" roughness={0.6} />
      </mesh>
      {[10.2, 12.6].map((r) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[r - 0.04, r + 0.04, 128]} />
          <meshBasicMaterial color={new THREE.Color(RED).multiplyScalar(2.5)} toneMapped={false} />
        </mesh>
      ))}
      <Octagon />
      <LightingRig />
      <Jumbotron />
      <Crowd />
      <Barrier />
      {/* round banners hanging over the crowd */}
      {hangers.map((h) => (
        <group key={h.name} position={[Math.cos(h.a) * 22, 13, Math.sin(h.a) * 22]} rotation-y={-h.a - Math.PI / 2}>
          <mesh>
            <planeGeometry args={[9, 2.25]} />
            <meshBasicMaterial map={h.tex} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
