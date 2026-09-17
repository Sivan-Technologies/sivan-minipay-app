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
    const backendUrl = `${PAYMENT_BACKEND_URL}/mcp${url.search}`;

    const headers: Record<string, string> = {
      'Accept': req.headers.get('Accept') || '*/*',
      'Content-Type': req.headers.get('Content-Type') || 'application/json',
    };

    if (req.headers.get('authorization')) {
      headers['authorization'] = req.headers.get('authorization')!;
    }
    if (req.headers.get('x-api-key')) {
      headers['x-api-key'] = req.headers.get('x-api-key')!;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method === 'POST') {
      fetchOptions.body = await req.text();
    }

    const response = await fetch(backendUrl, fetchOptions);

    // Pass back streaming SSE or JSON responses
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    // Fallback: If backend is briefly reconnecting, return MCP info JSON
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        result: {
          serverInfo: {
            name: 'sivan-mcp-server',
            version: '1.0.0',
            description: 'Sivan Payment AI Autonomous Multi-Chain MCP Engine',
          },
          tools: [
            'sivan_create_payment_link',
            'sivan_initiate_service_agreement',
            'sivan_verify_milestone_and_release',
            'sivan_resolve_bank_account',
            'sivan_fiat_bank_cashout',
            'sivan_get_balance',
          ],
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
