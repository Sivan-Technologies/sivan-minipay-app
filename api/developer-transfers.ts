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
        ...(req.headers['x-idempotency-key'] ? { 'x-idempotency-key': req.headers['x-idempotency-key'] as string } : {}),
      },
    };

    if (req.method === 'POST') {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/developer/transfers`, fetchOptions);
    const data = await response.json().catch(() => ({}));
    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(502).json({
      error: 'Failed to communicate with Sivan Multi-Chain Settlement Gateway',
      message: err.message,
    });
  }
}
