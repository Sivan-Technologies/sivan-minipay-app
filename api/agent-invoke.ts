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
    const backendUrl = `${PAYMENT_BACKEND_URL}/api/v1/agent/invoke${url.search}`;

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
  } catch {
    return new Response(
      JSON.stringify({
        status: 'active',
        agent: {
          name: 'Sivan AI',
          agentId: 9827,
          network: 'celo',
          chainId: 42220,
          walletAddress: '0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc',
          attributionTag: 'celo_bafcc2e56bd7',
          registryUrl: 'https://8004scan.io/agents/celo/9827',
        },
        supportedMethods: ['POST', 'GET'],
        capabilities: [
          'sivan_create_payment_link',
          'sivan_initiate_service_agreement',
          'sivan_verify_milestone_and_release',
          'sivan_resolve_bank_account',
          'sivan_fiat_bank_cashout',
          'sivan_get_balance',
        ],
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
