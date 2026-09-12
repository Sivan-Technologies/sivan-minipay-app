export const config = {
  runtime: 'edge',
};

/**
 * Celo network transfer fee config.
 * 0.5% with $0.10 minimum floor and $0.75 maximum ceiling.
 */
function calculateCeloTransferFee(amount: number) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const percent = 0.5;
  const floor = 0.10;
  const ceiling = 0.75;

  const raw = safeAmount * (percent / 100);
  let fee = raw;
  let appliedRule: 'percent' | 'minimum' | 'maximum' = 'percent';

  if (floor > 0 && fee < floor) {
    fee = floor;
    appliedRule = 'minimum';
  }
  if (ceiling > 0 && fee > ceiling) {
    fee = ceiling;
    appliedRule = 'maximum';
  }
  if (fee > safeAmount) {
    fee = safeAmount;
    appliedRule = 'maximum';
  }

  const netAmount = Math.max(0, safeAmount - fee);
  const effectivePercent = safeAmount > 0 ? ((fee / safeAmount) * 100).toFixed(2) : '0.00';

  const explanation = appliedRule === 'minimum'
    ? 'Minimum fee of $0.10 applied'
    : appliedRule === 'maximum'
      ? 'Capped at maximum fee of $0.75'
      : '0.5% of the amount sent';

  return {
    amount: safeAmount.toString(),
    fee: fee.toFixed(2),
    baseFee: fee.toFixed(2),
    newRecipientFee: '0',
    createsRecipientAccount: false,
    netAmount: netAmount.toFixed(2),
    effectivePercent,
    appliedRule,
    explanation,
  };
}

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

  // 1. Try querying the live Sivan Payments backend
  try {
    const upstreamUrl = new URL('https://api.sivantech.online/api/balance/transfers/quote');
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
      if (liveData?.data?.fee !== undefined) {
        return new Response(JSON.stringify({ success: true, source: 'live_api', data: liveData.data }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=15',
          },
        });
      }
    }
  } catch {
    // Upstream unreachable or timed out - fall through to canonical policy formula
  }

  // 2. Canonical Sivan transfer fee policy calculation
  const calculated = calculateCeloTransferFee(parsedAmount);
  return new Response(JSON.stringify({ success: true, source: 'canonical_policy', data: calculated }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=15',
    },
  });
}
