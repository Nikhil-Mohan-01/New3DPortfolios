// Procedural arena audio — crowd bed, chatter, swells, cheers, claps, whistles,
// plus punch / whiff / KO-bell effects. Pure Web Audio, no files to download.
//
// Browsers only let audio start after a user gesture, so we try to start
// immediately and otherwise start on the first click / tap / key press.

let ctx = null;
let master = null;
let crowdBus = null;
let excite = null; // high "cheer" band gain
let noiseBuf = null;
let muted = false;
let started = false;
const listeners = new Set();

// Walkout song — "Many Men (Wish Death)" by 50 Cent, streamed via Spotify's official
// embed player and looped under the crowd.
import { createDock } from './spotify';

const SONG_URI = 'spotify:track:2I9foKseoFQh07p6sD2voE';
let song = null;
let songAvailable = false;
let looping = false;
const songReady = createDock({ id: 'spotify-dock', uri: SONG_URI, width: 280, height: 80 })
  .then((c) => {
    song = c;
    songAvailable = true;
    c.addListener('playback_update', (e) => {
      const { position, duration } = e.data;
      // no "ended" event: loop back to the top just before the end
      if (duration > 0 && position >= duration - 700 && !looping && !muted) {
        looping = true;
        c.seek(0);
        c.resume();
        setTimeout(() => (looping = false), 2500);
      }
    });
    if (started && !muted) c.play();
    return true;
  })
  .catch(() => false);
function playSong() {
  songReady.then((ok) => {
    if (ok && !muted) {
      song.resume();
      song.play();
    }
  });
}
export const hasSong = () => !!songAvailable;

const rand = (a, b) => a + Math.random() * (b - a);

function makeNoise(seconds = 3) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    // pinkish noise (Paul Kellet)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function noiseSource() {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.loopStart = Math.random();
  s.start(0, Math.random() * 2);
  return s;
}

function band(freq, q, gain, dest = crowdBus) {
  const src = noiseSource();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(dest);
  return { f, g };
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  noiseBuf = makeNoise();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(comp).connect(ctx.destination);

  crowdBus = ctx.createGain();
  crowdBus.gain.value = 0.85;
  // big-room feel: a short feedback delay
  const delay = ctx.createDelay();
  delay.delayTime.value = 0.09;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  crowdBus.connect(master);
  crowdBus.connect(delay).connect(lp).connect(fb).connect(delay);
  lp.connect(master);

  // the bed: low rumble + body of the crowd
  band(220, 0.7, 0.5);
  const body = band(650, 0.8, 0.55);
  excite = band(1700, 0.9, 0.05).g;

  // chatter: formant-ish bands that wander like voices
  const voices = Array.from({ length: 6 }, () => band(rand(350, 1100), rand(4, 8), 0.0));
  setInterval(() => {
    const t = ctx.currentTime;
    for (const v of voices) {
      v.f.frequency.setTargetAtTime(rand(330, 1150), t, 0.08);
      v.g.gain.setTargetAtTime(Math.random() < 0.55 ? rand(0.15, 0.5) : 0, t, 0.06);
    }
  }, 180);

  // slow swells so it breathes
  const swell = () => {
    const t = ctx.currentTime;
    body.g.gain.setTargetAtTime(rand(0.45, 0.85), t, 1.2);
    setTimeout(swell, rand(2500, 6000));
  };
  swell();

  // random arena moments: a roar, applause or a whistle
  const moment = () => {
    const r = Math.random();
    if (r < 0.45) cheer(rand(0.25, 0.55));
    else if (r < 0.8) applause(rand(1.5, 3));
    else whistle();
    setTimeout(moment, rand(5000, 11000));
  };
  setTimeout(moment, 2500);
}

export function cheer(amount = 0.8) {
  if (!ctx) return;
  const t = ctx.currentTime;
  excite.gain.cancelScheduledValues(t);
  excite.gain.setTargetAtTime(0.05 + amount * 0.9, t, 0.08);
  excite.gain.setTargetAtTime(0.05, t + 0.6 + amount * 1.6, 0.9);
  if (amount > 0.6) whistle();
}

function clap(when, gain) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = rand(1100, 2400);
  f.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0008, when + 0.05);
  src.connect(f).connect(g).connect(crowdBus);
  src.start(when, Math.random() * 2, 0.07);
}

function applause(seconds) {
  const t = ctx.currentTime;
  const n = Math.floor(seconds * 70);
  for (let i = 0; i < n; i++) {
    const when = t + Math.random() * seconds;
    const env = Math.sin((Math.max(0, when - t) / seconds) * Math.PI);
    clap(when, 0.05 + env * 0.18);
  }
}

function whistle() {
  const t = ctx.currentTime + rand(0, 0.3);
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  const f0 = rand(1800, 2600);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.linearRampToValueAtTime(f0 * 1.25, t + 0.25);
  o.frequency.linearRampToValueAtTime(f0 * 0.85, t + 0.75);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.045, t + 0.05);
  g.gain.setTargetAtTime(0, t + 0.6, 0.08);
  o.connect(g).connect(crowdBus);
  o.start(t);
  o.stop(t + 1.2);
}

// ---------------------------------------------------------------------------
export const sfx = {
  punch() {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.2);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.7, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    s.connect(hp).connect(ng).connect(master);
    s.start(t, Math.random(), 0.1);
    cheer(0.35);
  },
  whiff() {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(600, t);
    bp.frequency.exponentialRampToValueAtTime(2500, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    s.connect(bp).connect(g).connect(master);
    s.start(t, Math.random(), 0.25);
  },
  ko() {
    if (!ctx || ctx.state !== 'running') return;
    cheer(1);
    applause(3.5);
    const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      for (const [f, a] of [
        [880, 0.22],
        [1320, 0.12],
        [2210, 0.06],
      ]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f;
        const w = t + i * 0.32;
        g.gain.setValueAtTime(0, w);
        g.gain.linearRampToValueAtTime(a, w + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0005, w + 1.4);
        o.connect(g).connect(master);
        o.start(w);
        o.stop(w + 1.5);
      }
    }
  },
};

// ---------------------------------------------------------------------------
function onRunning() {
  if (ctx?.state !== 'running') return;
  if (!started) {
    started = true;
    cheer(0.9);
    applause(2.5);
  }
  playSong();
  disarm();
  emit();
}

export function startAudio() {
  try {
    if (!ctx) {
      build();
      ctx.onstatechange = onRunning;
    }
    if (ctx.state === 'suspended') ctx.resume().then(onRunning, () => {});
    else onRunning();
  } catch {
    /* audio unsupported */
  }
}

const kick = () => startAudio();
function disarm() {
  window.removeEventListener('pointerdown', kick, true);
  window.removeEventListener('keydown', kick, true);
  window.removeEventListener('touchend', kick, true);
}

/** Try to autoplay now; browsers that block it start on the first click / tap / key. */
export function armAutoplay() {
  window.addEventListener('pointerdown', kick, true);
  window.addEventListener('keydown', kick, true);
  window.addEventListener('touchend', kick, true);
  startAudio();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
  if (m) song?.pause();
  else playSong();
  emit();
}
export const isMuted = () => muted;
export const isRunning = () => ctx?.state === 'running';

function emit() {
  listeners.forEach((l) => l());
}
export function onAudioChange(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}
