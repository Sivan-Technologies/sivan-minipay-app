import assert from 'node:assert/strict';
import { BuyViewSession } from '../src/services/buy-view-session.ts';

// No browser wallet, provider, network or money movement is involved.
const originalSet = globalThis.setTimeout;
const originalClear = globalThis.clearTimeout;
const timers = new Map<number, () => void>();
let next = 0;
globalThis.setTimeout = ((fn: () => void) => { timers.set(++next, fn); return next; }) as unknown as typeof setTimeout;
globalThis.clearTimeout = ((id: number) => { timers.delete(id); }) as unknown as typeof clearTimeout;
try {
  let active = true;
  let owner = 'wallet-a:42220';
  const session = new BuyViewSession(() => active, () => owner);
  const errors: unknown[] = [];
  let calls = 0;
  const poll = async () => { calls++; };
  session.poll(poll, 10000, error => errors.push(error));
  session.poll(poll, 10000, error => errors.push(error));
  assert.equal(timers.size, 1, 'rescheduling replaces timer');
  let release!: () => void;
  const running = session.run(async () => { calls++; await new Promise<void>(resolve => { release = resolve; }); }, error => errors.push(error));
  assert.equal(timers.size, 0, 'manual refresh cancels pending poll');
  await session.run(poll, error => errors.push(error));
  assert.equal(calls, 1, 'parallel refresh suppressed');
  owner = 'wallet-b:42220';
  release(); await running;
  assert.equal(errors.length, 1, 'wallet switch during await rejected');
  assert.throws(() => session.check(), /Wallet or network changed/);
  owner = 'wallet-a:11142220';
  assert.throws(() => session.check(), /Wallet or network changed/);
  owner = 'wallet-a:42220';
  session.poll(poll, 10000, error => errors.push(error));
  active = false;
  const callback = [...timers.values()][0]; timers.clear(); callback();
  assert.equal(calls, 1, 'detached view does not poll');
  assert.throws(() => session.check(), /no longer active/);
  console.log('Passed: single polling timer, serialized refresh, wallet/network changes, inactive view.');
} finally {
  globalThis.setTimeout = originalSet;
  globalThis.clearTimeout = originalClear;
}
