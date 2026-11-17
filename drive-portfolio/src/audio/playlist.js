// In-car playlist, streamed through Spotify's official embed player (in-page, no redirect).
// Logged-in Spotify users hear full tracks; everyone else gets Spotify's 30-second previews.
import { createDock } from './spotify';

export const TRACKS = [
  { title: 'One Dance', artist: 'Drake', id: '1zi7xx7UVEFkmKfv06H8x0' },
  { title: '9', artist: 'Drake', id: '1NRQH3aSAceShiZND67jOD' },
  { title: 'Marvins Room', artist: 'Drake', id: '1GpSXGBCDDHKRrOTqg4jdr' },
  { title: 'Nice For What', artist: 'Drake', id: '3CA9pLiwRIGtUBiMjbZmRw' },
  { title: 'Mamacita', artist: 'Travis Scott', id: '0uFz9q2SvuKyWB6Ur1YCfI' },
  { title: 'MY EYES', artist: 'Travis Scott', id: '4kjI1gwQZRKNDkw1nI475M' },
  { title: 'Drugs You Should Try It', artist: 'Travis Scott', id: '4b7vk8SRcYgnxpk0JOIS7r' },
  { title: 'Human Nature', artist: 'Michael Jackson', id: '4cgjA7B4fJBHyB9Ya2bu0t' },
  { title: 'Beat It', artist: 'Michael Jackson', id: '3BovdzfaX4jb5KFQwoPfAw' },
  { title: 'Blue Gangsta', artist: 'Michael Jackson', id: '36lVpg8hgy37iZEazTOJBb' },
  { title: 'Liberian Girl', artist: 'Michael Jackson', id: '4cQCbTvK74CQLL5YuAmqyh' },
];
const uri = (i) => `spotify:track:${TRACKS[i].id}`;

const state = {
  index: Math.floor(Math.random() * TRACKS.length),
  playing: false,
  muted: false,
  available: TRACKS.map(() => true),
  ready: false,
  blocked: true, // waiting for a click/tap/key before sound can start
  error: false,
  version: 0,
};
let controller = null;
let position = 0;
let duration = 0;
let advancing = false;
let wantPlay = false;

const listeners = new Set();
const emit = () => {
  state.version++;
  listeners.forEach((l) => l());
};

export const player = {
  get: () => state,
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  time: () => ({ t: position / 1000, d: duration / 1000 }),
};

function load(i, autoplay = true) {
  state.index = i;
  position = 0;
  duration = 0;
  if (controller) {
    controller.loadUri(uri(i));
    if (autoplay) controller.play();
  }
  emit();
}

export const controls = {
  play() {
    wantPlay = true;
    if (!controller) return;
    state.muted = false;
    controller.resume();
    controller.play();
  },
  pause() {
    wantPlay = false;
    controller?.pause();
  },
  toggle() {
    state.playing ? controls.pause() : controls.play();
  },
  next() {
    load((state.index + 1) % TRACKS.length);
  },
  prev() {
    if (position > 4000) {
      controller?.seek(0);
      return;
    }
    load((state.index - 1 + TRACKS.length) % TRACKS.length);
  },
  select(i) {
    load(i);
  },
  // the embed has no volume API, so "mute" pauses and remembers it
  mute() {
    state.muted = !state.muted;
    if (state.muted) controller?.pause();
    else controls.play();
    emit();
  },
};

export async function initPlaylist() {
  if (state.ready || controller) return;
  try {
    controller = await createDock({ id: 'spotify-dock', uri: uri(state.index), width: 300, height: 80 });
  } catch {
    state.error = true;
    emit();
    return;
  }
  state.ready = true;
  controller.addListener('playback_update', (e) => {
    const { isPaused, isBuffering, position: p, duration: d } = e.data;
    position = p;
    duration = d;
    const playing = !isPaused && !isBuffering;
    if (playing) state.blocked = false;
    if (playing !== state.playing) {
      state.playing = playing;
      emit();
    }
    // the embed has no "ended" event — advance when we reach the end
    if (d > 0 && p >= d - 600 && !advancing) {
      advancing = true;
      setTimeout(() => (advancing = false), 2500);
      controls.next();
    }
  });
  emit();

  // Browsers only allow sound after a user gesture: start on the first click / tap / key.
  const kick = () => {
    if (!state.muted && !state.playing) controls.play();
    window.removeEventListener('pointerdown', kick, true);
    window.removeEventListener('keydown', kick, true);
    window.removeEventListener('touchend', kick, true);
  };
  window.addEventListener('pointerdown', kick, true);
  window.addEventListener('keydown', kick, true);
  window.addEventListener('touchend', kick, true);
  if (wantPlay) controls.play();
  controller.play(); // succeeds where autoplay is allowed
}
