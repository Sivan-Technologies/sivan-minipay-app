export const config = {
  runtime: 'edge',
};

const PAYMENT_BACKEND_URL = 'https://payment.sivantech.online';

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-idempotency-key',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const backendUrl = `${PAYMENT_BACKEND_URL}/api/v1/developer/transfers${url.search}`;

    const headers: Record<string, string> = {
      'Accept': req.headers.get('Accept') || 'application/json',
      'Content-Type': req.headers.get('Content-Type') || 'application/json',
    };

    if (req.headers.get('authorization')) {
      headers['authorization'] = req.headers.get('authorization')!;
    }
    if (req.headers.get('x-api-key')) {
      headers['x-api-key'] = req.headers.get('x-api-key')!;
    }
    if (req.headers.get('x-idempotency-key')) {
      headers['x-idempotency-key'] = req.headers.get('x-idempotency-key')!;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method === 'POST') {
      fetchOptions.body = await req.text();
    }

    const response = await fetch(backendUrl, fetchOptions);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'Failed to communicate with Sivan Multi-Chain Settlement Gateway',
        message: err.message,
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
