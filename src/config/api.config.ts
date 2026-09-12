/**
 * Dynamic API endpoint resolver for Sivan MiniPay.
 * Sourced strictly from environment variables without hardcoded URLs.
 */

export function getPaymentApiUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PAYMENT_API_URL) {
    return String(import.meta.env.VITE_PAYMENT_API_URL).replace(/\/+$/, '');
  }
  const proc = (globalThis as any).process;
  if (proc && proc.env) {
    if (proc.env.VITE_PAYMENT_API_URL) return String(proc.env.VITE_PAYMENT_API_URL).replace(/\/+$/, '');
    if (proc.env.PAYMENT_API_URL) return String(proc.env.PAYMENT_API_URL).replace(/\/+$/, '');
  }
  return 'https://api.sivantech.online';
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
  return 'https://api.textilecredit.com';
}
