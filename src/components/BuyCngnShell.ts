/** Render the Buy page synchronously; provider availability never controls its layout. */
export function createBuyCngnShell(container: HTMLElement, network: string, wallet?: string | null) {
  container.innerHTML = `
    <section aria-label="Buy cNGN with naira" style="display:grid;gap:18px;min-width:0;padding:8px 0 24px">
      <header><h3 style="margin:0 0 8px">Buy cNGN with naira</h3>
        <p style="margin:0;color:var(--text-secondary,#a6adbb);line-height:1.5">Pay by bank transfer. Receive cNGN in your connected wallet after payment is confirmed.</p>
      </header>
      <div style="display:grid;gap:12px;padding:16px;border:1px solid var(--border-color,#26303c);border-radius:16px;background:var(--bg-secondary,#101823);min-width:0">
        <div style="display:flex;justify-content:space-between;gap:12px"><span>Network</span><strong data-buy-network style="text-align:right"></strong></div>
        <div style="display:flex;justify-content:space-between;gap:12px"><span>Receive in</span><strong data-buy-wallet style="text-align:right;overflow-wrap:anywhere"></strong></div>
        <div style="display:flex;justify-content:space-between;gap:12px"><span>Payment method</span><strong>Bank transfer · NGN</strong></div>
      </div>
      <!-- Textile / Busha Compliance Verification Banner -->
      <div data-buy-kyc-banner id="buy-cngn-kyc-banner" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;cursor:pointer;transition:all 0.2s ease;">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">🛡️</span>
          <div>
            <span data-buy-kyc-title style="font-weight:700;color:#60a5fa;font-size:11px;display:block">Identity Verification</span>
            <span data-buy-kyc-desc style="color:var(--text-muted,#8892a4);font-size:11px">Required by Textile compliance before bank transfer instructions</span>
          </div>
        </div>
        <span data-buy-kyc-action style="font-size:11px;color:#60a5fa;font-weight:600">Check Status →</span>
      </div>
      <div data-buy-preview style="display:grid;gap:12px">
        <label style="display:grid;gap:8px">You pay (NGN)
          <input data-buy-amount class="form-input" type="text" inputmode="decimal" placeholder="Enter naira amount" autocomplete="off" style="box-sizing:border-box;width:100%;min-width:0" />
        </label>
        <div style="padding:14px;border:1px solid var(--border-color,#26303c);border-radius:12px">
          <strong>You receive cNGN</strong><p style="margin:6px 0 0;color:var(--text-secondary,#a6adbb);line-height:1.5">The final amount, fees and bank payment instructions will be shown after verification. No purchase is created by entering an amount.</p>
        </div>
      </div>
      <div style="padding:14px;border-radius:12px;background:var(--bg-secondary,#101823);color:var(--text-secondary,#a6adbb);line-height:1.6">
        <strong style="color:var(--text-primary,#fff)">How it works</strong>
        <ol style="margin:8px 0 0;padding-left:20px"><li>Check availability and verify your identity.</li><li>Get payment instructions and review the final amount.</li><li>Pay from your bank and track delivery.</li></ol>
      </div>
      <div data-buy-flow style="display:grid;gap:12px;min-width:0">
        <p role="status" aria-live="polite" style="margin:0;line-height:1.5;overflow-wrap:anywhere">Checking availability…</p>
      </div>
    </section>`;
  container.querySelector('[data-buy-network]')!.textContent = network;
  container.querySelector('[data-buy-wallet]')!.textContent = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : 'Connect your wallet';
  return {
    flow: container.querySelector<HTMLElement>('[data-buy-flow]')!,
    status: container.querySelector<HTMLParagraphElement>('[role="status"]')!,
    preview: container.querySelector<HTMLElement>('[data-buy-preview]')!,
    amount: container.querySelector<HTMLInputElement>('[data-buy-amount]')!,
    kycBanner: container.querySelector<HTMLElement>('[data-buy-kyc-banner]')!,
  };
}
