import { useEffect, useState } from 'react';

// Bottom-right ticker that alternates between total views and where the last visitor was from.
// Counts one view per browser session; later loads in the same session only read.
const SESSION_KEY = 'nm-drive-viewed';

const flag = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));
function countryName(cc) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(cc) || cc;
  } catch {
    return cc;
  }
}

// one request per page load (StrictMode runs effects twice in dev)
let request = null;
function fetchViews() {
  if (request) return request;
  let counted = false;
  try {
    counted = sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    /* storage blocked */
  }
  request = fetch('/api/views', { method: counted ? 'GET' : 'POST' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d) => {
      if (typeof d.total !== 'number') return null;
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        /* ignore */
      }
      return d;
    })
    .catch(() => null); // no backend → no widget
  return request;
}

export default function ViewCounter() {
  const [data, setData] = useState(null);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchViews().then((d) => alive && d && setData(d));
    return () => {
      alive = false;
    };
  }, []);

  const hasCountry = data?.country && /^[A-Z]{2}$/.test(data.country) && data.country !== 'XX';
  useEffect(() => {
    if (!hasCountry) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % 2), 4000);
    return () => clearInterval(id);
  }, [hasCountry]);

  if (!data) return null;
  const show = hasCountry ? slide : 0;

  return (
    <div className="view-counter" aria-live="polite">
      <span className="vc-dot" />
      <div className="vc-track" style={{ transform: `translateY(${-show * 50}%)` }}>
        <div className="vc-slide">
          <b>{data.total.toLocaleString()}</b> total views
        </div>
        <div className="vc-slide">
          {hasCountry && (
            <>
              Last visitor from{' '}
              <b>
                {flag(data.country)} {countryName(data.country)}
              </b>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
