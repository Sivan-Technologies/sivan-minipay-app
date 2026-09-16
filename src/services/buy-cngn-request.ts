/** Buy-only transport. Never retries order creation or changes API environments. */
export async function buyCngnRequest(url: string, body?: unknown, claim?: string) {
  let response: Response;
  const readOnly = body === undefined;
  try {
    response = await fetch(url, {
      method: readOnly ? 'GET' : 'POST',
      headers: { Accept: 'application/json', ...(!readOnly ? { 'Content-Type': 'application/json' } : {}), ...(claim ? { 'X-Ramp-Claim': claim } : {}) },
      body: readOnly ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    const raw = await response.text();
    let data: any;
    try { data = JSON.parse(raw); } catch {
      throw Object.assign(new Error('Buy cNGN is temporarily unavailable: the payment service did not return a valid response. Please retry shortly.'), { status: response.status, code: 'buy_service_unavailable' });
    }
    if (!response.ok) throw Object.assign(new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Buy cNGN could not connect to the payment service. Please retry shortly.'), { status: response.status, code: data.error?.code, details: data.error?.details, kyc: data.error?.kyc, providerError: data.error });
    return data;
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'TimeoutError' || name === 'AbortError' || error instanceof TypeError) {
      throw new Error(readOnly
        ? 'The Buy cNGN payment service is taking too long to respond. Please retry shortly.'
        : 'The payment service did not respond. If you started a purchase, recover that purchase before retrying. Do not make another payment.');
    }
    throw error;
  }
}
