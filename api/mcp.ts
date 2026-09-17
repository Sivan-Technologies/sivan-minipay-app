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

    const response = await fetch(`${BACKEND_URL}/mcp`, fetchOptions);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const text = await response.text();
      return res.status(200).send(text);
    }

    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch {
    return res.status(200).json({
      jsonrpc: '2.0',
      result: {
        serverInfo: {
          name: 'sivan-mcp-server',
          version: '1.0.0',
          description: 'Sivan Payment AI Autonomous Multi-Chain Settlement MCP Server',
          attributionTag: 'celo_bafcc2e56bd7',
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
    });
  }
}
