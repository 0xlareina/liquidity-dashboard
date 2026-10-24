// Vercel serverless: FRED observations proxy.
// Prefer FRED_API_KEY env on Vercel; falls back to legacy key already exposed in prior commits
// so production keeps working until the env is set / key rotated.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const id = (req.query.id || '').toString().trim().toUpperCase();
  const limit = Math.min(parseInt(req.query.limit || '60', 10) || 60, 500);
  const apiKey = process.env.FRED_API_KEY || '260f54bb6baa12ea0f89ce6788cd9573';

  if (!/^[A-Z0-9_]+$/.test(id)) {
    res.status(400).json({ error: 'invalid series id' });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    // Request newest observations then reverse for charts
    const wide =
      'https://api.stlouisfed.org/fred/series/observations' +
      `?series_id=${encodeURIComponent(id)}` +
      `&api_key=${encodeURIComponent(apiKey)}` +
      `&file_type=json&sort_order=desc&limit=${limit}`;

    const r = await fetch(wide, {
      headers: { Accept: 'application/json', 'User-Agent': 'liquidity-dashboard/1.1' },
      signal: controller.signal,
    });
    if (!r.ok) {
      res.status(r.status).json({ error: `fred http ${r.status}` });
      return;
    }
    const data = await r.json();
    const raw = (data.observations || [])
      .filter((o) => o && o.value && o.value !== '.')
      .map((o) => ({ date: o.date, value: Number(o.value) }))
      .filter((o) => Number.isFinite(o.value));

    // desc -> chronological for charts
    const observations = raw.slice().reverse();
    const latest = observations.length ? observations[observations.length - 1] : null;

    res.status(200).json({
      id,
      latest,
      observations,
      source: 'api.stlouisfed.org/fred',
      asOf: latest ? latest.date : null,
    });
  } catch (err) {
    const msg = err && err.name === 'AbortError' ? 'fred timeout' : String(err && err.message ? err.message : err);
    res.status(502).json({ error: msg });
  } finally {
    clearTimeout(timer);
  }
}
