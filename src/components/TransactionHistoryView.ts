import { transactionsService, type TransactionItem } from '../services/transactions.service';
import { agreementsService } from '../services/agreements.service';
import { getActiveNetwork } from '../config/celo.config';
import { getBankIconSvg, getHandshakeIconSvg, getHistoryIconSvg } from '../utils/ui-icons';

export function renderTransactionHistory(
  container: HTMLElement,
  onNavigate: (tab: string) => void
) {
  let activeFilter: 'all' | 'cashouts' | 'deals' = 'all';
  const network = getActiveNetwork();

  function renderList() {
    const rawItems = transactionsService.getAll();
    const agreements = agreementsService.getAll();

    // Consolidate any existing agreements into the transaction ledger if not already recorded
    const items: Array<TransactionItem & { explorerUrl?: string }> = [...rawItems];

    for (const agr of agreements) {
      const alreadyExists = items.some(i => i.id.includes(agr.id));
      if (!alreadyExists && agr.fundingTxHash) {
        items.push({
          id: `tx_${agr.id}`,
          type: agr.status === 'released' ? 'agreement_release' : 'agreement_fund',
          title: agr.status === 'released' ? `Settled: ${agr.title}` : `Funded: ${agr.title}`,
          sourceAmount: agr.amount,
          sourceToken: agr.currency,
          txHash: agr.releaseTxHash || agr.fundingTxHash,
          status: 'completed',
          timestamp: new Date(agr.createdAt).getTime(),
          attributionTag: agr.attributionTag,
        });
      }
    }

    // Sort descending
    items.sort((a, b) => b.timestamp - a.timestamp);

    const filtered = items.filter(item => {
      if (activeFilter === 'cashouts') return item.type === 'cashout';
      if (activeFilter === 'deals') return item.type === 'agreement_fund' || item.type === 'agreement_release';
      return true;
    });

    container.innerHTML = `
      <div class="section-header" style="margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h2 class="section-title">Transaction History</h2>
        </div>
        <span class="section-link" id="btn-back-history" style="cursor: pointer;">Back to Home</span>
      </div>

      <!-- Filter Chips -->
      <div class="history-filter-bar">
        <button type="button" class="history-filter-pill ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
          All Activity (${items.length})
        </button>
        <button type="button" class="history-filter-pill ${activeFilter === 'cashouts' ? 'active' : ''}" data-filter="cashouts" style="display: inline-flex; align-items: center; gap: 5px;">
          ${getBankIconSvg(13, 'currentColor')}
          <span>Cash Outs (${items.filter(i => i.type === 'cashout').length})</span>
        </button>
        <button type="button" class="history-filter-pill ${activeFilter === 'deals' ? 'active' : ''}" data-filter="deals" style="display: inline-flex; align-items: center; gap: 5px;">
          ${getHandshakeIconSvg(13, 'currentColor')}
          <span>Deals (${items.filter(i => i.type !== 'cashout').length})</span>
        </button>
      </div>

      <!-- Transaction Feed -->
      <div class="tx-history-list">
        ${filtered.length === 0 ? `
          <div class="tx-empty-state">
            <div style="display: flex; align-items: center; justify-content: center; width: 54px; height: 54px; margin: 0 auto 12px; border-radius: 14px; background: rgba(52, 211, 153, 0.1); color: var(--accent-emerald);">
              ${activeFilter === 'deals' ? getHandshakeIconSvg(28, 'var(--accent-emerald)') : activeFilter === 'cashouts' ? getBankIconSvg(28, 'var(--accent-emerald)') : getHistoryIconSvg(28, 'var(--accent-emerald)')}
            </div>
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
              ${activeFilter === 'deals' ? 'No deals recorded yet' : activeFilter === 'cashouts' ? 'No cash out records yet' : 'No transactions recorded yet'}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); max-width: 280px; margin: 0 auto 16px;">
              ${activeFilter === 'deals' 
                ? 'Create an autonomous service agreement with milestone deliverables and Service Agreement protection on Celo.' 
                : activeFilter === 'cashouts'
                  ? 'Cash out your digital dollars directly to your local bank account.'
                  : 'Cash out to your local bank or create your first service agreement to view settled records here.'}
            </div>
            <div style="display: flex; gap: 8px; justify-content: center;">
              ${activeFilter === 'deals' ? `
                <button class="btn-primary" id="btn-history-create-deal" style="width: auto; padding: 8px 18px; font-size: 12px;">
                  + New Deal
                </button>
              ` : activeFilter === 'cashouts' ? `
                <button class="btn-primary" id="btn-history-cashout" style="width: auto; padding: 8px 18px; font-size: 12px;">
                  Cash Out Now
                </button>
              ` : `
                <button class="btn-primary" id="btn-history-create-deal" style="width: auto; padding: 8px 16px; font-size: 12px;">
                  + New Deal
                </button>
                <button class="btn-secondary" id="btn-history-cashout" style="width: auto; padding: 8px 16px; font-size: 12px;">
                  Cash Out
                </button>
              `}
            </div>
          </div>
        ` : filtered.map(item => {
          const dateStr = new Date(item.timestamp).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          const isCashout = item.type === 'cashout';

          const fiatDisplay = (isCashout && item.targetAmount)
            ? `${item.targetCurrencySymbol || ''}${item.targetAmount.toLocaleString()} ${item.targetCurrency || ''}`
            : '';

          const explorerLink = item.txHash 
            ? `${network.blockExplorerUrl}/tx/${item.txHash}`
            : null;

          return `
            <div class="tx-item-card">
              <div class="tx-item-icon-wrap" style="display: flex; align-items: center; justify-content: center; color: var(--accent-emerald);">
                ${isCashout ? getBankIconSvg(18, 'var(--accent-emerald)') : getHandshakeIconSvg(18, 'var(--accent-emerald)')}
              </div>
              <div class="tx-item-main">
                <div class="tx-item-title">${item.title}</div>
                <div class="tx-item-sub">
                  ${item.recipientName ? `${item.recipientName} · ` : ''}
                  ${item.recipientAccount ? `${item.recipientAccount} · ` : ''}
                  <span>${dateStr}</span>
                </div>
                ${explorerLink ? `
                  <a href="${explorerLink}" target="_blank" rel="noopener noreferrer" class="tx-explorer-link">
                    <span>Explorer ↗</span>
                  </a>
                ` : ''}
              </div>
              <div class="tx-item-right">
                <div class="tx-amount-primary">
                  -${item.sourceAmount} ${item.sourceToken}
                </div>
                ${fiatDisplay ? `<div class="tx-amount-fiat">${fiatDisplay}</div>` : ''}
                <div class="tx-status-badge ${item.status}">
                  ${item.status === 'completed' ? 'Settled' : item.status}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Event handlers
    container.querySelector('#btn-back-history')?.addEventListener('click', () => onNavigate('dashboard'));
    container.querySelector('#btn-history-cashout')?.addEventListener('click', () => onNavigate('cashout'));
    container.querySelector('#btn-history-create-deal')?.addEventListener('click', () => onNavigate('create'));

    container.querySelectorAll('.history-filter-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filter = (e.currentTarget as HTMLElement).dataset.filter as any;
        if (filter) {
          activeFilter = filter;
          renderList();
        }
      });
    });
  }

  renderList();
}
