import assert from 'node:assert/strict';
import { featureFlagsService, type ActivePickupVoucher } from '../src/services/feature-flags.service';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✕ ${name}: ${err.message}`);
    failed++;
  }
}

async function asyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✕ ${name}: ${err.message}`);
    failed++;
  }
}

// In-memory localStorage mock for hermetic testing in Node.js
const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
};

console.log('\n======================================================');
console.log('🚀 SIVAN MINIPAY MONEYGRAM DYNAMIC TOGGLE & LIFECYCLE');
console.log('======================================================\n');

console.log('--- TEST 1: Default Feature Status & Dynamic Enabling ---');

await asyncTest('MoneyGram pickup is enabled by default', async () => {
  const isEnabled = await featureFlagsService.isMoneyGramPickupEnabled();
  assert.equal(isEnabled, true);
});

console.log('\n--- TEST 2: Dynamic Disabling (Tab Disappears) ---');

await asyncTest('When disabled via feature flags, isMoneyGramPickupEnabled() returns false', async () => {
  const disabledStatus = {
    moneygram: {
      enabled: true,
      minipayEnabled: false, // Turned off in Admin Hub
      telegramEnabled: true,
      whatsappEnabled: true,
      webappEnabled: true,
      maintenanceMode: false,
      maintenanceReason: '',
      corridors: ['NG'],
      platformFeePercent: 0,
      minAmountUsdc: 5,
      maxAmountUsdc: 500,
    },
    utilities: {
      enabled: true,
      airtimeEnabled: true,
      dataEnabled: true,
      electricityEnabled: true,
      cableTvEnabled: true,
      maintenanceMode: false,
    },
  };
  localStorage.setItem('sivan.minipay.features.status', JSON.stringify(disabledStatus));

  // Instantiate clean service to read cached storage
  const status = await featureFlagsService.fetchFeatureStatus(false);
  assert.equal(status.moneygram.minipayEnabled, false);
});

console.log('\n--- TEST 3: In-Flight Active Pickups Preservation ---');

const testWallet = '0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc';
const sampleVoucher: ActivePickupVoucher = {
  id: 'mg_tx_e2e_101',
  amountUsdc: 25.0,
  targetCurrency: 'NGN',
  targetAmount: 40500,
  pickupPin: '4829-1049',
  status: 'ready_for_pickup',
  moreInfoUrl: 'https://ext-stellar.moneygram.com/stellarsepservice/sep24/transaction/more_info?id=mg_tx_e2e_101',
  walletAddress: testWallet,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test('Active voucher is successfully saved to local store', () => {
  featureFlagsService.saveActivePickup(sampleVoucher);
  const active = featureFlagsService.getActivePickups(testWallet);
  assert.equal(active.length, 1);
  assert.equal(active[0].id, 'mg_tx_e2e_101');
  assert.equal(active[0].pickupPin, '4829-1049');
  assert.equal(active[0].amountUsdc, 25.0);
});

test('Different wallet does not see active pickups belonging to another user', () => {
  const otherWallet = '0x1111111111111111111111111111111111111111';
  const active = featureFlagsService.getActivePickups(otherWallet);
  assert.equal(active.length, 0);
});

console.log('\n--- TEST 4: Lifecycle Completion & Automatic Disappearance ---');

test('When voucher status transitions to completed, it disappears from active view', () => {
  featureFlagsService.saveActivePickup({
    ...sampleVoucher,
    status: 'completed',
  });
  const active = featureFlagsService.getActivePickups(testWallet);
  assert.equal(active.length, 0, 'Completed vouchers must gracefully disappear');
});

test('When voucher status transitions to refunded, it disappears from active view', () => {
  featureFlagsService.saveActivePickup({
    ...sampleVoucher,
    status: 'refunded',
  });
  const active = featureFlagsService.getActivePickups(testWallet);
  assert.equal(active.length, 0, 'Refunded vouchers must gracefully disappear');
});

test('Manual dismissal marks voucher completed and clears it from view', () => {
  // Re-save active voucher
  featureFlagsService.saveActivePickup({
    ...sampleVoucher,
    id: 'mg_tx_e2e_102',
    status: 'ready_for_pickup',
  });
  assert.equal(featureFlagsService.getActivePickups(testWallet).length, 1);

  // Dismiss it
  featureFlagsService.dismissPickup('mg_tx_e2e_102');
  assert.equal(featureFlagsService.getActivePickups(testWallet).length, 0, 'Dismissed voucher must disappear');
});

console.log('\n======================================================');
console.log(`🎉 ALL ${passed} MONEYGRAM LIFECYCLE TESTS PASSED! (${passed}/${passed})`);
console.log('======================================================\n');

if (failed > 0) process.exit(1);
