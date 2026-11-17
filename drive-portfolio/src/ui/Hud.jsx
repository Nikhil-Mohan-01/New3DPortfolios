import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { profile, projects, experience, education } from '../data/portfolio';
import { drive, uiStore, useUI } from '../state';
import { LENGTH, posters, sections, wrap } from '../scene/track';
import { driveTo } from '../scene/DriveRig';
import { TRACKS, controls, player } from '../audio/playlist';
import { useSyncExternalStore } from 'react';

function NowPlaying() {
  useSyncExternalStore(player.subscribe, () => player.get().version);
  const s = player.get();
  if (!s.available.some(Boolean)) return null;
  const tr = TRACKS[s.index];
  return (
    <button className={`chip-btn now-playing ${s.playing ? 'on' : ''}`} onClick={() => controls.toggle()} title="Play / pause (P) · next (N) · previous (B)">
      {s.playing ? '♪' : '▶'} <span>{tr.title}</span> <em>{tr.artist}</em>
    </button>
  );
}

// ---------------------------------------------------------------------------
export const Icon = {
  github: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  ),
};

export function SocialLinks() {
  return (
    <div className="socials">
      <a href={profile.links.github} target="_blank" rel="noreferrer" aria-label="GitHub">
        {Icon.github}
      </a>
      <a href={profile.links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
        {Icon.linkedin}
      </a>
      <a href={profile.links.email} aria-label="Email">
        {Icon.mail}
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
function useTicker() {
  const [t, setT] = useState({ speed: 0, section: 'Welcome', lap: 1, nearest: null, w: 0, u: 0, cruise: false });
  useEffect(() => {
    const id = setInterval(() => {
      const here = wrap(drive.progress);
      let section = sections[sections.length - 1].name;
      for (const s of sections) if (here + 20 >= s.s) section = s.name;
      if (here + 20 < sections[0].s) section = 'Welcome';
      setT({
        speed: Math.round(Math.abs(drive.speed) * 3.6),
        reverse: drive.speed < -0.5,
        section,
        lap: Math.floor(drive.progress / LENGTH) + 1,
        nearest: drive.nearest,
        w: drive.nearestWeight,
        u: here / LENGTH,
        cruise: drive.cruise,
      });
    }, 90);
    return () => clearInterval(id);
  }, []);
  return t;
}

function nearestCard(stop) {
  if (!stop) return null;
  const d = stop.data;
  switch (stop.kind) {
    case 'project':
      return { tag: `Project ${stop.index}/${stop.total}`, title: d.title, body: d.summary, color: d.color };
    case 'experience':
      return { tag: 'Experience', title: d.company, body: d.role, color: '#22d3ee' };
    case 'education':
      return { tag: 'Education', title: d.name, body: d.detail, color: '#a3e635' };
    case 'intro':
      return { tag: 'Welcome', title: profile.name, body: profile.tagline, color: '#ff2e88' };
    case 'contact':
      return { tag: 'Contact', title: "Let's talk", body: 'GitHub · LinkedIn · Email', color: '#facc15' };
    default:
      return null;
  }
}

function Speedo({ speed, reverse }) {
  const pct = Math.min(speed / 300, 1);
  const r = 46;
  const arc = Math.PI * 1.5 * r;
  return (
    <div className="speedo">
      <svg viewBox="0 0 120 120" width="112" height="112">
        <circle cx="60" cy="60" r={r} className="speedo-track" strokeDasharray={`${arc} 999`} transform="rotate(135 60 60)" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="speedo-fill"
          strokeDasharray={`${arc * pct} 999`}
          transform="rotate(135 60 60)"
        />
      </svg>
      <div className="speedo-read">
        <b>{speed}</b>
        <span>km/h</span>
      </div>
      <div className="gear">{speed < 1 ? 'P' : reverse ? 'R' : 'D'}</div>
    </div>
  );
}

function Route({ u }) {
  return (
    <div className="route" aria-label="Route — jump to a stop">
      <div className="route-line" />
      {posters.map((p) => (
        <button
          key={p.id}
          className={`route-stop k-${p.kind}`}
          style={{ left: `${(p.s / LENGTH) * 100}%` }}
          onClick={() => {
            driveTo(p);
            uiStore.set({ started: true });
          }}
          title={p.title}
        >
          <span>{p.title}</span>
        </button>
      ))}
      {sections.map((s) => (
        <span key={s.name} className="route-label" style={{ left: `${(s.s / LENGTH) * 100}%` }}>
          {s.name}
        </span>
      ))}
      <div className="route-car" style={{ left: `${u * 100}%` }} />
    </div>
  );
}

export default function Hud() {
  const ui = useUI();
  useEffect(() => {
    document.body.classList.toggle('is-started', !!ui.started && ui.view !== 'list');
  }, [ui.started, ui.view]);
  const t = useTicker();
  const card = t.w > 0.55 ? nearestCard(t.nearest) : null;

  return (
    <div className={`hud ${ui.started ? 'is-started' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <b>{profile.name.toUpperCase()}</b>
          <span>{profile.role} · UWaterloo CS</span>
        </div>
        <div className="top-actions">
          <button className={`chip-btn ${t.cruise ? 'on' : ''}`} onClick={() => ((drive.cruise = !drive.cruise), uiStore.set({ started: true }))}>
            {t.cruise ? '■ Cruise on' : '▶ Cruise'}
          </button>
          <NowPlaying />
          <button className="chip-btn" onClick={() => uiStore.set({ view: 'list' })}>
            ☰ List view
          </button>
          <SocialLinks />
        </div>
      </header>

      {card && !ui.open && (
        <aside className="passing" style={{ '--accent': card.color }} key={t.nearest.id}>
          <small>Now passing — {card.tag}</small>
          <h3>{card.title}</h3>
          <p>{card.body}</p>
          <button onClick={() => uiStore.set({ open: t.nearest.id })}>
            Open details <kbd>Enter</kbd>
          </button>
        </aside>
      )}

      <footer className="dash">
        <Speedo speed={t.speed} reverse={t.reverse} />
        <div className="dash-mid">
          <div className="dash-row">
            <span className="dash-section">{t.section}</span>
            <span className="dash-lap">LAP {t.lap}</span>
          </div>
          <Route u={t.u} />
          <div className="dash-hint">
            <span>
              <kbd>Scroll</kbd> drive
            </span>
            <span>
              <kbd>Drag</kbd> look around
            </span>
            <span>
              <kbd>Space</kbd> cruise
            </span>
            <span>
              <kbd>Click</kbd> a poster
            </span>
            <span>
              <kbd>P</kbd>
              <kbd>N</kbd> music · tap the console
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function ModelCredit() {
  return (
    <p className="credit">
      R34 model by{' '}
      <a href="https://sketchfab.com/3d-models/2002-nissan-skyline-r34-gt-r-bb7b67852aee412eacc9c97270886a50" target="_blank" rel="noreferrer">
        Ddiaz Design
      </a>{' '}
      ·{' '}
      <a href="http://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">
        CC BY-NC-SA 4.0
      </a>
    </p>
  );
}

// ---------------------------------------------------------------------------
export function Intro() {
  const ui = useUI();
  const { progress, active } = useProgress();
  const ready = ui.loaded || (!active && progress >= 100);
  useEffect(() => {
    if (ready && !ui.loaded) uiStore.set({ loaded: true });
  }, [ready, ui.loaded]);
  if (ui.started) return null;
  return (
    <div className="intro">
      <div className="intro-inner">
        <small>ポートフォリオ · NIGHT DRIVE</small>
        <h1>
          Nikhil
          <br />
          Mohan
        </h1>
        <p>
          {profile.role} — {profile.school}. {profile.tagline}
        </p>
        <p className="intro-how">
          You&rsquo;re in the driver&rsquo;s seat. <b>Scroll to drive</b>, <b>drag to look around</b>. My work is posted on the
          buildings outside the driver&rsquo;s window.
        </p>
        <div className="intro-actions">
          <button className="cta" disabled={!ready} onClick={() => uiStore.set({ started: true })}>
            {ready ? 'Start the engine' : `Loading ${Math.round(progress)}%`}
          </button>
          <button className="ghost" onClick={() => uiStore.set({ view: 'list', started: true })}>
            Skip to list view
          </button>
        </div>
        <ModelCredit />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function Panel() {
  const ui = useUI();
  const stop = posters.find((p) => p.id === ui.open);
  useEffect(() => {
    if (!stop) return;
    const onKey = (e) => e.key === 'Escape' && uiStore.set({ open: null });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop]);
  if (!stop) return null;
  const i = posters.indexOf(stop);
  const go = (dir) => {
    const next = posters[(i + dir + posters.length) % posters.length];
    driveTo(next);
    uiStore.set({ open: next.id });
  };
  const d = stop.data;
  const color = d?.color || { experience: '#22d3ee', education: '#a3e635', intro: '#ff2e88', contact: '#facc15' }[stop.kind];

  return (
    <div className="panel-wrap" onClick={() => uiStore.set({ open: null })}>
      <article className="panel" style={{ '--accent': color }} onClick={(e) => e.stopPropagation()} data-scroll-ui>
        <button className="panel-close" onClick={() => uiStore.set({ open: null })} aria-label="Close">
          ✕
        </button>
        {stop.kind === 'project' && (
          <>
            <small>
              Project {stop.index} / {stop.total} · {d.kicker}
            </small>
            <h2>{d.title}</h2>
            <p className="lead">{d.summary}</p>
            <ul>
              {d.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="stack">
              {d.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <div className="links">
              {d.link && (
                <a href={d.link.url} target="_blank" rel="noreferrer">
                  {d.link.label} ↗
                </a>
              )}
              {d.link2 && (
                <a href={d.link2.url} target="_blank" rel="noreferrer">
                  {d.link2.label} ↗
                </a>
              )}
              {!d.link && <span className="muted">Source is private — happy to walk through it.</span>}
            </div>
          </>
        )}
        {stop.kind === 'experience' && (
          <>
            <small>Experience</small>
            <h2>{d.company}</h2>
            <p className="lead">{d.role}</p>
            <p>{d.blurb}</p>
            <h4>All roles</h4>
            <ul>
              {experience.map((e) => (
                <li key={e.id}>
                  <b>{e.role}</b> @ {e.company}
                </li>
              ))}
            </ul>
            <div className="links">
              <a href={d.url} target="_blank" rel="noreferrer">
                {d.company} ↗
              </a>
            </div>
          </>
        )}
        {stop.kind === 'education' && (
          <>
            <small>Education</small>
            <h2>{d.name}</h2>
            <p className="lead">{d.detail}</p>
            <ul>
              {education.map((e) => (
                <li key={e.id}>
                  <b>{e.name}</b> — {e.detail}
                </li>
              ))}
            </ul>
          </>
        )}
        {stop.kind === 'intro' && (
          <>
            <small>Welcome</small>
            <h2>{profile.name}</h2>
            <p className="lead">
              {profile.role} · {profile.school}
            </p>
            <p>{profile.tagline}</p>
            <p>
              Keep driving to pass {experience.length} roles and {projects.length} projects. The road loops forever — use the
              route bar at the bottom to jump anywhere.
            </p>
          </>
        )}
        {stop.kind === 'contact' && (
          <>
            <small>Contact</small>
            <h2>Let&rsquo;s talk</h2>
            <p className="lead">Always happy to talk about SWE &amp; ML roles, projects, or interesting problems.</p>
            <div className="links big">
              <a href={profile.links.github} target="_blank" rel="noreferrer">
                {Icon.github} GitHub
              </a>
              <a href={profile.links.linkedin} target="_blank" rel="noreferrer">
                {Icon.linkedin} LinkedIn
              </a>
              <a href={profile.links.email}>
                {Icon.mail} {profile.links.email.replace('mailto:', '')}
              </a>
            </div>
          </>
        )}
        <nav className="panel-nav">
          <button onClick={() => go(-1)}>← Previous stop</button>
          <button onClick={() => go(1)}>Next stop →</button>
        </nav>
      </article>
    </div>
  );
}
