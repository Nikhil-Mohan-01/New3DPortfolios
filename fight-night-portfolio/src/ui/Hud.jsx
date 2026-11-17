import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { profile, projects, experience, education } from '../data/portfolio';
import { uiStore, useUI, walk } from '../state';
import { LENGTH, posters, sections, wrap } from '../scene/track';
import { stepStop, strike, walkTo } from '../scene/Rig';
import { isMuted, isRunning, onAudioChange, setMuted, startAudio } from '../audio/crowd';

function SoundToggle() {
  const [, force] = useState(0);
  useEffect(() => onAudioChange(() => force((n) => n + 1)), []);
  const on = isRunning() && !isMuted();
  return (
    <button
      className={`chip-btn ${on ? 'on' : ''}`}
      onClick={() => {
        if (!isRunning()) return startAudio();
        setMuted(!isMuted());
      }}
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
    >
      {on ? '🔊 Sound' : '🔇 Sound'}
    </button>
  );
}

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

const accentOf = (stop) =>
  stop?.data?.color || { intro: '#d4001c', experience: '#3b82f6', education: '#22c55e', contact: '#f2c94c' }[stop?.kind] || '#d4001c';

function useTicker() {
  const [t, setT] = useState({ round: 1, section: sections[0].name, clock: '5:00', nearest: null, w: 0, u: 0, auto: false, hits: 0, landed: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      const here = wrap(walk.progress);
      let si = 0;
      sections.forEach((s, i) => here + 1 >= s.s && (si = i));
      const sec = sections[si];
      const end = sections[si + 1]?.s ?? LENGTH;
      const frac = Math.min(1, Math.max(0, (here - sec.s) / (end - sec.s)));
      const left = Math.round(300 * (1 - frac));
      const n = walk.nearest;
      setT({
        round: sec.round,
        section: sec.name,
        clock: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`,
        nearest: n,
        w: walk.nearestWeight,
        u: here / LENGTH,
        auto: walk.auto,
        hits: n ? walk.hits[n.id]?.count || 0 : 0,
        landed: walk.landed,
        index: n ? posters.indexOf(n) + 1 : 1,
        fwd: !!walk.keys?.fwd,
        back: !!walk.keys?.back,
        moved: walk.stepped || Math.abs(walk.progress) > 1,
      });
    }, 90);
    return () => clearInterval(id);
  }, []);
  return t;
}

function strap(stop) {
  if (!stop) return null;
  const d = stop.data;
  switch (stop.kind) {
    case 'project':
      return { tag: `Bout ${String(stop.index).padStart(2, '0')} · ${stop.billing}`, title: d.title, sub: d.kicker };
    case 'experience':
      return { tag: 'Fight history', title: d.company, sub: d.role };
    case 'education':
      return { tag: 'Training camp', title: d.name, sub: d.detail };
    case 'intro':
      return { tag: 'Red corner', title: profile.name, sub: `"The Engineer" · ${profile.role}` };
    case 'contact':
      return { tag: 'Next fight', title: 'Book the fight', sub: 'GitHub · LinkedIn · Email' };
    default:
      return null;
  }
}

function FightCard({ u }) {
  return (
    <div className="card-strip" aria-label="Fight card — jump to a bout">
      {posters.map((p) => (
        <button
          key={p.id}
          className={`bout k-${p.kind}`}
          style={{ left: `${(p.s / LENGTH) * 100}%`, '--accent': accentOf(p) }}
          onClick={() => {
            walkTo(p);
            uiStore.set({ started: true });
          }}
        >
          <span>{p.kind === 'project' ? p.data.title : p.title}</span>
        </button>
      ))}
      <div className="card-marker" style={{ left: `${u * 100}%` }} />
    </div>
  );
}

export default function Hud() {
  const ui = useUI();
  useEffect(() => {
    document.body.classList.toggle('is-started', !!ui.started && ui.view !== 'list');
  }, [ui.started, ui.view]);
  const t = useTicker();
  const s = t.w > 0.5 ? strap(t.nearest) : null;

  return (
    <div className={`hud ${ui.started ? 'is-started' : ''}`}>
      <header className="topbar">
        <div className="bug">
          <div className="bug-logo">
            <b>NM</b>
            <span>FIGHT NIGHT</span>
          </div>
          <div className="bug-round">
            <span>RD {t.round}</span>
            <b>{t.clock}</b>
          </div>
          <div className="bug-section">{t.section}</div>
        </div>
        <div className="top-actions">
          <button className={`chip-btn ${t.auto ? 'on' : ''}`} onClick={() => ((walk.auto = !walk.auto), uiStore.set({ started: true }))}>
            {t.auto ? '■ Auto-circle' : '▶ Auto-circle'}
          </button>
          <SoundToggle />
          <button className="chip-btn" onClick={() => uiStore.set({ view: 'list' })}>
            ☰ List view
          </button>
          <SocialLinks />
        </div>
      </header>

      {s && !ui.open && (
        <div className="lower-third" key={t.nearest.id} style={{ '--accent': accentOf(t.nearest) }}>
          <div className="lt-tag">{s.tag}</div>
          <div className="lt-actions">
            <button onClick={() => uiStore.set({ open: t.nearest.id })}>
              Open <kbd>Enter</kbd>
            </button>
            <span className="lt-hits" title="Land 3 strikes to KO the poster open">
              {[0, 1, 2].map((i) => (
                <i key={i} className={i < t.hits ? 'on' : ''} />
              ))}
              <em>KO Nikhil to open</em>
            </span>
          </div>
        </div>
      )}

      <div className="strikes">
        <div className="landed">
          Strikes landed <b>{t.landed}</b>
        </div>
        <div className="strike-btns">
          <button onPointerDown={() => strike('left')} aria-label="Jab">
            JAB<small>J</small>
          </button>
          <button onPointerDown={() => strike('right')} aria-label="Cross">
            CROSS<small>K</small>
          </button>
        </div>
      </div>

      <div className="walkpad">
        {!t.moved && ui.started && (
          <div className="walk-hint">
            Press <kbd>W</kbd> to step to the next card · <kbd>S</kbd> to go back
          </div>
        )}
        <button className={`wp-btn ${t.back ? 'held' : ''}`} onClick={() => stepStop(-1)} aria-label="Previous card (S)">
          <span className="key">S</span>
          <span className="lbl">◀ Back</span>
        </button>
        <div className="wp-count">
          <b>{String(t.index).padStart(2, '0')}</b>
          <span>/ {posters.length}</span>
        </div>
        <button className={`wp-btn ${t.fwd ? 'held' : ''}`} onClick={() => stepStop(1)} aria-label="Next card (W)">
          <span className="lbl">Next ▶</span>
          <span className="key">W</span>
        </button>
      </div>

      <footer className="footer">
        <FightCard u={t.u} />
        <div className="hint">
          <span>
            <kbd>W</kbd>
            <kbd>S</kbd> / <kbd>Scroll</kbd> walk
          </span>
          <span>
            <kbd>Drag</kbd> look
          </span>
          <span>
            <kbd>J</kbd>
            <kbd>K</kbd> strike
          </span>
          <span>
            <kbd>Space</kbd> auto-circle
          </span>
        </div>
      </footer>

      {ui.ko && (
        <div className="ko">
          <b>KNOCKOUT!</b>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function Intro() {
  const ui = useUI();
  const { progress, active } = useProgress();
  const ready = ui.loaded || (!active && progress >= 100) || progress === 0;
  useEffect(() => {
    const id = setTimeout(() => uiStore.set({ loaded: true }), 600);
    return () => clearTimeout(id);
  }, []);
  if (ui.started) return null;
  return (
    <div className="intro">
      <div className="intro-card">
        <div className="intro-top">
          <span>NM 01</span>
          <span>FIGHT NIGHT</span>
          <span>LIVE</span>
        </div>
        <div className="intro-fight">
          <div className="corner red">
            <small>Red corner</small>
            <h1>
              Nikhil
              <br />
              Mohan
            </h1>
            <p>&ldquo;The Engineer&rdquo;</p>
          </div>
          <div className="vs">VS</div>
          <div className="corner blue">
            <small>Blue corner</small>
            <h2>You</h2>
            <p className="blue-sub">the challenger</p>
          </div>
        </div>
        <p className="intro-sub">
          {profile.role} · {profile.school}. {profile.tagline}
        </p>
        <p className="intro-how">
          Step into the cage. <b>W / S</b> (or scroll) to circle him and move through the fight card · <b>drag</b> to look around ·{' '}
          <b>J / K</b> to throw strikes — land three to knock him down and open the card.
        </p>
        <div className="intro-actions">
          <button className="cta" disabled={!ready} onClick={() => uiStore.set({ started: true })}>
            {ready ? 'Walk out' : `Loading ${Math.round(progress)}%`}
          </button>
          <button className="ghost" onClick={() => uiStore.set({ view: 'list', started: true })}>
            Skip to list view
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function Panel() {
  const ui = useUI();
  const stop = posters.find((p) => p.id === ui.open);
  if (!stop) return null;
  const i = posters.indexOf(stop);
  const go = (dir) => {
    const next = posters[(i + dir + posters.length) % posters.length];
    walkTo(next);
    uiStore.set({ open: next.id });
  };
  const d = stop.data;

  return (
    <div className="panel-wrap" onClick={() => uiStore.set({ open: null })}>
      <article className="panel" style={{ '--accent': accentOf(stop) }} onClick={(e) => e.stopPropagation()}>
        <button className="panel-close" onClick={() => uiStore.set({ open: null })} aria-label="Close">
          ✕
        </button>
        {stop.kind === 'project' && (
          <>
            <small>
              Bout {String(stop.index).padStart(2, '0')} · {stop.billing}
            </small>
            <h2>{d.title}</h2>
            <p className="kicker">{d.kicker}</p>
            <p className="lead">{d.summary}</p>
            <h4>Gameplan</h4>
            <ul>
              {d.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <h4>Corner (stack)</h4>
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
            <small>Fight history</small>
            <h2>{d.company}</h2>
            <p className="lead">{d.role}</p>
            <p>{d.blurb}</p>
            <h4>Full record</h4>
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
            <small>Training camp</small>
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
            <small>Official weigh-in</small>
            <h2>{profile.name}</h2>
            <p className="lead">
              {profile.role} · {profile.school}
            </p>
            <p>{profile.tagline}</p>
            <div className="tape">
              <div>
                <span>Division</span>
                <b>Software &amp; ML</b>
              </div>
              <div>
                <span>Camp</span>
                <b>UWaterloo CS</b>
              </div>
              <div>
                <span>Record</span>
                <b>
                  {projects.length} projects · {experience.length} roles
                </b>
              </div>
            </div>
          </>
        )}
        {stop.kind === 'contact' && (
          <>
            <small>Next fight</small>
            <h2>Book the fight</h2>
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
          <button onClick={() => go(-1)}>← Previous bout</button>
          <button onClick={() => go(1)}>Next bout →</button>
        </nav>
      </article>
    </div>
  );
}
