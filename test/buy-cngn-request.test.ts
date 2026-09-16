import assert from 'node:assert/strict';
import { buyCngnRequest } from '../src/services/buy-cngn-request.ts';

const original = globalThis.fetch;
const url = 'https://buy-test.invalid/providers';
let calls = 0;
try {
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal((init?.headers as Record<string, string>)['Content-Type'], undefined);
    return new Response('<html>Gateway time-out</html>', { status: 504 });
  };
  await assert.rejects(buyCngnRequest(url), error => (error as any).status === 504 && /temporarily unavailable/.test((error as Error).message));
  assert.equal(calls, 1);
  globalThis.fetch = async () => { calls++; throw new DOMException('signal timed out', 'TimeoutError'); };
  await assert.rejects(buyCngnRequest(url), /taking too long/);
  const before = calls;
  await assert.rejects(buyCngnRequest(url, { amount: '1000' }), /recover that purchase/);
  assert.equal(calls, before + 1, 'POST must never automatically retry');
  globalThis.fetch = async () => new Response(JSON.stringify({ providers: [] }));
  assert.deepEqual(await buyCngnRequest(url), { providers: [] });
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'kyc_required', message: 'Verification needed', kyc: { state: 'pending' } } }), { status: 422 });
  await assert.rejects(buyCngnRequest(url, {}), error => (error as any).code === 'kyc_required' && (error as any).kyc.state === 'pending');
  console.log('Passed: HTML gateway errors, readable timeout, no order retry, empty availability, provider error preservation.');
} finally { globalThis.fetch = original; }
