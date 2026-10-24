// Vercel serverless: proxy FRED graph CSV (no API key required)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const id = (req.query.id || '').toString().trim().toUpperCase();
  const limit = Math.min(parseInt(req.query.limit || '60', 10) || 60, 500);

  if (!/^[A-Z0-9_]+$/.test(id)) {
    res.status(400).json({ error: 'invalid series id' });
    return;
  }

  try {
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(id)}`;
    const r = await fetch(url, {
      headers: { Accept: 'text/csv', 'User-Agent': 'liquidity-dashboard/1.0' },
    });
    if (!r.ok) {
      res.status(r.status).json({ error: `fred http ${r.status}` });
      return;
    }
    const text = await r.text();
    const lines = text.trim().split(/\r?\n/).slice(1); // drop header
    const observations = [];
    for (const line of lines) {
      if (!line) continue;
      const comma = line.indexOf(',');
      if (comma < 0) continue;
      const date = line.slice(0, comma).trim();
      const raw = line.slice(comma + 1).trim();
      if (!raw || raw === '.') continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      observations.push({ date, value });
    }
    const sliced = observations.slice(-limit);
    const latest = sliced.length ? sliced[sliced.length - 1] : null;
    res.status(200).json({
      id,
      latest,
      observations: sliced,
      source: 'fred.stlouisfed.org/graph/fredgraph.csv',
      asOf: latest ? latest.date : null,
    });
  } catch (err) {
    res.status(502).json({ error: String(err && err.message ? err.message : err) });
  }
}
