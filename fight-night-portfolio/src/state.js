import { useSyncExternalStore } from 'react';

// Per-frame state, mutated inside the render loop.
export const walk = {
  progress: 0, // metres walked around the arena loop (unbounded)
  target: 0,
  speed: 0,
  auto: false,
  dragging: false,
  lastLookInput: -Infinity,
  userYaw: 0,
  userPitch: 0,
  nearest: null,
  nearestWeight: 0,
  intro: 0, // 0 → 1 fly-in from above the octagon
  punch: { left: -1, right: -1 }, // clock time of the last strike per hand
  hits: {}, // poster id → { count, last }
  shake: 0,
  landed: 0,
};

let ui = { open: null, started: false, view: 'arena', loaded: false, ko: null, combo: 0 };
const listeners = new Set();
export const uiStore = {
  get: () => ui,
  set: (patch) => {
    ui = { ...ui, ...(typeof patch === 'function' ? patch(ui) : patch) };
    listeners.forEach((l) => l());
  },
  subscribe: (l) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
export const useUI = () => useSyncExternalStore(uiStore.subscribe, uiStore.get);

if (import.meta.env.DEV) {
  window.__walk = walk;
  window.__ui = uiStore;
}
