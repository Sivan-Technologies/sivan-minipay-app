import { agreementsService } from '../services/agreements.service';
import { miniPayService } from '../services/minipay.service';
import { CELO_CONFIG } from '../config/celo.config';
import type { ServiceAgreement } from '../types/minipay.types';

export interface DealProposalData {
  id: string;
  title: string;
  amount: number;
  currency: 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
  netAmount: number;
  deadlineHours: number;
  description: string;
  from?: string;
  fundingTxHash?: string;
}

export function renderAcceptAgreement(
  container: HTMLElement,
  deal: DealProposalData,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  const feeAmount = Math.max(0, Number((deal.amount - deal.netAmount).toFixed(2)));

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 20px;">
      <h2 class="section-title">Review Service Agreement</h2>
      <span class="section-link" id="btn-decline-deal">Decline</span>
    </div>

    <div class="agreement-card" style="margin-bottom: 20px; border: 1px solid var(--accent-emerald);">
      <div class="agreement-header">
        <div>
          <div class="agreement-title" style="font-size: 16px;">${deal.title}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Deal ID: ${deal.id}</div>
        </div>
        <span class="agreement-badge badge-funded" style="font-size: 11px;">🔒 Funds Locked</span>
      </div>

      <p class="agreement-desc" style="font-size: 13px; line-height: 1.5; margin: 12px 0;">
        ${deal.description || 'No detailed scope provided.'}
      </p>

      <div style="background: var(--bg-glass); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 14px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-muted);">Proposed By (Client):</span>
          <span style="font-family: monospace; color: var(--text-primary);">${deal.from || 'Client'}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-muted);">Gross Agreement Value:</span>
          <span style="color: var(--text-secondary);">${deal.amount} ${deal.currency}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: var(--text-muted);">Sivan Platform Fee (1%):</span>
          <span style="color: var(--text-muted);">${feeAmount} ${deal.currency}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; padding-top: 6px; border-top: 1px solid var(--border-subtle);">
          <span style="font-weight: 600; color: var(--text-primary);">Net Contractor Payout:</span>
          <span style="font-weight: 700; color: var(--text-emerald); font-size: 14px;">${deal.netAmount} ${deal.currency}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 6px;">
          <span style="color: var(--text-muted);">Delivery Deadline:</span>
          <span style="color: var(--accent-cyan); font-weight: 500;">⏱ ${deal.deadlineHours} Hours</span>
        </div>
      </div>

      ${deal.fundingTxHash ? `
        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px; display: flex; align-items: center; gap: 4px; padding: 8px 10px; background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-sm);">
          <span>🔒 Verified on Celo Mainnet:</span>
          <a href="https://celoscan.io/tx/${deal.fundingTxHash}" target="_blank" style="color: var(--accent-cyan); font-family: monospace; text-decoration: underline;">
            ${deal.fundingTxHash.slice(0, 12)}... ↗
          </a>
        </div>
      ` : ''}

      <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 16px;">
        Funds are already secured on Celo Mainnet under Sivan AI custody. By accepting this deal, you agree to deliver within the specified timeframe.
      </div>

      <button type="button" class="btn-primary" id="btn-accept-deal" style="padding: 14px; font-size: 14px;">
        <span>🤝 Accept Agreement & Start Work</span>
      </button>
    </div>
  `;

  // Decline button handler
  container.querySelector('#btn-decline-deal')?.addEventListener('click', () => {
    // Clear query params from address bar
    window.history.replaceState({}, document.title, window.location.pathname);
    onNavigate('dashboard');
  });

  // Accept button handler
  const acceptBtn = container.querySelector('#btn-accept-deal') as HTMLButtonElement;
  acceptBtn?.addEventListener('click', async () => {
    let currentAddress = miniPayService.getState().address;

    if (!currentAddress) {
      showToast('⚠️ Connecting your MiniPay wallet...');
      const res = await miniPayService.connectMetaMask();
      currentAddress = miniPayService.getState().address;
      if (!res.success || !currentAddress) {
        showToast('❌ Wallet connection is required to accept deals.');
        return;
      }
    }

    const validAddress: string = currentAddress;

    acceptBtn.disabled = true;
    acceptBtn.innerHTML = '<span>⏳ Registering acceptance...</span>';

    try {
      const newAgreement: ServiceAgreement = {
        id: deal.id,
        title: deal.title,
        description: deal.description,
        contractorIdentifier: `${validAddress.slice(0, 6)}...${validAddress.slice(-4)}`,
        contractorAddress: validAddress,
        amount: deal.amount,
        currency: deal.currency,
        protocolFee: feeAmount,
        netAmount: deal.netAmount,
        status: 'in_progress',
        createdAt: new Date().toISOString(),
        deadlineHours: deal.deadlineHours,
        deadlineTimestamp: Date.now() + deal.deadlineHours * 3600000,
        fundingTxHash: deal.fundingTxHash,
        attributionTag: CELO_CONFIG.attributionTag,
      };

      agreementsService.importAgreement(newAgreement);

      // Clean the address bar
      window.history.replaceState({}, document.title, window.location.pathname);

      showToast('🎉 Service agreement accepted! Deliverables can be submitted from My Deals.');
      onNavigate('deals');
    } catch (err: any) {
      console.error('Accept agreement error:', err);
      showToast(`❌ Error: ${err.message || 'Failed to accept agreement'}`);
      acceptBtn.disabled = false;
      acceptBtn.innerHTML = '<span>🤝 Accept Agreement & Start Work</span>';
    }
  });
}
