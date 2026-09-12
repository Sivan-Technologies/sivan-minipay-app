export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-sivan-target-service',
      },
    });
  }

  const url = new URL(req.url);
  let amountStr = url.searchParams.get('amount') || '';
  let token = url.searchParams.get('asset') || url.searchParams.get('token') || 'usdc';
  let network = url.searchParams.get('network') || 'celo';
  let destinationAddress = url.searchParams.get('destinationAddress') || '';

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (body.amount !== undefined) amountStr = String(body.amount);
      if (body.token) token = String(body.token);
      if (body.asset) token = String(body.asset);
      if (body.network) network = String(body.network);
      if (body.destinationAddress) destinationAddress = String(body.destinationAddress);
    } catch {
      // fallback to query params
    }
  }

  const parsedAmount = parseFloat(amountStr) || 0;

  // Backend API URL dynamically sourced from environment variables with safe resolver
  const apiBase = (
    process.env.PAYMENT_API_URL ||
    process.env.VITE_PAYMENT_API_URL ||
    'https://api.sivantech.online'
  ).replace(/\/+$/, '');

  try {
    const upstreamUrl = new URL(`${apiBase}/api/balance/transfers/quote`);
    upstreamUrl.searchParams.set('amount', String(parsedAmount));
    upstreamUrl.searchParams.set('network', network);
    upstreamUrl.searchParams.set('asset', token.toLowerCase());
    if (destinationAddress) {
      upstreamUrl.searchParams.set('destinationAddress', destinationAddress);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const liveRes = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'x-sivan-target-service': 'payments',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (liveRes.ok) {
      const liveData = await liveRes.json();
      return new Response(JSON.stringify({
        success: true,
        source: 'live_payment_api',
        data: liveData.data,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=15',
        },
      });
    }

    const errText = await liveRes.text();
    return new Response(JSON.stringify({
      success: false,
      error: `Sivan Payment API returned status ${liveRes.status}: ${errText}`,
    }), {
      status: liveRes.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: `Failed to connect to Sivan Payment API: ${err?.message || 'Network error'}`,
    }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
