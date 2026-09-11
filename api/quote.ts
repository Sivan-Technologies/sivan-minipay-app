export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || 'USDT').toUpperCase();
  const amount = parseFloat(url.searchParams.get('amount') || '10');

  // cNGN is strict 1:1 parity with Nigerian Naira
  if (token === 'cNGN') {
    return new Response(
      JSON.stringify({
        token: 'cNGN',
        rate: 1.0,
        source: 'cngn_consortium_parity',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  }

  // 1. Primary: Textile Credit RFQ API
  const textileBase = process.env.TEXTILE_CREDIT_API_URL || 'https://api.textilecredit.com/v2';
  const textileKey = process.env.TEXTILE_CREDIT_API_KEY || '';

  if (textileKey) {
    try {
      const textileRes = await fetch(
        `${textileBase}/rates?pair=USDC_NGN&amount=${amount > 0 ? amount : 10}`,
        {
          headers: {
            'Authorization': `Bearer ${textileKey}`,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(4000),
        }
      );

      if (textileRes.ok) {
        const data = await textileRes.json();
        if (data && typeof data.rate === 'number' && data.rate > 0) {
          return new Response(
            JSON.stringify({
              token,
              rate: data.rate,
              spreadBps: data.spreadBps || 0,
              source: 'textile_credit_rfq_live',
              timestamp: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=30',
              },
            }
          );
        }
      }
    } catch (err) {
      console.warn('Textile Credit live rate unavailable, checking secondary live oracle:', err);
    }
  }

  // 2. Secondary: Real-Time CoinGecko Crypto FX Oracle
  try {
    const cgRes = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tether,usd-coin&vs_currencies=ngn',
      { signal: AbortSignal.timeout(3500) }
    );

    if (cgRes.ok) {
      const data = await cgRes.json();
      const liveRate = token === 'USDT' 
        ? data.tether?.ngn 
        : (data['usd-coin']?.ngn || data.tether?.ngn);

      if (liveRate && typeof liveRate === 'number' && liveRate > 0) {
        return new Response(
          JSON.stringify({
            token,
            rate: liveRate,
            source: 'live_crypto_fx_oracle',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=30',
            },
          }
        );
      }
    }
  } catch (err) {
    console.warn('Secondary crypto oracle unavailable:', err);
  }

  // 3. Calibrated Fallback
  return new Response(
    JSON.stringify({
      token,
      rate: 1326.4,
      source: 'calibrated_market_rate',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=15',
      },
    }
  );
}
