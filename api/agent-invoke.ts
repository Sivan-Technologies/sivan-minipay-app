import type { VercelRequest, VercelResponse } from '@vercel/node';

const BACKEND_URL = 'https://payment.sivantech.online';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-idempotency-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Accept': (req.headers['accept'] as string) || 'application/json',
        'Content-Type': (req.headers['content-type'] as string) || 'application/json',
        ...(req.headers['authorization'] ? { 'authorization': req.headers['authorization'] as string } : {}),
        ...(req.headers['x-api-key'] ? { 'x-api-key': req.headers['x-api-key'] as string } : {}),
      },
    };

    if (req.method === 'POST') {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/agent/invoke`, fetchOptions);
    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch {
    return res.status(200).json({
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
    });
  }
}
