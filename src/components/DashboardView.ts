import { fetchTokenBalances } from '../services/celo-client';
import { miniPayService } from '../services/minipay.service';
import { agreementsService } from '../services/agreements.service';
import { CELO_CONFIG } from '../config/celo.config';

export async function renderDashboard(container: HTMLElement, onNavigate: (tab: string) => void) {
  const state = miniPayService.getState();
  const balances = await fetchTokenBalances(state.address);
  const agreements = agreementsService.getAll();
  const activeCount = agreements.filter(a => a.status !== 'released').length;

  const totalUsd = balances.reduce((sum, b) => sum + b.usdValue, 0);

  const usdcBal = balances.find(b => b.symbol === 'USDC')?.balanceFormatted || '0.00';
  const cngnBal = balances.find(b => b.symbol === 'cNGN')?.balanceFormatted || '0.00';

  container.innerHTML = `
    <!-- Network Ribbon -->
    <div class="network-ribbon">
      <div class="network-details">
        <span>⚡ Celo Mainnet</span>
        <span style="color: var(--text-muted);">|</span>
        <span style="font-family: monospace; font-size: 11px;">Tag: ${CELO_CONFIG.attributionTag}</span>
      </div>
      <span class="evaluator-tag">${state.mode === 'live_minipay' ? 'Mobile WebView' : 'Evaluator Mode'}</span>
    </div>

    <!-- Hero Balance Card -->
    <div class="hero-card">
      <div class="hero-title">
        <span>Celo Stablecoin Portfolio</span>
        <span style="cursor: pointer; font-size: 14px;" id="btn-refresh-bal" title="Refresh balances">🔄</span>
      </div>
      <div class="hero-balance">
        $${totalUsd.toFixed(2)} <span>USD</span>
      </div>

      <div class="token-pill-row">
        <div class="token-pill">
          <span class="token-pill-icon">💵</span>
          <div class="token-pill-info">
            <span class="token-pill-val">${usdcBal} USDC</span>
            <span class="token-pill-lbl">Circle Native</span>
          </div>
        </div>
        <div class="token-pill">
          <span class="token-pill-icon">🇳🇬</span>
          <div class="token-pill-info">
            <span class="token-pill-val">₦${cngnBal}</span>
            <span class="token-pill-lbl">Compliant Naira</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Action Grid -->
    <div class="actions-grid">
      <div class="action-tile" id="tile-create-agreement">
        <div class="action-tile-icon">📝</div>
        <span class="action-tile-title">New Deal</span>
      </div>
      <div class="action-tile" id="tile-cashout">
        <div class="action-tile-icon">🏦</div>
        <span class="action-tile-title">Cash Out</span>
      </div>
      <div class="action-tile" id="tile-deals">
        <div class="action-tile-icon">🤝</div>
        <span class="action-tile-title">Deals (${activeCount})</span>
      </div>
    </div>

    <!-- Active Deals Section -->
    <div class="section-header">
      <h2 class="section-title">Active Service Agreements</h2>
      <span class="section-link" id="link-view-all">View All (${agreements.length})</span>
    </div>

    <div class="agreements-list">
      ${agreements.slice(0, 3).map(agr => `
        <div class="agreement-card" data-id="${agr.id}">
          <div class="agreement-header">
            <span class="agreement-title">${agr.title}</span>
            <span class="agreement-badge badge-${agr.status}">${agr.status.replace('_', ' ')}</span>
          </div>
          <p class="agreement-desc">${agr.description}</p>
          <div class="agreement-meta">
            <span class="agreement-amount">
              ${agr.currency === 'USDC' ? `${agr.amount} USDC` : `₦${agr.amount.toLocaleString()} cNGN`}
            </span>
            <span style="color: var(--text-muted); font-size: 11px;">
              ${agr.status === 'released' ? 'Settled' : `${agr.deadlineHours}h timer`}
            </span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Attach event handlers
  container.querySelector('#btn-refresh-bal')?.addEventListener('click', () => {
    renderDashboard(container, onNavigate);
  });
  container.querySelector('#tile-create-agreement')?.addEventListener('click', () => onNavigate('create'));
  container.querySelector('#tile-cashout')?.addEventListener('click', () => onNavigate('cashout'));
  container.querySelector('#tile-deals')?.addEventListener('click', () => onNavigate('deals'));
  container.querySelector('#link-view-all')?.addEventListener('click', () => onNavigate('deals'));

  container.querySelectorAll('.agreement-card').forEach(card => {
    card.addEventListener('click', () => onNavigate('deals'));
  });
}
