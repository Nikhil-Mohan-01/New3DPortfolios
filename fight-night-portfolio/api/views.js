// Visit counter — Vercel serverless function backed by Upstash Redis (REST API, no SDK).
//
//   GET  /api/views  → { total, country }            read only
//   POST /api/views  → { total, country }            count this visit
//
// `country` is the ISO code of the visitor *before* this one, so a new visitor
// sees where the last person came from (not their own country).
// Needs KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/_TOKEN),
// which Vercel adds automatically when you connect an Upstash Redis store.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = 'fight';

async function redis(commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()).map((r) => r.result);
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function GET() {
  if (!URL_ || !TOKEN) return json({ error: 'not configured' }, 503);
  try {
    const [total, country] = await redis([['MGET', `${PREFIX}:views`, `${PREFIX}:last-country`]]).then((r) => r[0]);
    return json({ total: Number(total) || 0, country: country || null });
  } catch {
    return json({ error: 'unavailable' }, 502);
  }
}

export async function POST(request) {
  if (!URL_ || !TOKEN) return json({ error: 'not configured' }, 503);
  const raw = request.headers.get('x-vercel-ip-country') || '';
  const here = /^[A-Z]{2}$/.test(raw) ? raw : 'XX';
  try {
    const [total, prev] = await redis([
      ['INCR', `${PREFIX}:views`],
      ['SET', `${PREFIX}:last-country`, here, 'GET'],
    ]);
    return json({ total: Number(total) || 0, country: prev || here });
  } catch {
    return json({ error: 'unavailable' }, 502);
  }
}
