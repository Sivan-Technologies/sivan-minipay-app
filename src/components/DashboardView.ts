import { fetchTokenBalances } from '../services/celo-client';
import { miniPayService } from '../services/minipay.service';
import { agreementsService } from '../services/agreements.service';
import { CELO_CONFIG } from '../config/celo.config';
import { countryService } from '../config/countries.config';
import { fxQuotesService } from '../services/fx-quotes.service';

export async function renderDashboard(container: HTMLElement, onNavigate: (tab: string) => void) {
  const state = miniPayService.getState();
  const country = countryService.getActiveCountry();
  const isConnected = !!state.address;
  const balances = await fetchTokenBalances(state.address);
  const agreements = agreementsService.getAll();
  const activeCount = agreements.filter(a => a.status !== 'released').length;

  const totalUsd = isConnected ? balances.reduce((sum, b) => sum + b.usdValue, 0) : 0;

  const usdtBal = balances.find(b => b.symbol === 'USDT')?.balanceFormatted || '0.00';
  const usdcBal = balances.find(b => b.symbol === 'USDC')?.balanceFormatted || '0.00';
  const cusdBal = balances.find(b => b.symbol === 'cUSD')?.balanceFormatted || '0.00';
  const cngnBal = balances.find(b => b.symbol === 'cNGN')?.balanceFormatted || '0.00';

  // Live currency conversion calculation based on selected country
  const liveRate = fxQuotesService.getLatestRate('USDC', country.code);
  const fiatTotal = totalUsd * liveRate;
  const formattedFiat = fiatTotal >= 1 
    ? fiatTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : fiatTotal.toFixed(2);

  const modeLabel = state.mode === 'live_minipay'
    ? 'MiniPay Mobile'
    : state.mode === 'connected_wallet'
      ? 'MetaMask'
      : 'Disconnected';

  const modeBadgeColor = isConnected ? 'var(--accent-emerald)' : 'var(--text-muted)';

  // Determine top displayed stablecoin
  const primaryTokenSymbol = Number(usdtBal) > 0 ? 'USDT' : 'USDC';
  const primaryTokenBal = primaryTokenSymbol === 'USDT' ? usdtBal : usdcBal;

  container.innerHTML = `
    <!-- Network Ribbon -->
    <div class="network-ribbon">
      <div class="network-details">
        <span>⚡ Celo Mainnet</span>
        <span style="color: var(--text-muted);">|</span>
        <span style="font-family: monospace; font-size: 11px;">Tag: ${CELO_CONFIG.attributionTag}</span>
      </div>
      <span class="evaluator-tag" style="border-color: ${modeBadgeColor}; color: ${modeBadgeColor};">${modeLabel}</span>
    </div>

    <!-- BitGifty-Inspired Available Balance Hero Card -->
    <div class="hero-balance-card">
      <div class="hero-top-row">
        <span class="hero-avail-label">Available Balance</span>
        <button type="button" class="hero-history-btn" id="btn-hero-history">
          <span>Transaction History</span>
          <span class="hero-arrow">→</span>
        </button>
      </div>

      <div class="hero-primary-crypto">
        <span class="hero-crypto-symbol">${primaryTokenSymbol}</span>
        <span class="hero-crypto-amount">${primaryTokenBal}</span>
        <span class="hero-refresh-icon" id="btn-refresh-bal" title="Refresh live balances">🔄</span>
      </div>

      <div class="hero-fiat-sub">
        <span class="hero-fiat-symbol">${country.currencySymbol}</span>${formattedFiat}
        <span class="hero-fiat-tag">${country.currency} · ${country.flag}</span>
      </div>

      <!-- Token Balances Strip -->
      <div class="hero-token-strip">
        <div class="mini-token-pill">
          <span class="pill-dot">🟢</span>
          <span class="pill-val">${usdtBal} USDT</span>
        </div>
        <div class="mini-token-pill">
          <span class="pill-dot">💵</span>
          <span class="pill-val">${usdcBal} USDC</span>
        </div>
        <div class="mini-token-pill">
          <span class="pill-dot">💲</span>
          <span class="pill-val">${cusdBal} cUSD</span>
        </div>
        ${country.code === 'NG' ? `
          <div class="mini-token-pill">
            <span class="pill-dot">🇳🇬</span>
            <span class="pill-val">₦${cngnBal} cNGN</span>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Quick Action Grid -->
    <div class="actions-grid">
      <div class="action-tile" id="tile-cashout">
        <div class="action-tile-icon-wrap" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald);">
          <span class="action-tile-icon">🏦</span>
        </div>
        <span class="action-tile-title">Cash Out</span>
        <span class="action-tile-badge">${country.flag} ${country.currency}</span>
      </div>
      <div class="action-tile" id="tile-create-agreement">
        <div class="action-tile-icon-wrap" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan);">
          <span class="action-tile-icon">📝</span>
        </div>
        <span class="action-tile-title">New Deal</span>
      </div>
      <div class="action-tile" id="tile-deals">
        <div class="action-tile-icon-wrap" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b);">
          <span class="action-tile-icon">🤝</span>
        </div>
        <span class="action-tile-title">Deals (${activeCount})</span>
      </div>
      <div class="action-tile" id="tile-history">
        <div class="action-tile-icon-wrap" style="background: rgba(99, 102, 241, 0.15); color: #818cf8);">
          <span class="action-tile-icon">📜</span>
        </div>
        <span class="action-tile-title">History</span>
      </div>
    </div>

    <!-- Active Deals Section -->
    <div class="section-header">
      <h2 class="section-title">Active Service Agreements</h2>
      <span class="section-link" id="link-view-all">View All (${agreements.length})</span>
    </div>

    <div class="agreements-list">
      ${agreements.length === 0 ? `
        <div class="empty-agreements-box">
          <div style="font-size: 28px; margin-bottom: 8px;">🤝</div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">No active service agreements yet</div>
          <div style="font-size: 12px; margin-bottom: 14px; color: var(--text-muted);">Lock funds with milestone deliverables and ERC-8021 attribution.</div>
          <button class="btn-primary" style="display: inline-flex; width: auto; padding: 8px 16px; font-size: 12px;" id="btn-empty-create">
            + Create First Deal
          </button>
        </div>
      ` : agreements.slice(0, 3).map(agr => `
        <div class="agreement-card" data-id="${agr.id}">
          <div class="agreement-header">
            <span class="agreement-title">${agr.title}</span>
            <span class="agreement-badge badge-${agr.status}">${agr.status.replace('_', ' ')}</span>
          </div>
          <p class="agreement-desc">${agr.description}</p>
          <div class="agreement-meta">
            <span class="agreement-amount">
              ${agr.currency === 'cNGN' ? `₦${agr.amount.toLocaleString()} cNGN` : `${agr.amount} ${agr.currency}`}
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
  container.querySelector('#btn-hero-history')?.addEventListener('click', () => onNavigate('history'));
  container.querySelector('#tile-history')?.addEventListener('click', () => onNavigate('history'));
  container.querySelector('#tile-create-agreement')?.addEventListener('click', () => onNavigate('create'));
  container.querySelector('#tile-cashout')?.addEventListener('click', () => onNavigate('cashout'));
  container.querySelector('#tile-deals')?.addEventListener('click', () => onNavigate('deals'));
  container.querySelector('#link-view-all')?.addEventListener('click', () => onNavigate('deals'));
  container.querySelector('#btn-empty-create')?.addEventListener('click', () => onNavigate('create'));

  container.querySelectorAll('.agreement-card').forEach(card => {
    card.addEventListener('click', () => onNavigate('deals'));
  });
}
