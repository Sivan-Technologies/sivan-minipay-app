import assert from 'node:assert/strict';
import { createBuyCngnShell } from '../src/components/BuyCngnShell.ts';

// The shell must render synchronously without any provider or recovery request.
let html = '';
const nodes = new Map<string, { textContent: string }>();
const container = {
  set innerHTML(value: string) { html = value; },
  querySelector(selector: string) {
    if (!nodes.has(selector)) nodes.set(selector, { textContent: '' });
    return nodes.get(selector);
  },
} as unknown as HTMLElement;
const original = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Page shell must not fetch'); };
try {
  const shell = createBuyCngnShell(container, 'Celo Sepolia Testnet', '0x1234567890abcdef');
  assert(html.includes('data-buy-amount'));
  assert(html.includes('How it works'));
  assert(html.includes('Payment method'));
  assert(html.includes('data-buy-flow'));
  assert.equal(nodes.get('[data-buy-network]')?.textContent, 'Celo Sepolia Testnet');
  assert.equal(nodes.get('[data-buy-wallet]')?.textContent, '0x1234…cdef');
  assert(shell.flow && shell.status && shell.amount && shell.preview);
  createBuyCngnShell(container, '<unsafe-network>', null);
  assert(!html.includes('<unsafe-network>'), 'dynamic labels are not interpolated into HTML');
  assert.equal(nodes.get('[data-buy-wallet]')?.textContent, 'Connect your wallet');
  console.log('Passed: synchronous Buy shell, amount/steps/network visible, no fetch, safe dynamic text.');
} finally { globalThis.fetch = original; }
