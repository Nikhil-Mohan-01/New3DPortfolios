import { profile, experience, projects, education } from '../data/portfolio';
import { uiStore } from '../state';
import { SocialLinks } from './Hud';

export default function ListView({ canDrive = true }) {
  return (
    <div className="list-view">
      <div className="list-inner">
        <header className="list-head">
          <div>
            <h1>{profile.name}</h1>
            <p>
              {profile.role} · {profile.school}
            </p>
            <p className="muted">{profile.tagline}</p>
          </div>
          <div className="list-actions">
            <SocialLinks />
            {canDrive && (
              <button className="cta" onClick={() => uiStore.set({ view: 'arena', started: true })}>
                ← Back to the arena
              </button>
            )}
          </div>
        </header>

        <section>
          <h2>Experience</h2>
          {experience.map((e) => (
            <div className="list-item" key={e.id}>
              <h3>
                {e.role} <span>@ {e.company}</span>
              </h3>
              <p>{e.blurb}</p>
            </div>
          ))}
        </section>

        <section>
          <h2>Projects</h2>
          <div className="list-grid">
            {projects.map((p) => (
              <div className="list-card" key={p.id} style={{ '--accent': p.color }}>
                <small>{p.kicker}</small>
                <h3>{p.title}</h3>
                <p>{p.summary}</p>
                <ul>
                  {p.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <div className="stack">
                  {p.stack.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
                <div className="links">
                  {p.link && (
                    <a href={p.link.url} target="_blank" rel="noreferrer">
                      {p.link.label} ↗
                    </a>
                  )}
                  {p.link2 && (
                    <a href={p.link2.url} target="_blank" rel="noreferrer">
                      {p.link2.label} ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Education</h2>
          {education.map((e) => (
            <div className="list-item" key={e.id}>
              <h3>{e.name}</h3>
              <p>{e.detail}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
