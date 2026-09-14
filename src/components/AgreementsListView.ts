import { agreementsService } from '../services/agreements.service';
import type { ServiceAgreement } from '../types/minipay.types';
import { miniPayService } from '../services/minipay.service';
import { openShareModal } from './ShareAgreementModal';

export function renderAgreementsList(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  let filter: 'all' | 'active' | 'released' = 'all';

  const render = () => {
    const allAgreements = agreementsService.getAll();
    const filtered = allAgreements.filter(a => {
      if (filter === 'active') return a.status !== 'released';
      if (filter === 'released') return a.status === 'released';
      return true;
    });

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 16px;">
        <h2 class="section-title">Service Agreements</h2>
        <button class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 12px;" id="btn-new-deal-header">
          + New Deal
        </button>
      </div>

      <!-- Filter Tabs -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button class="btn-secondary filter-btn ${filter === 'all' ? 'active-filter' : ''}" data-filter="all" style="flex: 1; padding: 8px;">
          All (${allAgreements.length})
        </button>
        <button class="btn-secondary filter-btn ${filter === 'active' ? 'active-filter' : ''}" data-filter="active" style="flex: 1; padding: 8px;">
          Active (${allAgreements.filter(a => a.status !== 'released').length})
        </button>
        <button class="btn-secondary filter-btn ${filter === 'released' ? 'active-filter' : ''}" data-filter="released" style="flex: 1; padding: 8px;">
          Released (${allAgreements.filter(a => a.status === 'released').length})
        </button>
      </div>

      <!-- Agreements List -->
      <div class="agreements-container">
        ${filtered.length === 0 ? `
          <div class="empty-agreements-box">
            <div class="empty-agreements-icon">🤝</div>
            <div class="empty-agreements-title">No agreements found</div>
            <div class="empty-agreements-desc">Create a new service agreement to lock milestone funds on Celo.</div>
            <button class="btn-empty-create" id="btn-empty-create-deal">
              + New Deal
            </button>
          </div>
        ` : filtered.map(agr => renderCard(agr)).join('')}
      </div>
    `;

    // Attach listeners
    container.querySelector('#btn-new-deal-header')?.addEventListener('click', () => onNavigate('create'));
    container.querySelector('#btn-empty-create-deal')?.addEventListener('click', () => onNavigate('create'));

    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        filter = (e.currentTarget as HTMLElement).dataset.filter as any;
        render();
      });
    });

    // Mark as delivered
    container.querySelectorAll('.btn-mark-delivered').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const proof = prompt('Enter deliverable link or proof URL:') || 'https://celoscan.io';
        agreementsService.updateStatus(id, 'delivered', proof);
        showToast('📦 Milestone marked as delivered! Client can now inspect & release payment.');
        render();
      });
    });

    // Release payment via wallet cryptographic signature
    container.querySelectorAll('.btn-release-payment').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const btnEl = e.currentTarget as HTMLButtonElement;
        const id = btnEl.dataset.id!;
        const agr = agreementsService.getById(id);
        if (!agr) return;

        btnEl.disabled = true;
        btnEl.textContent = '⏳ Waiting for wallet signature...';

        try {
          // Cryptographically sign the milestone release authorization with the connected wallet
          const signRes = await miniPayService.signReleaseAuthorization({
            agreementId: agr.id,
            contractorAddress: agr.contractorAddress,
            amount: agr.netAmount,
            currency: agr.currency,
          });

          if (!signRes.success || !signRes.signature) {
            showToast(`❌ Release signature cancelled: ${signRes.error || 'User cancelled'}`);
            btnEl.disabled = false;
            btnEl.textContent = '⚡ Release Payment';
            return;
          }

          agreementsService.updateStatus(id, 'released', undefined, signRes.signature);
          showToast(`🎉 Milestone payment signed & authorized by client! Sig: ${signRes.signature.slice(0, 10)}...`);
          render();
        } catch (err: any) {
          console.error('Payment release error:', err);
          showToast(`❌ Error: ${err.message || 'Signing failed'}`);
          btnEl.disabled = false;
          btnEl.textContent = '⚡ Release Payment';
        }
      });
    });

    // Cash out shortcut
    container.querySelectorAll('.btn-cashout-shortcut').forEach(btn => {
      btn.addEventListener('click', () => onNavigate('cashout'));
    });

    // Share agreement shortcut
    container.querySelectorAll('.btn-share-deal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).dataset.id!;
        const agr = agreementsService.getById(id);
        if (agr) {
          openShareModal(agr);
        }
      });
    });
  };

  const renderCard = (agr: ServiceAgreement) => {
    const isReleased = agr.status === 'released';
    const isDelivered = agr.status === 'delivered';
    const formattedAmount = agr.currency === 'cNGN'
      ? `₦${agr.amount.toLocaleString()} cNGN`
      : `${agr.amount} ${agr.currency}`;

    return `
      <div class="agreement-card" style="margin-bottom: 16px;">
        <div class="agreement-header">
          <div>
            <div class="agreement-title">${agr.title}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">ID: ${agr.id}</div>
          </div>
          <span class="agreement-badge badge-${agr.status}">${agr.status.replace('_', ' ')}</span>
        </div>

        <p class="agreement-desc">${agr.description}</p>

        <div style="background: var(--bg-glass); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">Contractor:</span>
            <span style="font-family: monospace; color: var(--text-primary);">${agr.contractorIdentifier}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">Destination Address:</span>
            <span style="font-family: monospace; color: var(--text-secondary); font-size: 11px;">
              ${agr.contractorAddress.startsWith('0x') && agr.contractorAddress.length === 42 ? `${agr.contractorAddress.slice(0, 8)}...${agr.contractorAddress.slice(-6)}` : agr.contractorAddress}
            </span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Settlement Net:</span>
            <span style="font-weight: 700; color: var(--text-emerald);">${formattedAmount}</span>
          </div>
        </div>

        ${agr.deliverableProofUrl ? `
          <div style="font-size: 11px; color: var(--accent-cyan); margin-bottom: 12px; display: flex; align-items: center; gap: 4px;">
            <span>📎 Deliverable:</span>
            <a href="${agr.deliverableProofUrl}" target="_blank" style="color: var(--accent-cyan); text-decoration: underline;">
              View Proof Link
            </a>
          </div>
        ` : ''}

        ${agr.fundingTxHash ? `
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 4px;">
            <span>🔒 Funding Tx:</span>
            <a href="https://celoscan.io/tx/${agr.fundingTxHash}" target="_blank" style="color: var(--accent-cyan); font-family: monospace; text-decoration: underline;">
              ${agr.fundingTxHash.slice(0, 12)}... ↗
            </a>
          </div>
        ` : ''}

        ${isReleased ? `
          <div style="display: flex; gap: 8px; align-items: center;">
            <div style="flex: 1; font-size: 11px; color: var(--text-muted);">
              ✅ Settled on Celo Mainnet<br/>
              ${agr.releaseTxHash ? (agr.releaseTxHash.length === 66 ? `
                <a href="https://celoscan.io/tx/${agr.releaseTxHash}" target="_blank" style="font-size: 10px; color: var(--accent-cyan); font-family: monospace; text-decoration: underline;">
                  Tx: ${agr.releaseTxHash.slice(0, 14)}... ↗
                </a>
              ` : `
                <span style="font-size: 10px; color: var(--accent-cyan); font-family: monospace;" title="${agr.releaseTxHash}">
                  Sig: ${agr.releaseTxHash.slice(0, 14)}...
                </span>
              `) : ''}
            </div>
            <button class="btn-secondary btn-cashout-shortcut" style="width: auto; padding: 8px 12px; font-size: 12px;">
              Cash Out 🏦
            </button>
          </div>
        ` : `
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn-secondary btn-share-deal" data-id="${agr.id}" style="width: auto; padding: 10px 14px; font-size: 12px;" title="Share agreement link">
              <span>🔗 Share</span>
            </button>
            ${isDelivered ? `
              <button class="btn-primary btn-release-payment" data-id="${agr.id}" style="flex: 1; font-size: 13px; padding: 12px;">
                <span>⚡ Release ${formattedAmount} (Attributed)</span>
              </button>
            ` : `
              <button class="btn-secondary btn-mark-delivered" data-id="${agr.id}" style="flex: 1; font-size: 12px; padding: 10px;">
                <span>📤 Mark Deliverable Ready</span>
              </button>
            `}
          </div>
        `}
      </div>
    `;
  };

  render();
}
