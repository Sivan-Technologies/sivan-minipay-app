export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Fallback high-reliability Nigerian banks list
  const defaultBanks = [
    { code: '999992', name: 'OPay Digital Services' },
    { code: '999991', name: 'PalmPay Limited' },
    { code: '090267', name: 'Kuda Microfinance Bank' },
    { code: '058', name: 'Guaranty Trust Bank' },
    { code: '044', name: 'Access Bank' },
    { code: '057', name: 'Zenith Bank' },
    { code: '033', name: 'United Bank for Africa' },
    { code: '011', name: 'First Bank of Nigeria' },
    { code: '035', name: 'Wema Bank' },
  ];

  try {
    const textileRes = await fetch('https://api.textilecredit.com/v2/ramp/banks?provider=busha', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000),
    });

    if (textileRes.ok) {
      const banks = await textileRes.json();
      if (Array.isArray(banks) && banks.length > 0) {
        return new Response(JSON.stringify(banks), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      }
    }
  } catch (err) {
    console.warn('[Vercel Edge] Textile banks fetch error:', err);
  }

  return new Response(JSON.stringify(defaultBanks), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
