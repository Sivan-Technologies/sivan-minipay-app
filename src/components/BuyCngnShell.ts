/** Render the Buy page synchronously; provider availability never controls its layout. */
export function createBuyCngnShell(container: HTMLElement, network: string, wallet?: string | null) {
  container.innerHTML = `
    <section aria-label="Buy cNGN with naira" style="display:grid;gap:16px;min-width:0;padding:6px 0 24px">
      <!-- Header banner -->
      <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.04)); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; padding: 14px 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">⚡</span>
            <span style="font-weight: 700; font-size: 13.5px; color: #fff;">Textile Credit Bank On-Ramp</span>
          </div>
          <span style="font-size: 10.5px; font-weight: 600; color: #34d399; background: rgba(16, 185, 129, 0.15); padding: 3px 8px; border-radius: 20px; border: 1px solid rgba(16, 185, 129, 0.3);">Celo Mainnet</span>
        </div>
        <p style="margin: 0; color: var(--text-secondary, #a6adbb); font-size: 11.5px; line-height: 1.5;">
          Pay via Nigerian bank transfer (NIBSS / NIP). Receive 1:1 cNGN directly in your Celo smart account with zero custodial risk.
        </p>
      </div>

      <!-- Network & Destination Summary -->
      <div style="display: grid; gap: 10px; padding: 14px 16px; border: 1px solid var(--border-color, #26303c); border-radius: 14px; background: var(--bg-secondary, #101823);">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <span style="color: var(--text-muted, #8892a4);">Destination Network</span>
          <strong data-buy-network style="color: #fff; font-weight: 600;"></strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <span style="color: var(--text-muted, #8892a4);">Receive Wallet</span>
          <strong data-buy-wallet style="color: #34d399; font-family: monospace; font-size: 11.5px; overflow-wrap: anywhere;"></strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <span style="color: var(--text-muted, #8892a4);">Payment Method</span>
          <span style="color: #fff; font-weight: 600;">Nigerian Bank Transfer (NGN)</span>
        </div>
      </div>

      <!-- Textile / Busha Compliance Verification Banner -->
      <div data-buy-kyc-banner id="buy-cngn-kyc-banner" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 12px; cursor: pointer; transition: all 0.2s ease;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 18px;">🛡️</span>
          <div>
            <span data-buy-kyc-title style="font-weight: 700; color: #60a5fa; font-size: 12px; display: block;">Identity Verification</span>
            <span data-buy-kyc-desc style="color: var(--text-muted, #8892a4); font-size: 11px;">Checking Textile / Busha compliance status...</span>
          </div>
        </div>
        <span data-buy-kyc-action style="font-size: 11.5px; color: #60a5fa; font-weight: 700; background: rgba(59, 130, 246, 0.15); padding: 4px 10px; border-radius: 8px;">Verify →</span>
      </div>

      <!-- Interactive Purchase Box -->
      <div data-buy-preview style="display: grid; gap: 12px;">
        <div style="display: grid; gap: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary, #a6adbb);">YOU PAY (NAIRA)</label>
            <span style="font-size: 11px; color: #34d399; font-weight: 600;">1 NGN = 1 cNGN (1:1 Parity)</span>
          </div>
          <div style="position: relative; display: flex; align-items: center;">
            <input data-buy-amount class="form-input" type="number" inputmode="decimal" placeholder="10,000" value="10000" autocomplete="off" style="width: 100%; box-sizing: border-box; font-size: 18px; font-weight: 700; padding: 12px 60px 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color, #26303c); color: #fff;" />
            <span style="position: absolute; right: 14px; font-weight: 700; font-size: 13px; color: var(--text-muted, #8892a4);">NGN</span>
          </div>
        </div>

        <!-- Preset Quick Select Buttons -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;">
          <button type="button" class="btn-preset" data-preset="5000" style="flex: 1; padding: 6px 4px; font-size: 11px; font-weight: 600; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color, #26303c); color: var(--text-secondary, #a6adbb); cursor: pointer;">₦5,000</button>
          <button type="button" class="btn-preset" data-preset="10000" style="flex: 1; padding: 6px 4px; font-size: 11px; font-weight: 600; border-radius: 8px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); color: #34d399; cursor: pointer;">₦10,000</button>
          <button type="button" class="btn-preset" data-preset="25000" style="flex: 1; padding: 6px 4px; font-size: 11px; font-weight: 600; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color, #26303c); color: var(--text-secondary, #a6adbb); cursor: pointer;">₦25,000</button>
          <button type="button" class="btn-preset" data-preset="50000" style="flex: 1; padding: 6px 4px; font-size: 11px; font-weight: 600; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color, #26303c); color: var(--text-secondary, #a6adbb); cursor: pointer;">₦50,000</button>
          <button type="button" class="btn-preset" data-preset="100000" style="flex: 1; padding: 6px 4px; font-size: 11px; font-weight: 600; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color, #26303c); color: var(--text-secondary, #a6adbb); cursor: pointer;">₦100k</button>
        </div>

        <!-- Live Parity Breakdown -->
        <div style="padding: 12px 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(0,0,0,0.2); display: grid; gap: 8px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted, #8892a4);">Gross Output:</span>
            <span data-buy-calc-gross style="font-weight: 600; color: #fff;">10,000.00 cNGN</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted, #8892a4);">Sivan On-Ramp Fee:</span>
            <span style="font-weight: 600; color: #34d399;">₦0.00 (0.00% Sivan Promo)</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px;">
            <span style="color: var(--text-secondary, #a6adbb); font-weight: 600;">Net Credited to Celo:</span>
            <span data-buy-calc-net style="font-weight: 700; color: #34d399; font-size: 13px;">10,000.00 cNGN</span>
          </div>
        </div>
      </div>

      <!-- Action & Instructions Flow Container -->
      <div data-buy-flow style="display: grid; gap: 12px; min-width: 0;">
        <p role="status" aria-live="polite" style="margin: 0; line-height: 1.5; font-size: 12.5px; color: var(--text-secondary, #a6adbb); text-align: center;">Checking availability…</p>
      </div>

      <!-- How it works guide -->
      <div style="padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); font-size: 11.5px; color: var(--text-muted, #8892a4); line-height: 1.6;">
        <div style="font-weight: 700; color: var(--text-secondary, #a6adbb); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span>ℹ️</span> How Textile Bank On-Ramp Works
        </div>
        <ol style="margin: 4px 0 0; padding-left: 18px;">
          <li>Verify identity once via Busha / BVN (Level 1).</li>
          <li>Click below to get a dedicated NUBAN transfer account.</li>
          <li>Transfer the exact amount from any Nigerian bank app.</li>
          <li>cNGN is minted and credited automatically to your Celo wallet.</li>
        </ol>
      </div>
    </section>`;

  const networkEl = container.querySelector<HTMLElement>('[data-buy-network]');
  if (networkEl) networkEl.textContent = network;
  const walletEl = container.querySelector<HTMLElement>('[data-buy-wallet]');
  if (walletEl) walletEl.textContent = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Connect your wallet';

  return {
    flow: container.querySelector<HTMLElement>('[data-buy-flow]')!,
    status: container.querySelector<HTMLParagraphElement>('[role="status"]')!,
    preview: container.querySelector<HTMLElement>('[data-buy-preview]')!,
    amount: container.querySelector<HTMLInputElement>('[data-buy-amount]')!,
    kycBanner: container.querySelector<HTMLElement>('[data-buy-kyc-banner]')!,
  };
}
