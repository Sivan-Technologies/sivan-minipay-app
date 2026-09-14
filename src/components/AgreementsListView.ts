import { agreementsService } from '../services/agreements.service';
import type { ServiceAgreement } from '../types/minipay.types';
import { miniPayService } from '../services/minipay.service';
import { openShareModal } from './ShareAgreementModal';
import { getCountdownStatus, formatDeadlineHours } from '../utils/deadline';
import { getNetworkExplorer } from '../utils/explorers';

export function renderAgreementsList(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  let filter: 'all' | 'active' | 'disputed' | 'released' | 'refunded' = 'all';

  const render = () => {
    const allAgreements = agreementsService.getAll();
    const filtered = allAgreements.filter(a => {
      if (filter === 'active') return a.status !== 'released' && a.status !== 'refunded' && a.status !== 'cancelled';
      if (filter === 'disputed') return a.status === 'disputed';
      if (filter === 'released') return a.status === 'released';
      if (filter === 'refunded') return a.status === 'refunded' || a.status === 'cancelled';
      return true;
    });

    const activeCount = allAgreements.filter(a => a.status !== 'released' && a.status !== 'refunded' && a.status !== 'cancelled').length;
    const disputedCount = allAgreements.filter(a => a.status === 'disputed').length;
    const releasedCount = allAgreements.filter(a => a.status === 'released').length;
    const refundedCount = allAgreements.filter(a => a.status === 'refunded' || a.status === 'cancelled').length;

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 16px;">
        <h2 class="section-title">Service Agreements</h2>
        <button class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 12px;" id="btn-new-deal-header">
          + New Deal
        </button>
      </div>

      <!-- Filter Tabs -->
      <div style="display: flex; gap: 6px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px;">
        <button class="btn-secondary filter-btn ${filter === 'all' ? 'active-filter' : ''}" data-filter="all" style="padding: 6px 10px; font-size: 11px; white-space: nowrap;">
          All (${allAgreements.length})
        </button>
        <button class="btn-secondary filter-btn ${filter === 'active' ? 'active-filter' : ''}" data-filter="active" style="padding: 6px 10px; font-size: 11px; white-space: nowrap;">
          Active (${activeCount})
        </button>
        ${disputedCount > 0 ? `
          <button class="btn-secondary filter-btn ${filter === 'disputed' ? 'active-filter' : ''}" data-filter="disputed" style="padding: 6px 10px; font-size: 11px; white-space: nowrap; color: #f87171;">
            Disputed (${disputedCount})
          </button>
        ` : ''}
        <button class="btn-secondary filter-btn ${filter === 'released' ? 'active-filter' : ''}" data-filter="released" style="padding: 6px 10px; font-size: 11px; white-space: nowrap;">
          Settled (${releasedCount})
        </button>
        ${refundedCount > 0 ? `
          <button class="btn-secondary filter-btn ${filter === 'refunded' ? 'active-filter' : ''}" data-filter="refunded" style="padding: 6px 10px; font-size: 11px; white-space: nowrap;">
            Refunded (${refundedCount})
          </button>
        ` : ''}
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

    // Attach navigation listeners
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
        const proof = prompt('Enter deliverable link or proof description:') || 'https://celoscan.io';
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

    // Raise dispute
    container.querySelectorAll('.btn-raise-dispute').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const btnEl = e.currentTarget as HTMLButtonElement;
        const id = btnEl.dataset.id!;
        const agr = agreementsService.getById(id);
        if (!agr) return;

        const reason = prompt('Please describe why deliverables do not meet agreement criteria:');
        if (!reason || !reason.trim()) {
          showToast('⚠️ Dispute filing requires a valid explanation.');
          return;
        }

        btnEl.disabled = true;
        btnEl.textContent = '⏳ Signing dispute...';

        try {
          const signRes = await miniPayService.signDisputeFiling({
            agreementId: agr.id,
            reason: reason.trim(),
          });

          if (!signRes.success || !signRes.signature) {
            showToast(`❌ Dispute signature cancelled: ${signRes.error || 'User cancelled'}`);
            btnEl.disabled = false;
            btnEl.textContent = '⚠️ Raise Dispute';
            return;
          }

          agreementsService.raiseDispute(id, reason.trim(), signRes.signature);
          showToast(`⚠️ Formal dispute lodged under agreement protocol! Sig: ${signRes.signature.slice(0, 10)}...`);
          render();
        } catch (err: any) {
          console.error('Dispute filing error:', err);
          showToast(`❌ Error: ${err.message || 'Dispute signing failed'}`);
          btnEl.disabled = false;
          btnEl.textContent = '⚠️ Raise Dispute';
        }
      });
    });

    // Mutual refund back to buyer
    container.querySelectorAll('.btn-refund-buyer').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const btnEl = e.currentTarget as HTMLButtonElement;
        const id = btnEl.dataset.id!;
        const agr = agreementsService.getById(id);
        if (!agr) return;

        const confirmRefund = confirm(`Confirm mutual refund of ${agr.amount} ${agr.currency} back to client? This returns locked funds to buyer.`);
        if (!confirmRefund) return;

        btnEl.disabled = true;
        btnEl.textContent = '⏳ Signing refund...';

        try {
          const signRes = await miniPayService.signRefundAuthorization({
            agreementId: agr.id,
            buyerAddress: agr.contractorAddress,
            amount: agr.amount,
            currency: agr.currency,
          });

          if (!signRes.success || !signRes.signature) {
            showToast(`❌ Refund signature cancelled: ${signRes.error || 'User cancelled'}`);
            btnEl.disabled = false;
            btnEl.textContent = '↩️ Refund';
            return;
          }

          agreementsService.refundAgreement(id, signRes.signature);
          showToast(`↩️ Mutual refund executed! Funds credited back to client. Sig: ${signRes.signature.slice(0, 10)}...`);
          render();
        } catch (err: any) {
          console.error('Refund signing error:', err);
          showToast(`❌ Error: ${err.message || 'Refund signing failed'}`);
          btnEl.disabled = false;
          btnEl.textContent = '↩️ Refund';
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
    const isRefunded = agr.status === 'refunded' || agr.status === 'cancelled';
    const isDisputed = agr.status === 'disputed';
    const isDelivered = agr.status === 'delivered';
    const formattedAmount = agr.currency === 'cNGN'
      ? `₦${agr.amount.toLocaleString()} cNGN`
      : `${agr.amount} ${agr.currency}`;

    const countdown = getCountdownStatus(agr.deadlineTimestamp, agr.status);

    return `
      <div class="agreement-card" style="margin-bottom: 16px;">
        <div class="agreement-header">
          <div>
            <div class="agreement-title">${agr.title}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">ID: ${agr.id}</div>
          </div>
          <span class="agreement-badge ${countdown.badgeClass}">
            ${countdown.icon} ${countdown.label}
          </span>
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
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">Delivery Deadline:</span>
            <span style="color: var(--accent-cyan); font-weight: 500;">⏱ ${formatDeadlineHours(agr.deadlineHours)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px solid var(--border-subtle);">
            <span style="color: var(--text-muted);">Settlement Net:</span>
            <span style="font-weight: 700; color: var(--text-emerald);">${formattedAmount}</span>
          </div>
        </div>

        ${isDisputed ? `
          <div style="font-size: 12px; color: #f87171; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 12px;">
            <div style="font-weight: 700; margin-bottom: 4px;">⚠️ Active Dispute Lodged</div>
            <div style="color: var(--text-secondary); font-size: 11px;">${agr.disputeReason || 'Dispute lodged regarding deliverables criteria.'}</div>
            ${agr.disputeTxHash ? `
              <div style="font-size: 10px; font-family: monospace; margin-top: 6px; color: var(--text-muted);">
                Sig: ${agr.disputeTxHash.slice(0, 16)}...
              </div>
            ` : ''}
          </div>
        ` : ''}

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
            <a href="${getNetworkExplorer('celo', agr.fundingTxHash).url}" target="_blank" style="color: var(--accent-cyan); font-family: monospace; text-decoration: underline;">
              ${agr.fundingTxHash.slice(0, 12)}... ↗
            </a>
          </div>
        ` : ''}

        ${isReleased ? `
          <div style="display: flex; gap: 8px; align-items: center;">
            <div style="flex: 1; font-size: 11px; color: var(--text-muted);">
              ✅ Settled on Celo Mainnet<br/>
              ${agr.releaseTxHash ? (agr.releaseTxHash.length === 66 ? `
                <a href="${getNetworkExplorer('celo', agr.releaseTxHash).url}" target="_blank" style="font-size: 10px; color: var(--accent-cyan); font-family: monospace; text-decoration: underline;">
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
        ` : isRefunded ? `
          <div style="display: flex; gap: 8px; align-items: center;">
            <div style="flex: 1; font-size: 11px; color: var(--text-muted);">
              ↩️ Refunded back to client<br/>
              ${agr.refundTxHash ? `
                <span style="font-size: 10px; color: var(--text-secondary); font-family: monospace;" title="${agr.refundTxHash}">
                  Sig: ${agr.refundTxHash.slice(0, 14)}...
                </span>
              ` : ''}
            </div>
            <button class="btn-secondary btn-cashout-shortcut" style="width: auto; padding: 8px 12px; font-size: 12px;">
              Wallet Balance 💼
            </button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- Primary Actions Row -->
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-secondary btn-share-deal" data-id="${agr.id}" style="width: auto; padding: 10px 14px; font-size: 12px;" title="Share agreement link">
                <span>🔗 Share</span>
              </button>
              ${isDelivered ? `
                <button class="btn-primary btn-release-payment" data-id="${agr.id}" style="flex: 1; font-size: 13px; padding: 12px;">
                  <span>⚡ Release ${formattedAmount}</span>
                </button>
              ` : isDisputed ? `
                <button class="btn-primary btn-release-payment" data-id="${agr.id}" style="flex: 1; font-size: 13px; padding: 12px;">
                  <span>⚡ Resolve & Release Payout</span>
                </button>
              ` : `
                <button class="btn-secondary btn-mark-delivered" data-id="${agr.id}" style="flex: 1; font-size: 12px; padding: 10px;">
                  <span>📤 Mark Deliverable Ready</span>
                </button>
              `}
            </div>

            <!-- Resolution / Secondary Row -->
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              ${!isDisputed ? `
                <button class="btn-secondary btn-raise-dispute" data-id="${agr.id}" style="width: auto; padding: 6px 10px; font-size: 11px; color: #f87171; border-color: rgba(239, 68, 68, 0.3);">
                  ⚠️ Dispute
                </button>
              ` : ''}
              <button class="btn-secondary btn-refund-buyer" data-id="${agr.id}" style="width: auto; padding: 6px 10px; font-size: 11px; color: var(--text-secondary);">
                ↩️ Mutual Refund
              </button>
            </div>
          </div>
        `}
      </div>
    `;
  };

  render();
}
