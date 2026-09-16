/**
 * Dynamic API endpoint resolver for Sivan MiniPay.
 * Sourced strictly from environment variables without hardcoded URLs.
 */

export function getPaymentApiUrl(): string {
  let raw = '';
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYMENT_API_URL) {
    raw = String(import.meta.env.VITE_PAYMENT_API_URL).trim();
  } else {
    const proc = (globalThis as any).process;
    if (proc && proc.env) {
      raw = String(proc.env.VITE_PAYMENT_API_URL || proc.env.PAYMENT_API_URL || '').trim();
    }
  }

  if (!raw) {
    throw new Error('VITE_PAYMENT_API_URL is required.');
  }

  const cleanUrl = raw.replace(/\/+$/, '');
  try {
    const parsed = new URL(cleanUrl);
    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '');

    // Cloudflare gateway route normalization:
    // When pointing to the gateway root (api.sivantech.online or api-staging.sivantech.online),
    // ensure calls route to the payments microservice (/api/payment) rather than hitting the default root.
    if ((host === 'api.sivantech.online' || host === 'api-staging.sivantech.online') && (path === '' || path === '/')) {
      return `${parsed.origin}/api/payment`;
    }
  } catch {
    // preserve cleanUrl if not valid absolute URL
  }

  return cleanUrl;
}

export function getTextileApiUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEXTILE_API_URL) {
    return String(import.meta.env.VITE_TEXTILE_API_URL).replace(/\/+$/, '');
  }
  const proc = (globalThis as any).process;
  if (proc && proc.env) {
    if (proc.env.VITE_TEXTILE_API_URL) return String(proc.env.VITE_TEXTILE_API_URL).replace(/\/+$/, '');
    if (proc.env.TEXTILE_API_URL) return String(proc.env.TEXTILE_API_URL).replace(/\/+$/, '');
  }
  throw new Error('VITE_TEXTILE_API_URL is required.');
}
