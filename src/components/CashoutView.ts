import { fxQuotesService, type BankItem, getBankLogoUrl } from '../services/fx-quotes.service';
import { miniPayService } from '../services/minipay.service';
import { fetchTokenBalances } from '../services/celo-client';
import { countryService } from '../config/countries.config';
import { transactionsService } from '../services/transactions.service';
import { identityService } from '../services/identity.service';
import { getActiveNetwork, getSivanFeeWallet, type SupportedTokenSymbol } from '../config/celo.config';
import { getTokenIconSvg } from '../utils/token-icons';
import { textileKycService } from '../services/textile-kyc.service';
import { openTextileKycModal } from './TextileKycModal';
import { injectClaimHandleNudge } from './ClaimHandleNudge';

export async function renderCashout(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  const state = miniPayService.getState();
  const balances = await fetchTokenBalances(state.address);
  const country = countryService.getActiveCountry();

  const isGhana = country.code === 'GH';
  const isKenya = country.code === 'KE';
  const isNigeria = country.code === 'NG';
  const isGlobal = country.code === 'GLOBAL';

  let activeTab: 'bank' | 'wallet' = 'bank';

  const corridorTitle = isNigeria
    ? '⚡ Celo to NIBSS Off-Ramp'
    : isGhana
      ? '⚡ Celo to GhIPSS & MoMo Off-Ramp'
      : isKenya
        ? '⚡ Celo to M-PESA & Pesalink'
        : '⚡ Celo to PayShap & EFT';

  const corridorProvider = isNigeria
    ? 'Textile Credit RFQ'
    : isGhana
      ? 'Kotani Pay / Busha GHS'
      : 'Sivan Multi-Corridor';

  // Bank pills dynamically rendered from active country
  const quickBanks = isGlobal ? [] : country.defaultBanks.slice(0, 6);
  const defaultBank = quickBanks[0];

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 16px;">
      <h2 class="section-title">Send & Cash Out</h2>
      <span class="section-link" id="btn-back-cashout">Back</span>
    </div>

    <!-- 2-Way Segmented Switcher (Bank vs Sivan User/Wallet) -->
    <div class="segmented-tabs-wrapper" id="cashout-segmented-tabs">
      <button type="button" class="segmented-tab active" id="tab-btn-bank">
        <span>🏦</span> <span>To ${isNigeria ? 'Nigeria Bank (NGN)' : `${country.name} Bank (${country.currency})`}</span>
      </button>
      <button type="button" class="segmented-tab" id="tab-btn-wallet">
        <span>⚡</span> <span>To Sivan User / Wallet</span>
      </button>
    </div>

    <!-- Live Corridor Status: Bank Mode -->
    <div id="corridor-banner-bank" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: ${isNigeria ? '10px' : '20px'}; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 700; color: var(--text-emerald);">${corridorTitle}</span>
        <span style="font-size: 11px; color: var(--text-muted);">${corridorProvider}</span>
      </div>
      <div id="corridor-desc" style="color: var(--text-secondary); line-height: 1.4;">
        ${country.settlementDescription}
      </div>
    </div>

    ${isNigeria ? `
    <!-- KYC Compliance Status Banner (Nigeria Only) -->
    <div id="kyc-status-banner" style="margin-bottom: 16px; padding: 10px 12px; border-radius: var(--radius-md); font-size: 12px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">⏳</span>
        <div>
          <span style="font-weight: 700; color: #f59e0b; font-size: 11px; display: block;">Identity Verification Required</span>
          <span style="color: var(--text-muted); font-size: 11px;">Checking KYC status with Busha...</span>
        </div>
      </div>
      <span style="font-size: 11px; color: #f59e0b; font-weight: 600;">Verify →</span>
    </div>
    ` : ''}

    <!-- Live Corridor Status: Wallet Mode -->
    <div id="corridor-banner-wallet" style="display: none; background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 20px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 700; color: var(--accent-cyan);">⚡ Instant Peer-to-Peer Transfer on Celo</span>
        <span style="font-size: 11px; color: var(--accent-emerald); font-weight: 600;">✓ Sub-Second Finality</span>
      </div>
      <div style="color: var(--text-secondary); line-height: 1.4;">
        Zero-gas direct settlement. Send directly to any Sivan handle (@username) or verified Celo address.
      </div>
    </div>

    <form id="form-cashout">
      <!-- Shared Asset & Amount Section -->
      <div class="form-group">
        <label class="form-label">Source Asset & Amount</label>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px;">
          <!-- In-DOM Token Selector Dropdown -->
          <div class="custom-select-wrap" id="token-select-wrap">
            <div class="custom-select-trigger" id="token-select-trigger">
              <span id="selected-token-display" style="display: inline-flex; align-items: center; gap: 6px;">${getTokenIconSvg(isNigeria ? 'cNGN' : 'USDC', 16)} <span>${isNigeria ? 'cNGN' : 'USDC'}</span></span>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="token-select-menu">
              ${isNigeria ? `
                <div class="custom-select-item selected" data-value="cNGN" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('cNGN', 16)} <span>cNGN (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="USDT" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('USDT', 16)} <span>USDT (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="USDC" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('USDC', 16)} <span>USDC (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="cUSD" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('cUSD', 16)} <span>cUSD (Celo)</span>
                </div>
              ` : `
                <div class="custom-select-item selected" data-value="USDC" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('USDC', 16)} <span>USDC (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="USDT" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('USDT', 16)} <span>USDT (Celo)</span>
                </div>
                <div class="custom-select-item" data-value="cUSD" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('cUSD', 16)} <span>cUSD (Celo)</span>
                </div>
              `}
            </div>
            <input type="hidden" id="cashout-token" value="${isNigeria ? 'cNGN' : 'USDC'}" />
          </div>

          <input 
            type="number" 
            id="cashout-amount" 
            class="form-input" 
            placeholder="0.00" 
            min="0.01" 
            step="any" 
            required 
          />
        </div>
        <div id="cashout-avail-bal" class="form-helper" style="color: var(--accent-emerald); font-weight: 500; margin-top: 4px;">
          Available: Loading...
        </div>
      </div>

      <!-- Bank Mode Fields -->
      <div id="section-bank-fields">
        <!-- Live FX Quote Summary -->
        <div class="quote-box" id="quote-container">
          <div class="quote-row">
            <span id="q-rate-label">Live FX Rate:</span>
            <span id="q-rate" style="font-weight: 600; color: var(--accent-emerald);">Fetching live rate...</span>
          </div>
          <div class="quote-row">
            <span id="q-gross-label">Gross Payout:</span>
            <span id="q-gross">${country.currencySymbol}0.00</span>
          </div>
          <div class="quote-row">
            <span id="q-fee-label">Sivan Protocol Fee (1%):</span>
            <span id="q-fee">-${country.currencySymbol}0.00</span>
          </div>
          <div class="quote-row">
            <span id="q-net-label">Net Credit to Destination:</span>
            <span id="q-net">${country.currencySymbol}0.00</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="cashout-acct">${isNigeria ? '10-Digit NUBAN Account Number' : country.accountLabel}</label>
          <input 
            type="text" 
            id="cashout-acct" 
            class="form-input" 
            placeholder="${country.accountPlaceholder}" 
            ${isNigeria ? 'maxlength="10" pattern="^\\d{10}$"' : 'maxlength="20"'}
            ${isNigeria ? 'inputmode="numeric"' : ''}
            autocomplete="off"
          />
          <div id="acct-lookup-status" style="font-size: 11px; margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--bg-glass); border: 1px solid var(--border-subtle); color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 8px;">
            <span>${isNigeria ? 'Enter 10-digit account number to auto-verify recipient' : 'Enter mobile money phone number or bank account'}</span>
          </div>
        </div>

        <!-- Destination Bank / Rail for Fiat Corridors (NG, GH, KE) -->
        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="margin-bottom: 0;">${isNigeria ? 'Destination Bank' : `${country.name} Destination`}</label>
            <span style="font-size: 10px; color: var(--accent-emerald); font-weight: 500;">✓ Live Rail Lookup</span>
          </div>

          <!-- Quick Bank / Rail Suggestion Pills -->
          <div class="bank-suggestions-row" id="bank-quick-pills">
            ${quickBanks.map((b, idx) => {
              const logo = b.logoUrl || (isNigeria ? getBankLogoUrl(b.name) : '');
              const pillClass = idx === 0 ? 'class="bank-pill-btn active"' : 'class="bank-pill-btn"';
              return `
                <button type="button" ${pillClass} data-code="${b.code}" data-name="${b.name}" data-logo="${logo}">
                  ${logo ? `<img src="${logo}" alt="${b.name}" class="bank-logo-img" />` : '<span style="font-size: 14px;">📱</span>'}
                  <span>${b.name.replace(' Digital Services', '').replace(' Limited', '').replace(' Bank', '')}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Custom Searchable Bank Selector -->
          <div class="custom-select-wrap" id="bank-select-wrap" style="position: relative;">
            <div class="custom-select-trigger" id="bank-select-trigger" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                ${defaultBank?.logoUrl ? `<img src="${defaultBank.logoUrl}" class="bank-logo-img" id="selected-bank-img" />` : '<span id="selected-bank-icon" style="font-size: 16px;">📱</span>'}
                <span id="selected-bank-name" style="font-weight: 500;">${defaultBank?.name || 'Select Rail'}</span>
              </div>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="bank-select-menu" style="width: 100%; max-height: 250px; overflow: hidden;">
              <div class="bank-search-box">
                <input type="text" id="bank-filter-input" class="bank-search-input" placeholder="🔍 Search ${isGhana ? 'MoMo or bank (MTN, Telecel, GCB...)' : 'bank (GTB, Zenith, OPay, PalmPay...)'}" />
              </div>
              <div class="bank-items-scroll" id="bank-items-container">
                <!-- populated dynamically -->
              </div>
            </div>
            <input type="hidden" id="cashout-bank" value="${defaultBank?.code || ''}" />
          </div>
        </div>
      </div>

      <!-- Sivan User / Wallet Mode Fields -->
      <div id="section-wallet-fields" style="display: none;">
        <div class="form-group">
          <label class="form-label" for="wallet-recipient-input">Recipient (@handle or Celo 0x Address)</label>
          <input 
            type="text" 
            id="wallet-recipient-input" 
            class="form-input" 
            placeholder="e.g. @soliame or 0x4a1A..." 
            autocomplete="off"
          />
          <div id="wallet-recipient-status" style="font-size: 11px; margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--bg-glass); border: 1px solid var(--border-subtle); color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 8px;">
            <span>Enter @handle or 0x address to auto-verify recipient</span>
          </div>
        </div>

        <!-- Transfer Summary Box -->
        <div class="quote-box" id="p2p-summary-box" style="margin-bottom: 16px;">
          <div class="quote-row">
            <span>Settlement Network:</span>
            <span style="font-weight: 600; color: var(--accent-cyan);">Celo Mainnet (Attributed)</span>
          </div>
          <div class="quote-row">
            <span>Sivan Transfer Fee:</span>
            <span id="p2p-fee-display" style="font-weight: 600; color: var(--accent-cyan);">-0.10 USDC (1.00%)</span>
          </div>
          <div class="quote-row">
            <span>Net Recipient Credit:</span>
            <span id="p2p-net-display" style="font-weight: 700; color: var(--accent-emerald);">9.90 USDC</span>
          </div>
          <div class="quote-row">
            <span>Settlement Speed:</span>
            <span id="p2p-speed-display" style="font-weight: 500; color: var(--text-secondary);">Sub-second (Celo Finality)</span>
          </div>
        </div>
      </div>

      <button type="submit" class="btn-primary" id="btn-submit-cashout" style="margin-top: 8px;">
        <span id="submit-btn-text">💸 Confirm Cash Out (Under 1-2 Mins)</span>
      </button>
    </form>
  `;

  // Inject @handle nudge banner for users without a handle (Wallet tab context is key for this)
  const cashoutFormEl = container.querySelector('#form-cashout') as HTMLElement | null;
  injectClaimHandleNudge(container, {
    insertBefore: cashoutFormEl,
    onToast: showToast,
    onClaimed: (username) => {
      showToast(`🎉 Sivan handle set: ${username} — others can send deals & payments to you by name`);
    },
  });

  // Elements
  const tabBankBtn = container.querySelector('#tab-btn-bank') as HTMLButtonElement;
  const tabWalletBtn = container.querySelector('#tab-btn-wallet') as HTMLButtonElement;
  const bannerBank = container.querySelector('#corridor-banner-bank') as HTMLElement;
  const bannerWallet = container.querySelector('#corridor-banner-wallet') as HTMLElement;
  const sectionBankFields = container.querySelector('#section-bank-fields') as HTMLElement;
  const sectionWalletFields = container.querySelector('#section-wallet-fields') as HTMLElement;
  const submitBtnText = container.querySelector('#submit-btn-text') as HTMLElement;

  const amountEl = container.querySelector('#cashout-amount') as HTMLInputElement;
  const tokenHiddenEl = container.querySelector('#cashout-token') as HTMLInputElement;
  const tokenTrigger = container.querySelector('#token-select-trigger') as HTMLElement;
  const tokenMenu = container.querySelector('#token-select-menu') as HTMLElement;
  const tokenDisplay = container.querySelector('#selected-token-display') as HTMLElement;
  const tokenItems = container.querySelectorAll('#token-select-menu .custom-select-item');

  const availEl = container.querySelector('#cashout-avail-bal') as HTMLElement;
  const rateEl = container.querySelector('#q-rate') as HTMLElement;
  const grossEl = container.querySelector('#q-gross') as HTMLElement;
  const feeEl = container.querySelector('#q-fee') as HTMLElement;
  const feeLabelEl = container.querySelector('#q-fee-label') as HTMLElement | null;
  const netEl = container.querySelector('#q-net') as HTMLElement;

  let allBanks: BankItem[] = [];
  const bankHiddenEl = container.querySelector('#cashout-bank') as HTMLInputElement;
  const bankTrigger = container.querySelector('#bank-select-trigger') as HTMLElement | null;
  const bankMenu = container.querySelector('#bank-select-menu') as HTMLElement | null;
  const bankFilterInput = container.querySelector('#bank-filter-input') as HTMLInputElement | null;
  const bankItemsContainer = container.querySelector('#bank-items-container') as HTMLElement | null;
  const selectedBankImg = container.querySelector('#selected-bank-img') as HTMLImageElement | null;
  const selectedBankName = container.querySelector('#selected-bank-name') as HTMLElement | null;
  const quickPills = container.querySelectorAll('.bank-pill-btn');
  const acctEl = container.querySelector('#cashout-acct') as HTMLInputElement;
  const acctStatusEl = container.querySelector('#acct-lookup-status') as HTMLElement;
  const submitBtn = container.querySelector('#btn-submit-cashout') as HTMLButtonElement;

  // P2P Recipient & Summary Elements
  const p2pFeeDisplay = container.querySelector('#p2p-fee-display') as HTMLElement | null;
  const p2pNetDisplay = container.querySelector('#p2p-net-display') as HTMLElement | null;
  const p2pSpeedDisplay = container.querySelector('#p2p-speed-display') as HTMLElement | null;
  const walletRecipientInput = container.querySelector('#wallet-recipient-input') as HTMLInputElement;
  const walletRecipientStatus = container.querySelector('#wallet-recipient-status') as HTMLElement;
  let resolvedP2PAddress: string | null = null;
  let resolvedP2PDisplayName: string | null = null;
  let p2pLookupTimeout: any = null;

  let resolvedRecipientName = '';

  const updateP2PQuoteDisplay = async () => {
    if (activeTab !== 'wallet') return;
    const amt = parseFloat(amountEl.value) || 0;
    const tok = tokenHiddenEl.value || 'USDC';

    if (amt <= 0) {
      if (p2pFeeDisplay) p2pFeeDisplay.textContent = `0.00 ${tok}`;
      if (p2pNetDisplay) p2pNetDisplay.textContent = `0.00 ${tok}`;
      if (p2pSpeedDisplay) p2pSpeedDisplay.textContent = 'Sub-second (Celo Finality)';
      submitBtnText.textContent = '⚡ Send Instantly on Celo (Attributed)';
      return;
    }

    if (p2pSpeedDisplay) {
      p2pSpeedDisplay.textContent = 'Sub-second (Celo Finality)';
    }

    try {
      const quote = await fxQuotesService.fetchTransferFeeQuote(amt, tok, resolvedP2PAddress || undefined);
      const feeFormatted = quote.fee.toFixed(2);
      const netFormatted = quote.netAmount.toFixed(2);
      if (p2pFeeDisplay) {
        p2pFeeDisplay.textContent = `-${feeFormatted} ${tok} (${quote.effectivePercent}%)`;
      }
      if (p2pNetDisplay) {
        p2pNetDisplay.textContent = `${netFormatted} ${tok}`;
      }
      submitBtnText.textContent = `⚡ Send ${netFormatted} ${tok} on Celo (Attributed)`;
    } catch {
      const fallbackFee = Math.max(0.10, Math.round(amt * 0.01 * 100) / 100);
      const fallbackNet = Math.max(0, amt - fallbackFee);
      if (p2pFeeDisplay) {
        p2pFeeDisplay.textContent = `-${fallbackFee.toFixed(2)} ${tok} (1.00%)`;
      }
      if (p2pNetDisplay) {
        p2pNetDisplay.textContent = `${fallbackNet.toFixed(2)} ${tok}`;
      }
      submitBtnText.textContent = `⚡ Send ${fallbackNet.toFixed(2)} ${tok} on Celo (Attributed)`;
    }
  };

  // Tab Switching Logic
  const switchTab = (tab: 'bank' | 'wallet') => {
    activeTab = tab;
    if (tab === 'bank') {
      tabBankBtn.classList.add('active');
      tabWalletBtn.classList.remove('active');
      bannerBank.style.display = 'block';
      bannerWallet.style.display = 'none';
      sectionBankFields.style.display = 'block';
      sectionWalletFields.style.display = 'none';
      submitBtnText.textContent = '💸 Confirm Cash Out (Under 1-2 Mins)';
      acctEl.required = true;
      walletRecipientInput.required = false;
      void updateQuoteDisplay();
    } else {
      tabWalletBtn.classList.add('active');
      tabBankBtn.classList.remove('active');
      bannerBank.style.display = 'none';
      bannerWallet.style.display = 'block';
      sectionBankFields.style.display = 'none';
      sectionWalletFields.style.display = 'block';
      submitBtnText.textContent = '⚡ Send Instantly on Celo (Attributed)';
      acctEl.required = false;
      walletRecipientInput.required = true;
      void updateP2PQuoteDisplay();
    }
  };

  tabBankBtn.addEventListener('click', () => switchTab('bank'));
  tabWalletBtn.addEventListener('click', () => switchTab('wallet'));

  // P2P Recipient Live Resolution
  walletRecipientInput?.addEventListener('input', () => {
    const rawVal = walletRecipientInput.value.trim();
    resolvedP2PAddress = null;
    resolvedP2PDisplayName = null;

    if (p2pLookupTimeout) clearTimeout(p2pLookupTimeout);

    if (!rawVal) {
      walletRecipientStatus.style.background = 'var(--bg-glass)';
      walletRecipientStatus.style.borderColor = 'var(--border-subtle)';
      walletRecipientStatus.innerHTML = '<span>Enter @handle or 0x address to auto-verify recipient</span>';
      return;
    }

    if (/^0x[a-fA-F0-9]{40}$/.test(rawVal)) {
      resolvedP2PAddress = rawVal;
      resolvedP2PDisplayName = `${rawVal.slice(0, 6)}...${rawVal.slice(-4)}`;
      walletRecipientStatus.style.background = 'rgba(16, 185, 129, 0.08)';
      walletRecipientStatus.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      walletRecipientStatus.innerHTML = `
        <div style="color: var(--accent-emerald); font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <span>✓</span> <span>Valid Celo Address: ${resolvedP2PDisplayName}</span>
        </div>
      `;
      return;
    }

    walletRecipientStatus.style.background = 'rgba(6, 182, 212, 0.08)';
    walletRecipientStatus.style.borderColor = 'rgba(6, 182, 212, 0.25)';
    walletRecipientStatus.innerHTML = '<span class="pulse-dot"></span> <span style="color: var(--accent-cyan);">Resolving Sivan identity...</span>';

    p2pLookupTimeout = setTimeout(async () => {
      try {
        const res = await identityService.resolveTarget(rawVal, 'celo');
        if (res.found && res.user) {
          const celoWallet = res.user.wallets?.find(w => w.chain.toLowerCase() === 'celo')?.address ||
                             res.user.targetAddress ||
                             (res.user as any).address;
          if (celoWallet) {
            resolvedP2PAddress = celoWallet;
            resolvedP2PDisplayName = res.user.username ? `@${res.user.username.replace(/^@/, '')}` : res.user.displayName || rawVal;
            walletRecipientStatus.style.background = 'rgba(16, 185, 129, 0.08)';
            walletRecipientStatus.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            walletRecipientStatus.innerHTML = `
              <div style="color: var(--accent-emerald); font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <span>✓</span> <span>Verified Sivan User: ${resolvedP2PDisplayName} (${celoWallet.slice(0, 6)}...${celoWallet.slice(-4)})</span>
              </div>
            `;
            return;
          }
        }
        walletRecipientStatus.style.background = 'rgba(239, 68, 68, 0.08)';
        walletRecipientStatus.style.borderColor = 'rgba(239, 68, 68, 0.25)';
        walletRecipientStatus.innerHTML = '<span style="color: #ef4444;">⚠️ Sivan handle not found. Please verify handle or enter a 0x address.</span>';
      } catch {
        walletRecipientStatus.style.background = 'rgba(239, 68, 68, 0.08)';
        walletRecipientStatus.style.borderColor = 'rgba(239, 68, 68, 0.25)';
        walletRecipientStatus.innerHTML = '<span style="color: #ef4444;">⚠️ Identity resolution unavailable right now.</span>';
      }
    }, 350);
  });

  const renderBankItems = (filterText = '') => {
    if (!bankItemsContainer) return;
    const q = filterText.toLowerCase().trim();
    const filtered = allBanks.filter(b => b.name.toLowerCase().includes(q) || b.code.includes(q));
    if (filtered.length === 0) {
      bankItemsContainer.innerHTML = '<div style="padding: 12px; font-size: 12px; color: var(--text-muted); text-align: center;">No rails found</div>';
      return;
    }
    bankItemsContainer.innerHTML = filtered.map(b => {
      const logo = b.logoUrl || (isNigeria ? getBankLogoUrl(b.name) : '');
      return `
        <div class="custom-select-item bank-item-row" data-code="${b.code}" data-name="${b.name}" data-logo="${logo}">
          ${logo 
            ? `<img src="${logo}" alt="${b.name}" class="bank-logo-img" />` 
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 6px; opacity: 0.8; flex-shrink: 0;"><path d="M12 1.75L2 6.5v2.25h20V6.5L12 1.75zM4.5 11v6.5h2.8V11H4.5zm5.1 0v6.5h2.8V11H9.6zm5.1 0v6.5h2.8V11h-2.8zM2 19.5v2.25h20V19.5H2z"/></svg>`}
          <span style="font-size: 13px; font-weight: 500;">${b.name}</span>
        </div>
      `;
    }).join('');

    bankItemsContainer.querySelectorAll('.bank-item-row').forEach(row => {
      row.addEventListener('click', () => {
        const el = row as HTMLElement;
        selectBank(el.dataset.code!, el.dataset.name!, el.dataset.logo || '');
        bankMenu?.classList.remove('open');
        bankTrigger?.classList.remove('active');
        void checkAccount();
      });
    });
  };

  const selectBank = (code: string, name: string, logo: string) => {
    if (bankHiddenEl) bankHiddenEl.value = code;
    if (selectedBankName) selectedBankName.textContent = name;
    if (selectedBankImg) {
      if (logo) {
        selectedBankImg.src = logo;
        selectedBankImg.style.display = 'inline-block';
      } else {
        selectedBankImg.style.display = 'none';
      }
    }

    quickPills.forEach(p => {
      const el = p as HTMLElement;
      if (el.dataset.code === code) el.classList.add('active');
      else el.classList.remove('active');
    });
  };

  quickPills.forEach(p => {
    p.addEventListener('click', () => {
      const el = p as HTMLElement;
      selectBank(el.dataset.code!, el.dataset.name!, el.dataset.logo || '');
      void checkAccount();
    });
  });

  bankTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!bankMenu) return;
    const isOpen = bankMenu.classList.contains('open');
    if (isOpen) {
      bankMenu.classList.remove('open');
      bankTrigger.classList.remove('active');
    } else {
      bankMenu.classList.add('open');
      bankTrigger.classList.add('active');
      if (bankFilterInput) {
        bankFilterInput.value = '';
        renderBankItems('');
        setTimeout(() => bankFilterInput.focus(), 60);
      }
    }
  });

  bankMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  bankFilterInput?.addEventListener('input', () => {
    renderBankItems(bankFilterInput.value);
  });

  // Only load bank directory for fiat corridors (Nigeria, Ghana, Kenya)
  void fxQuotesService.fetchBanks(country.code).then(banks => {
    allBanks = banks;
    renderBankItems('');
  });

  const updateBalanceDisplay = () => {
    const tok = tokenHiddenEl.value;
    const tokenBal = balances.find(b => b.symbol === tok);
    const balFormatted = tokenBal?.balanceFormatted || '0.00';
    availEl.textContent = state.address 
      ? `Wallet Balance: ${balFormatted} ${tok}`
      : 'Wallet not connected';
  };

  const defaultToken = isNigeria ? 'cNGN' : 'USDC';
  let currentLiveRate: number = isNigeria ? 1.0 : fxQuotesService.getLatestRate(defaultToken, country.code);
  let currentRateSource: string = isNigeria ? 'Parity' : '';
  let currentDepositAddress: string = '';
  let currentQuoteId: string | undefined = undefined;
  let rateDebounceTimer: any = null;

  const updateQuoteDisplay = async () => {
    const amt = parseFloat(amountEl.value) || 0;
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const sym = country.currencySymbol;

    const liveFeePercent = await fxQuotesService.fetchLiveOfframpFeePercent();

    if (token === 'cNGN' && isNigeria) {
      rateEl.textContent = `1 cNGN = ${sym}1.00 (Parity)`;
      const grossOutput = amt;
      const protocolFeeAmount = Math.round(grossOutput * liveFeePercent * 100) / 100;
      const netOutput = Math.max(0, Math.round((grossOutput - protocolFeeAmount) * 100) / 100);

      if (feeLabelEl) {
        const pctLabel = (liveFeePercent * 100).toFixed(liveFeePercent * 100 % 1 === 0 ? 0 : 2);
        feeLabelEl.textContent = `Sivan Protocol Fee (${pctLabel}%):`;
      }
      grossEl.textContent = `${sym}${grossOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      feeEl.textContent = `-${sym}${protocolFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      netEl.textContent = `${sym}${netOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
      return;
    }

    if (currentLiveRate <= 0) {
      rateEl.textContent = `Fetching live ${token} market rate...`;
      grossEl.textContent = `${sym}0.00`;
      feeEl.textContent = `-${sym}0.00`;
      netEl.textContent = `${sym}0.00`;
      return;
    }

    const quote = fxQuotesService.getQuote(amt, token, currentLiveRate, country.code);
    rateEl.textContent = `1 ${token} = ${sym}${currentLiveRate.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${currentRateSource || 'Live Liquidity'})`;

    if (feeLabelEl) {
      const pctLabel = (liveFeePercent * 100).toFixed(liveFeePercent * 100 % 1 === 0 ? 0 : 2);
      feeLabelEl.textContent = `Sivan Protocol Fee (${pctLabel}%):`;
    }
    grossEl.textContent = `${sym}${quote.grossOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    feeEl.textContent = `-${sym}${quote.protocolFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    netEl.textContent = `${sym}${quote.netOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const fetchAndRefreshRate = async () => {
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const amt = parseFloat(amountEl.value) || 10;

    if (token === 'cNGN' && isNigeria) {
      currentLiveRate = 1.0;
      currentRateSource = 'Parity';
      void updateQuoteDisplay();
      return;
    }

    if (currentLiveRate <= 0) {
      rateEl.textContent = `Fetching live ${token} market rate...`;
    }

    try {
      const res = await fxQuotesService.fetchLiveCashoutQuote(
        token,
        amt,
        country.code,
        acctEl?.value?.trim() || undefined,
        bankHiddenEl?.value || undefined
      );
      if (res.rate > 0) {
        currentLiveRate = res.rate;
        currentRateSource = res.source;
        if (res.depositAddress) currentDepositAddress = res.depositAddress;
        if (res.quoteId) currentQuoteId = res.quoteId;
      }
    } catch {
      // retain current cached rate if available
    }
    void updateQuoteDisplay();
  };

  // Dropdown open/close event
  tokenTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = tokenMenu.classList.contains('open');
    if (isOpen) {
      tokenMenu.classList.remove('open');
      tokenTrigger.classList.remove('active');
    } else {
      tokenMenu.classList.add('open');
      tokenTrigger.classList.add('active');
    }
  });

  tokenItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const val = el.dataset.value!;

      tokenHiddenEl.value = val;
      tokenDisplay.innerHTML = `${getTokenIconSvg(val, 16)} <span>${val}</span>`;

      tokenItems.forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');

      tokenMenu.classList.remove('open');
      tokenTrigger.classList.remove('active');

      updateBalanceDisplay();
      void fetchAndRefreshRate();
      void updateP2PQuoteDisplay();
    });
  });

  amountEl?.addEventListener('input', () => {
    void updateQuoteDisplay();
    void updateP2PQuoteDisplay();
    clearTimeout(rateDebounceTimer);
    rateDebounceTimer = setTimeout(() => {
      void fetchAndRefreshRate();
    }, 400);
  });

  updateBalanceDisplay();
  void fetchAndRefreshRate();

  // KYC Status Banner: Live update for Nigeria corridor (non-blocking)
  if (isNigeria && state.address) {
    const kycBanner = container.querySelector('#kyc-status-banner') as HTMLElement | null;
    if (kycBanner) {
      // Wire up click to open verification modal
      kycBanner.addEventListener('click', () => {
        openTextileKycModal(() => {
          if (kycBanner) {
            kycBanner.style.background = 'rgba(16, 185, 129, 0.08)';
            kycBanner.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            kycBanner.style.cursor = 'default';
            kycBanner.innerHTML = `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">✓</span>
                <div>
                  <span style="font-weight: 700; color: var(--accent-emerald); font-size: 11px; display: block;">Identity Verified</span>
                  <span style="color: var(--text-muted); font-size: 11px;">Full bank cashout access enabled via Busha / NIBSS</span>
                </div>
              </div>
              <span style="font-size: 11px; color: var(--accent-emerald); font-weight: 600;">✓ Verified</span>
            `;
          }
        });
      });

      // Check local cache first, then fetch live status in background
      const localKyc = textileKycService.getLocalKycState(state.address);
      const updateBannerForState = (kycState: string | null) => {
        if (!kycBanner) return;
        if (kycState === 'verified') {
          kycBanner.style.background = 'rgba(16, 185, 129, 0.08)';
          kycBanner.style.borderColor = 'rgba(16, 185, 129, 0.25)';
          kycBanner.style.cursor = 'default';
          kycBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">✓</span>
              <div>
                <span style="font-weight: 700; color: var(--accent-emerald); font-size: 11px; display: block;">Identity Verified</span>
                <span style="color: var(--text-muted); font-size: 11px;">Full bank cashout access enabled via Busha / NIBSS</span>
              </div>
            </div>
            <span style="font-size: 11px; color: var(--accent-emerald); font-weight: 600;">✓ Verified</span>
          `;
        } else if (kycState === 'pending') {
          kycBanner.style.background = 'rgba(245, 158, 11, 0.08)';
          kycBanner.style.borderColor = 'rgba(245, 158, 11, 0.25)';
          kycBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">⏳</span>
              <div>
                <span style="font-weight: 700; color: #f59e0b; font-size: 11px; display: block;">Review in Progress</span>
                <span style="color: var(--text-muted); font-size: 11px;">Busha compliance team is reviewing your identity. Usually 1–5 mins.</span>
              </div>
            </div>
            <span style="font-size: 11px; color: #f59e0b; font-weight: 600;">Check →</span>
          `;
        } else {
          kycBanner.style.background = 'rgba(239, 68, 68, 0.08)';
          kycBanner.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          kycBanner.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">🛡️</span>
              <div>
                <span style="font-weight: 700; color: #ef4444; font-size: 11px; display: block;">Identity Verification Required</span>
                <span style="color: var(--text-muted); font-size: 11px;">Tap to verify identity with Busha before cashing out to your bank.</span>
              </div>
            </div>
            <span style="font-size: 11px; color: #ef4444; font-weight: 600;">Verify →</span>
          `;
        }
      };

      if (localKyc?.state) {
        updateBannerForState(localKyc.state);
      }

      // Always refresh KYC status from live API silently
      textileKycService.getKycStatus(state.address).then(res => {
        if (res.kyc?.state) {
          updateBannerForState(res.kyc.state);
        }
      }).catch(() => { /* silent */ });
    }
  }

  // NUBAN live account verification
  const checkAccount = async () => {
    const val = acctEl.value.trim();

    if (isNigeria) {
      const cleanVal = val.replace(/\D/g, '').slice(0, 10);
      acctEl.value = cleanVal;

      if (cleanVal.length === 10) {
        const isPhoneNuban = /^(70|80|81|90|91|07|08|09)/.test(cleanVal);
        if (isPhoneNuban && (!bankHiddenEl.value || bankHiddenEl.value === '000014')) {
          selectBank('100004', 'OPay Digital Services', '/banks/opay.png');
        }

        if (!bankHiddenEl.value) {
          acctStatusEl.style.background = 'rgba(245, 158, 11, 0.08)';
          acctStatusEl.style.borderColor = 'rgba(245, 158, 11, 0.25)';
          acctStatusEl.innerHTML = '<span style="color: #f59e0b;">👆 Please select destination bank to verify recipient</span>';
          return;
        }

        acctStatusEl.style.background = 'rgba(6, 182, 212, 0.08)';
        acctStatusEl.style.borderColor = 'rgba(6, 182, 212, 0.25)';
        acctStatusEl.innerHTML = '<span class="pulse-dot"></span> <span style="color: var(--accent-cyan); font-weight: 500;">Resolving recipient via NIBSS...</span>';
        
        try {
          const res = await fxQuotesService.verifyBankAccount(cleanVal, bankHiddenEl.value, 'NG');
          const currentBank = allBanks.find(b => b.code === bankHiddenEl.value) || 
            country.defaultBanks.find(b => b.code === bankHiddenEl.value);
          const bankDisplayName = currentBank?.name || selectedBankName?.textContent || 'Bank';

          if (res.valid && res.accountName) {
            resolvedRecipientName = res.accountName;
            acctStatusEl.style.background = 'rgba(16, 185, 129, 0.08)';
            acctStatusEl.style.borderColor = 'rgba(16, 185, 129, 0.25)';
            acctStatusEl.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
                <div style="color: var(--accent-emerald); font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                  <span>✓</span> <span>Verified Recipient: ${res.accountName}</span>
                </div>
                <div style="color: var(--text-secondary); font-size: 12px; display: flex; align-items: center; gap: 6px;">
                  <span style="color: var(--accent-emerald);">✓</span> <span>Verified NUBAN: ${cleanVal} (${bankDisplayName})</span>
                </div>
              </div>
            `;
          } else {
            resolvedRecipientName = '';
            acctStatusEl.style.background = 'rgba(239, 68, 68, 0.08)';
            acctStatusEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
            acctStatusEl.innerHTML = '<span style="color: #ef4444; font-size: 12px;">⚠️ Invalid account number or bank rail mismatch. Please verify details.</span>';
          }
        } catch {
          resolvedRecipientName = '';
          acctStatusEl.style.background = 'rgba(239, 68, 68, 0.08)';
          acctStatusEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          acctStatusEl.innerHTML = '<span style="color: #ef4444; font-size: 12px;">⚠️ Could not verify account right now. Check details or try again.</span>';
        }
      } else if (cleanVal.length > 0) {
        resolvedRecipientName = '';
        acctStatusEl.style.background = 'var(--bg-glass)';
        acctStatusEl.style.borderColor = 'var(--border-subtle)';
        acctStatusEl.innerHTML = `<span style="color: var(--text-muted);">${10 - cleanVal.length} more digit${10 - cleanVal.length > 1 ? 's' : ''} needed...</span>`;
      } else {
        resolvedRecipientName = '';
        acctStatusEl.style.background = 'var(--bg-glass)';
        acctStatusEl.style.borderColor = 'var(--border-subtle)';
        acctStatusEl.innerHTML = '<span>Enter 10-digit account number to auto-verify recipient</span>';
      }
    } else {
      // Ghana or Kenya Mobile Money check
      if (val.length >= 9) {
        const res = await fxQuotesService.verifyBankAccount(val, bankHiddenEl?.value || '', country.code);
        const currentBank = allBanks.find(b => b.code === bankHiddenEl?.value) || 
          country.defaultBanks.find(b => b.code === bankHiddenEl?.value);
        const bankDisplayName = currentBank?.name || selectedBankName?.textContent || 'Mobile Money';

        if (res.valid) {
          resolvedRecipientName = res.accountName;
          acctStatusEl.style.background = 'rgba(16, 185, 129, 0.08)';
          acctStatusEl.style.borderColor = 'rgba(16, 185, 129, 0.25)';
          acctStatusEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
              <div style="color: var(--accent-emerald); font-weight: 700; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                <span>✓</span> <span>Verified Recipient: ${res.accountName}</span>
              </div>
              <div style="color: var(--text-secondary); font-size: 12px; display: flex; align-items: center; gap: 6px;">
                <span style="color: var(--accent-emerald);">✓</span> <span>Verified Destination: ${val} (${bankDisplayName})</span>
              </div>
            </div>
          `;
        } else {
          resolvedRecipientName = '';
          acctStatusEl.style.background = 'rgba(239, 68, 68, 0.08)';
          acctStatusEl.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          acctStatusEl.innerHTML = `<span style="color: #ef4444; font-size: 12px;">⚠️ Invalid recipient number for ${country.name}.</span>`;
        }
      } else if (val.length > 0) {
        resolvedRecipientName = '';
        acctStatusEl.style.background = 'var(--bg-glass)';
        acctStatusEl.style.borderColor = 'var(--border-subtle)';
        acctStatusEl.innerHTML = '<span style="color: var(--text-muted);">Enter full account or MoMo phone number...</span>';
      } else {
        resolvedRecipientName = '';
        acctStatusEl.style.background = 'var(--bg-glass)';
        acctStatusEl.style.borderColor = 'var(--border-subtle)';
        acctStatusEl.innerHTML = `<span>Enter ${country.name} recipient number</span>`;
      }
    }
  };

  acctEl?.addEventListener('input', checkAccount);
  container.querySelector('#btn-back-cashout')?.addEventListener('click', () => onNavigate('dashboard'));

  const form = container.querySelector('#form-cashout') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.address) {
      showToast('⚠️ Please connect your wallet first.');
      return;
    }

    const amt = parseFloat(amountEl.value);
    const tok = tokenHiddenEl.value;

    if (!amt || amt <= 0) {
      showToast('⚠️ Please enter a valid transfer amount.');
      return;
    }

    const tokenBal = balances.find(b => b.symbol === tok);
    const availableNum = tokenBal ? parseFloat(tokenBal.balanceFormatted.replace(/,/g, '')) : 0;

    if (amt > availableNum) {
      showToast(`⚠️ Insufficient ${tok} balance. Available: ${availableNum} ${tok}`);
      return;
    }

    if (activeTab === 'wallet') {
      // P2P Transfer Mode
      if (!resolvedP2PAddress) {
        showToast('⚠️ Please specify a valid @handle or Celo address.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⚡ Quoting & Signing Celo Transfer...</span>';

      try {
        const quote = await fxQuotesService.fetchTransferFeeQuote(amt, tok, resolvedP2PAddress);
        const feeAmount = quote.fee;
        const netAmount = quote.netAmount;
        const targetFeeWallet = ((quote.feeWallet as `0x${string}`) || (getActiveNetwork().feeWallet as `0x${string}`) || (getSivanFeeWallet() as `0x${string}`));

        submitBtn.innerHTML = '<span>⚡ Confirming Transfer in Wallet...</span>';

        const txRes = await miniPayService.sendAttributedTransfer({
          to: resolvedP2PAddress as `0x${string}`,
          amount: netAmount,
          currency: tok as SupportedTokenSymbol,
          feeAmount,
          feeWallet: targetFeeWallet,
          onProgress: (step) => {
            if (step === 'fee') {
              submitBtn.innerHTML = '<span>⚡ Confirming Protocol Fee to Sivan Wallet...</span>';
            }
          },
        });

        if (!txRes.success || !txRes.txHash) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = `<span>⚡ Send ${netAmount.toFixed(2)} ${tok} on Celo (Attributed)</span>`;
          showToast(`❌ ${txRes.error || 'Transfer cancelled in wallet'}`);
          return;
        }

        // Record P2P Transfer in Transaction History with verified fee collection
        transactionsService.recordTransfer({
          amount: txRes.feeTxHash ? amt : netAmount,
          token: tok,
          feeAmount: txRes.feeTxHash ? feeAmount : 0,
          netAmount,
          feeTxHash: txRes.feeTxHash,
          feeWallet: targetFeeWallet,
          recipientIdentifier: resolvedP2PDisplayName || resolvedP2PAddress,
          recipientAddress: resolvedP2PAddress,
          txHash: txRes.txHash,
        });

        submitBtn.innerHTML = '<span>🚀 Transfer Dispatched...</span>';
        const feeNote = txRes.feeTxHash ? ' · Fee settled ✓' : '';
        showToast(`🎉 Transfer confirmed! Tx: ${txRes.txHash.slice(0, 10)}... Sent ${netAmount.toFixed(2)} ${tok} to ${resolvedP2PDisplayName}${feeNote}!`);

        setTimeout(() => {
          onNavigate('history');
        }, 1500);
      } catch (err: any) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>⚡ Send Instantly on Celo (Attributed)</span>';
        showToast(`❌ Transfer error: ${err.message || 'Execution failed'}`);
      }
      return;
    }

    // Bank Cash Out Mode
    const acctNum = acctEl.value.trim();
    if (isNigeria && acctNum.length !== 10) {
      showToast('⚠️ Please enter a valid 10-digit NUBAN account number.');
      return;
    } else if (!isNigeria && acctNum.length < 9) {
      showToast(`⚠️ Please enter a valid ${country.name} account or phone number.`);
      return;
    }

    const bankName = selectedBankName?.textContent || 'Destination Rail';
    const bankCode = bankHiddenEl.value || '';

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⚡ Signing Celo Transfer...</span>';

    try {
      // Dynamic deposit address from live quote or registered settlement wallet
      let targetDepositAddress = currentDepositAddress;
      let targetQuoteId = currentQuoteId;

      if (!targetDepositAddress) {
        try {
          const freshQuote = await fxQuotesService.fetchLiveCashoutQuote(
            tok as any,
            amt,
            country.code,
            acctNum,
            bankCode
          );
          if (freshQuote.depositAddress) targetDepositAddress = freshQuote.depositAddress;
          if (freshQuote.quoteId) targetQuoteId = freshQuote.quoteId;
          if (freshQuote.rate > 0) currentLiveRate = freshQuote.rate;
        } catch {
          // ignore
        }
      }

      if (!targetDepositAddress) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>💸 Confirm Cash Out (Under 1-2 Mins)</span>';
        showToast('⚠️ Off-ramp liquidity deposit address unavailable. Please retry.');
        return;
      }

      const destinationAddress = targetDepositAddress as `0x${string}`;

      const txRes = await miniPayService.sendAttributedTransfer({
        to: destinationAddress,
        amount: amt,
        currency: tok as SupportedTokenSymbol,
      });

      if (!txRes.success || !txRes.txHash) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>💸 Confirm Cash Out (Under 1-2 Mins)</span>';
        showToast(`❌ ${txRes.error || 'Transfer cancelled in wallet'}`);
        return;
      }

      submitBtn.innerHTML = '<span>⚡ Dispatching NIBSS Bank Payout...</span>';

      // Live backend execution: Notify Sivan payment gateway to trigger Textile/Busha NIBSS payout
      try {
        await fxQuotesService.executeCashout({
          quoteId: targetQuoteId,
          celoTxHash: txRes.txHash,
          token: tok,
          amount: amt,
          bankAccount: acctNum,
          bankCode: bankCode,
          senderAddress: state.address || undefined,
        });
      } catch (execErr: any) {
        console.warn('Backend payout execution notification logged:', execErr?.message || execErr);
      }

      const effectiveQuote = fxQuotesService.getQuote(amt, tok as any, currentLiveRate > 0 ? currentLiveRate : undefined, country.code);

      // Record transaction into user's persistent Transaction History ledger
      transactionsService.recordCashout({
        sourceAmount: amt,
        sourceToken: tok,
        targetAmount: effectiveQuote.netOutput,
        targetCurrency: country.currency,
        targetCurrencySymbol: country.currencySymbol,
        recipientAccount: acctNum,
        recipientName: resolvedRecipientName || bankName,
        bankOrRailName: bankName,
        countryCode: country.code,
        txHash: txRes.txHash,
      });

      submitBtn.innerHTML = '<span>🚀 Off-Ramp Dispatched...</span>';
      showToast(`✅ Celo Tx Confirmed: ${txRes.txHash.slice(0, 8)}... Payout dispatched to ${bankName}. Credit typically in 1-2 mins!`);

      setTimeout(() => {
        onNavigate('history');
      }, 1500);
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>💸 Confirm Cash Out (Under 1-2 Mins)</span>';
      showToast(`❌ Transfer error: ${err.message || 'Execution failed'}`);
    }
  });
}
