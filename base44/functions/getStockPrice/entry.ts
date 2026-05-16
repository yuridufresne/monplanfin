import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Fetches current or historical price for a symbol using Yahoo Finance (unofficial API)
async function fetchYahooPrice(symbol, date) {
  const encodedSymbol = encodeURIComponent(symbol);

  if (date) {
    // Historical price: use chart endpoint with 1d interval around the date
    const dateObj = new Date(date);
    const period1 = Math.floor(dateObj.getTime() / 1000);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 5); // window to find a trading day
    const period2 = Math.floor(nextDay.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const json = await res.json();
    const quotes = json?.chart?.result?.[0];
    if (!quotes) return null;
    const closes = quotes.indicators?.quote?.[0]?.close;
    if (!closes || closes.length === 0) return null;
    // Return first non-null close price
    const price = closes.find(p => p != null);
    return price ? Math.round(price * 100) / 100 : null;
  } else {
    // Current price
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta?.regularMarketPrice || meta?.previousClose;
    return price ? Math.round(price * 100) / 100 : null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { symbol, date, symbols } = body;

    // Bulk refresh: array of {id, symbol}
    if (symbols && Array.isArray(symbols)) {
      const results = await Promise.all(
        symbols.map(async ({ id, symbol: sym }) => {
          const price = await fetchYahooPrice(sym);
          return { id, symbol: sym, price };
        })
      );
      return Response.json({ results });
    }

    // Single symbol
    if (!symbol) return Response.json({ error: 'Symbol required' }, { status: 400 });
    const price = await fetchYahooPrice(symbol, date || null);
    return Response.json({ symbol, price, date: date || null });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});