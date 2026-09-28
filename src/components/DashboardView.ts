import { fetchTokenBalances } from '../services/celo-client';
import { miniPayService } from '../services/minipay.service';
import { agreementsService } from '../services/agreements.service';
import { CELO_CONFIG } from '../config/celo.config';
import { countryService } from '../config/countries.config';
import { fxQuotesService } from '../services/fx-quotes.service';
import { getTokenIconSvg } from '../utils/token-icons';
import { openLegalModal } from './LegalSupportModal';
import { openServiceAgreementExplainerModal } from './ServiceAgreementExplainerModal';
import { getCountdownStatus } from '../utils/deadline';
import { getHandshakeIconSvg } from '../utils/ui-icons';

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
    <!-- Purpose-Driven Brand Tagline -->
    <div class="dashboard-brand-tagline">
      <span class="tagline-pulse-dot"></span>
      <span>Smart Milestone Vaults for Freelancers & Clients</span>
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

    <!-- Sivan Service Agreement Value Banner Carousel -->
    <div class="sivan-banner-carousel" id="sivan-banner-carousel">
      <div class="carousel-track" id="carousel-track">
        
        <!-- Slide 0: Autonomous Service Agreements (Core Value) -->
        <div class="banner-slide slide-security active" data-slide-index="0" data-action="explainer">
          <div class="banner-content">
            <div class="banner-badge badge-emerald">
              <span class="badge-dot pulse-emerald"></span>
              <span>100% PAYMENT PROTECTION</span>
            </div>
            <h3 class="banner-title">More Than An Invoice</h3>
            <p class="banner-desc">Client funds are locked safely in smart agreement vaults before work begins. Release on delivery.</p>
            <div class="banner-cta">
              <span>How It Works</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </div>
          <div class="banner-graphic">
            <svg class="graphic-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#06b6d4" />
                  <stop offset="50%" stop-color="#3b82f6" />
                  <stop offset="100%" stop-color="#10b981" />
                </linearGradient>
                <filter id="glowFilt" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx="50" cy="50" r="38" fill="rgba(6,182,212,0.12)" />
              <path d="M50 16L78 28V52C78 68 66 81 50 86C34 81 22 68 22 52V28L50 16Z" fill="url(#shieldGrad)" opacity="0.9" filter="url(#glowFilt)" />
              <path d="M50 22L72 32V50C72 63 63 74 50 78C37 74 28 63 28 50V32L50 22Z" fill="#091428" />
              <rect x="42" y="46" width="16" height="14" rx="3" fill="#10b981" />
              <path d="M45 46V41C45 38.2 47.2 36 50 36C52.8 36 55 38.2 55 41V46" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" />
              <circle cx="50" cy="52" r="1.5" fill="#091428" />
              <circle cx="22" cy="28" r="2" fill="#06b6d4" />
              <circle cx="80" cy="36" r="2.5" fill="#10b981" />
              <circle cx="76" cy="70" r="1.5" fill="#60a5fa" />
            </svg>
          </div>
        </div>

        <!-- Slide 1: Freelancer & Client Security -->
        <div class="banner-slide slide-freelance" data-slide-index="1" data-action="create">
          <div class="banner-content">
            <div class="banner-badge badge-cyan">
              <span class="badge-dot pulse-cyan"></span>
              <span>ZERO GHOSTING RISK</span>
            </div>
            <h3 class="banner-title">Never Work For Free Again</h3>
            <p class="banner-desc">Clients deposit funds before you begin. Guarantee your milestone payout every time.</p>
            <div class="banner-cta">
              <span>Create Deal</span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </div>
          <div class="banner-graphic">
            <svg class="graphic-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#3b82f6" />
                  <stop offset="100%" stop-color="#8b5cf6" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="38" fill="rgba(59,130,246,0.12)" />
              <rect x="28" y="20" width="44" height="60" rx="8" fill="url(#docGrad)" opacity="0.9" />
              <rect x="32" y="24" width="36" height="52" rx="6" fill="#091428" />
              <line x1="38" y1="34" x2="62" y2="34" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" />
              <line x1="38" y1="42" x2="58" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" />
              <line x1="38" y1="50" x2="54" y2="50" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-linecap="round" />
              <circle cx="58" cy="62" r="10" fill="#10b981" />
              <path d="M54 62L57 65L62 59" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>

      </div>

      <!-- Carousel Pagination Indicator Dots -->
      <div class="carousel-indicators">
        <span class="indicator-dot active" data-dot-index="0"></span>
        <span class="indicator-dot" data-dot-index="1"></span>
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
          <div class="empty-agreements-icon" style="display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 12px; background: rgba(52, 211, 153, 0.1); color: var(--accent-emerald);">
            ${getHandshakeIconSvg(24, 'var(--accent-emerald)')}
          </div>
          <div class="empty-agreements-title">Protect your next freelance gig</div>
          <div class="empty-agreements-desc" style="max-width: 320px; margin: 0 auto 16px; line-height: 1.45; font-size: 12px; color: var(--text-muted);">
            Unlike ordinary invoices, Sivan locks client funds in a smart agreement vault before work begins. Start work with 100% confidence.
          </div>
          <button class="btn-empty-create" id="btn-empty-create">
            + Create Service Agreement
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
        Celo Mainnet · Tag: ${CELO_CONFIG.attributionTag}
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

  // Carousel state & controller
  const carouselEl = container.querySelector('#sivan-banner-carousel');
  const slides = container.querySelectorAll<HTMLElement>('.banner-slide');
  const dots = container.querySelectorAll<HTMLElement>('.indicator-dot');
  let currentSlideIndex = 0;
  let slideTimer: any = null;

  const showSlide = (index: number) => {
    currentSlideIndex = (index + slides.length) % slides.length;
    slides.forEach((s, idx) => {
      if (idx === currentSlideIndex) {
        s.classList.add('active');
      } else {
        s.classList.remove('active');
      }
    });
    dots.forEach((d, idx) => {
      if (idx === currentSlideIndex) {
        d.classList.add('active');
      } else {
        d.classList.remove('active');
      }
    });
  };

  const startSlideTimer = () => {
    stopSlideTimer();
    slideTimer = setInterval(() => {
      showSlide(currentSlideIndex + 1);
    }, 5200);
  };

  const stopSlideTimer = () => {
    if (slideTimer) {
      clearInterval(slideTimer);
      slideTimer = null;
    }
  };

  // Start auto-rotation
  startSlideTimer();

  // Pause on pointer enter / resume on leave
  carouselEl?.addEventListener('mouseenter', stopSlideTimer);
  carouselEl?.addEventListener('mouseleave', startSlideTimer);

  // Indicator dots click
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      stopSlideTimer();
      const targetIdx = parseInt(dot.getAttribute('data-dot-index') || '0', 10);
      showSlide(targetIdx);
      startSlideTimer();
    });
  });

  // Slide click actions
  slides.forEach(slide => {
    slide.addEventListener('click', () => {
      const action = slide.getAttribute('data-action');
      if (action === 'explainer') {
        openServiceAgreementExplainerModal(onNavigate);
      } else if (action === 'create') {
        onNavigate('create');
      } else if (action === 'cashout') {
        onNavigate('cashout');
      }
    });
  });

  // Touch swipe support
  let touchStartX = 0;
  carouselEl?.addEventListener('touchstart', (e: any) => {
    touchStartX = e.touches[0].clientX;
    stopSlideTimer();
  }, { passive: true });

  carouselEl?.addEventListener('touchend', (e: any) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left -> next slide
        showSlide(currentSlideIndex + 1);
      } else {
        // Swiped right -> prev slide
        showSlide(currentSlideIndex - 1);
      }
    }
    startSlideTimer();
  }, { passive: true });

  container.querySelectorAll('.agreement-card').forEach(card => {
    card.addEventListener('click', () => onNavigate('deals'));
  });
}
