import { useSyncExternalStore } from 'react';

// Per-frame driving state. Mutated directly inside the render loop (no React
// re-renders); the HUD samples it on a timer.
export const drive = {
  progress: 0, // metres travelled (unbounded — wraps on the loop)
  target: 0, // where the scroll wants us to be
  speed: 0, // m/s, signed
  cruise: false,
  dragging: false,
  lastLookInput: -Infinity,
  userYaw: 0,
  userPitch: 0,
  nearest: null, // nearest poster stop (for HUD + Enter key)
  nearestWeight: 0,
};

// Tiny UI store for things React actually needs to re-render on.
let ui = { open: null, started: false, view: 'drive', loaded: false };
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
  window.__drive = drive;
  window.__ui = uiStore;
}
