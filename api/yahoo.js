// Vercel serverless: proxy Yahoo Finance chart quotes
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const symbol = (req.query.symbol || '').toString().trim();
  const range = (req.query.range || '1mo').toString();
  const interval = (req.query.interval || '1d').toString();

  if (!symbol || symbol.length > 32 || /[^A-Za-z0-9.^_=/-]/.test(symbol)) {
    res.status(400).json({ error: 'invalid symbol' });
    return;
  }

  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
      `?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; liquidity-dashboard/1.0)',
      },
    });
    if (!r.ok) {
      res.status(r.status).json({ error: `yahoo http ${r.status}` });
      return;
    }
    const data = await r.json();
    const result = data && data.chart && data.chart.result && data.chart.result[0];
    if (!result || !result.meta) {
      res.status(502).json({ error: 'empty yahoo result' });
      return;
    }
    const meta = result.meta;
    const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
    const closes = (quote.close || []).filter((v) => v != null);
    const volumes = quote.volume || [];
    const timestamps = result.timestamp || [];
    const lastVol = [...volumes].reverse().find((v) => v != null) || null;
    res.status(200).json({
      symbol,
      price: meta.regularMarketPrice ?? meta.previousClose ?? (closes.length ? closes[closes.length - 1] : null),
      previousClose: meta.previousClose ?? null,
      currency: meta.currency ?? null,
      volume: lastVol,
      closes: closes.slice(-30),
      timestamps: timestamps.slice(-30),
      source: 'query1.finance.yahoo.com',
    });
  } catch (err) {
    res.status(502).json({ error: String(err && err.message ? err.message : err) });
  }
}
