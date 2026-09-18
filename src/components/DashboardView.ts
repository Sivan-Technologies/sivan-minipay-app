import { fetchTokenBalances } from '../services/celo-client';
import { miniPayService } from '../services/minipay.service';
import { agreementsService } from '../services/agreements.service';
import { CELO_CONFIG } from '../config/celo.config';
import { countryService } from '../config/countries.config';
import { fxQuotesService } from '../services/fx-quotes.service';
import { getTokenIconSvg } from '../utils/token-icons';
import { openLegalModal } from './LegalSupportModal';
import { getCountdownStatus } from '../utils/deadline';

export async function renderDashboard(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  onToast?: (msg: string) => void
) {
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
  const hasCusd = parseFloat(cusdBal) > 0;

  // Live currency conversion calculation based on selected country
  const liveRate = fxQuotesService.getLatestRate('USDC', country.code);
  const fiatTotal = totalUsd * liveRate;
  const formattedFiat = fiatTotal >= 1 
    ? fiatTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : fiatTotal.toFixed(2);

  // Display total Digital Dollar balance in USD (USDC + USDT + cUSD)
  const usdStableTotal = balances
    .filter(b => b.symbol === 'USDC' || b.symbol === 'USDT' || b.symbol === 'cUSD')
    .reduce((sum, b) => sum + (parseFloat(b.balanceFormatted.replace(/,/g, '')) || 0), 0);

  const primaryTokenBal = usdStableTotal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  container.innerHTML = `
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
        <span class="hero-crypto-symbol">USD</span>
        <span class="hero-crypto-amount">${primaryTokenBal}</span>
        <span class="hero-refresh-icon" id="btn-refresh-bal" title="Refresh live balances">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
          </svg>
        </span>
      </div>

      <div class="hero-fiat-sub">
        <span class="hero-fiat-symbol">${country.currencySymbol}</span>${formattedFiat}
        <span class="hero-fiat-tag">${country.currency} · ${country.flag}</span>
      </div>

      <!-- Token Balances Strip -->
      <div class="hero-token-strip">
        <div class="mini-token-pill">
          <span class="pill-dot">${getTokenIconSvg('USDT', 14)}</span>
          <span class="pill-val">${usdtBal} USDT</span>
        </div>
        <div class="mini-token-pill">
          <span class="pill-dot">${getTokenIconSvg('USDC', 14)}</span>
          <span class="pill-val">${usdcBal} USDC</span>
        </div>
        ${hasCusd ? `
          <div class="mini-token-pill">
            <span class="pill-dot">${getTokenIconSvg('cUSD', 14)}</span>
            <span class="pill-val">${cusdBal} USDm</span>
          </div>
        ` : ''}
        ${country.code === 'NG' ? `
          <div class="mini-token-pill">
            <span class="pill-dot">${getTokenIconSvg('cNGN', 14)}</span>
            <span class="pill-val">₦${cngnBal} cNGN</span>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Quick Action Grid (Service Agreement Core: New Deal | Deals | Swap) -->
    <div class="actions-grid">
      <div class="action-tile" id="tile-create-agreement">
        <div class="action-tile-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h8l6-6V4c0-1.1-.9-2-2-2H6zm2 5h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2zm6 1v4.5l4.5-4.5H14z"/>
          </svg>
        </div>
        <span class="action-tile-title">New Deal</span>
        <span class="action-tile-badge">Protect Deal</span>
      </div>
      <div class="action-tile" id="tile-deals">
        <div class="action-tile-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 2h4c1.1 0 2 .9 2 2v2h4c1.1 0 2 .9 2 2v3c0 .55-.45 1-1 1h-1v7c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2v-7H1c-.55 0-1-.45-1-1V8c0-1.1.9-2 2-2h4V4c0-1.1.9-2 2-2zm2 2h-2v2h2V4zm-8 8v6h16v-6h-5v1.5c0 .28-.22.5-.5.5h-3a.5.5 0 01-.5-.5V12H4zm7 1.5v1h2v-1h-2z"/>
          </svg>
        </div>
        <span class="action-tile-title">Deals</span>
        <span class="action-tile-badge">${activeCount > 0 ? `${activeCount} Active` : `${agreements.length} Total`}</span>
      </div>
      <div class="action-tile" id="tile-swap">
        <div class="action-tile-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/>
          </svg>
        </div>
        <span class="action-tile-title">Swap</span>
        <span class="action-tile-badge">cNGN ⇄ USDm</span>
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
          <div class="empty-agreements-icon">🤝</div>
          <div class="empty-agreements-title">No active service agreements yet</div>
          <div class="empty-agreements-desc">Lock funds with milestone deliverables and ERC-8021 attribution.</div>
          <button class="btn-empty-create" id="btn-empty-create">
            + Create First Deal
          </button>
        </div>
      ` : agreements.slice(0, 3).map(agr => {
        const countdown = getCountdownStatus(agr.deadlineTimestamp, agr.status);
        return `
        <div class="agreement-card" data-id="${agr.id}">
          <div class="agreement-header">
            <span class="agreement-title">${agr.title}</span>
            <span class="agreement-badge ${countdown.badgeClass}">${countdown.icon} ${countdown.label}</span>
          </div>
          <p class="agreement-desc">${agr.description}</p>
          <div class="agreement-meta">
            <span class="agreement-amount">
              ${agr.currency === 'cNGN' ? `₦${agr.amount.toLocaleString()} cNGN` : `${agr.amount} ${agr.currency}`}
            </span>
            <span style="color: var(--text-muted); font-size: 11px;">
              ${agr.status === 'released' ? 'Settled' : agr.status === 'refunded' ? 'Refunded' : `${agr.deadlineHours}h window`}
            </span>
          </div>
        </div>
      `;
      }).join('')}
    </div>

    <!-- Ultra-Slick Minimalist Footer (Fonbnk Style) -->
    <div class="app-clean-footer" style="margin-top: 40px; padding: 24px 12px 110px; text-align: center;">
      <!-- Links Row -->
      <div style="display: flex; justify-content: center; align-items: center; gap: 12px; font-size: 12px; margin-bottom: 12px;">
        <button type="button" class="btn-clean-footer-link" id="link-footer-support" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 4px 6px; transition: color 0.2s ease;">
          Support
        </button>
        <span style="color: var(--border-subtle); opacity: 0.6;">|</span>
        <button type="button" class="btn-clean-footer-link" id="link-footer-terms" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 4px 6px; transition: color 0.2s ease;">
          Terms
        </button>
        <span style="color: var(--border-subtle); opacity: 0.6;">|</span>
        <button type="button" class="btn-clean-footer-link" id="link-footer-privacy" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 12px; padding: 4px 6px; transition: color 0.2s ease;">
          Privacy Policy
        </button>
      </div>

      <!-- Powered by Sivan Technologies -->
      <div style="font-size: 12px; color: var(--text-muted); font-weight: 500; display: flex; justify-content: center; align-items: center; gap: 6px; margin-bottom: 8px;">
        <span>Powered by</span>
        <span style="color: var(--accent-emerald); font-weight: 700; letter-spacing: -0.01em;">Sivan Technologies</span>
      </div>

      <!-- Subtle Network & Attribution Tag Proof -->
      <div style="font-size: 10px; color: var(--text-muted); opacity: 0.55; letter-spacing: 0.02em;">
        ⚡ Celo Mainnet · Tag: ${CELO_CONFIG.attributionTag}
      </div>
    </div>
  `;

  // Attach event handlers
  container.querySelector('#btn-refresh-bal')?.addEventListener('click', () => {
    renderDashboard(container, onNavigate, onToast);
  });
  container.querySelector('#btn-hero-history')?.addEventListener('click', () => onNavigate('history'));
  container.querySelector('#tile-swap')?.addEventListener('click', () => onNavigate('swap'));
  container.querySelector('#tile-create-agreement')?.addEventListener('click', () => onNavigate('create'));
  container.querySelector('#tile-cashout')?.addEventListener('click', () => onNavigate('cashout'));
  container.querySelector('#tile-deals')?.addEventListener('click', () => onNavigate('deals'));
  container.querySelector('#link-view-all')?.addEventListener('click', () => onNavigate('deals'));
  container.querySelector('#btn-empty-create')?.addEventListener('click', () => onNavigate('create'));

  // Legal & Support listeners
  container.querySelector('#link-footer-terms')?.addEventListener('click', () => openLegalModal('terms'));
  container.querySelector('#link-footer-privacy')?.addEventListener('click', () => openLegalModal('privacy'));
  container.querySelector('#link-footer-support')?.addEventListener('click', () => openLegalModal('support'));

  container.querySelectorAll('.agreement-card').forEach(card => {
    card.addEventListener('click', () => onNavigate('deals'));
  });
}
