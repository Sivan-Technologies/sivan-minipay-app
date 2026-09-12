import { fxQuotesService, type BankItem, getBankLogoUrl } from '../services/fx-quotes.service';
import { miniPayService } from '../services/minipay.service';
import { fetchTokenBalances } from '../services/celo-client';
import { countryService } from '../config/countries.config';
import { transactionsService } from '../services/transactions.service';
import type { SupportedTokenSymbol } from '../config/celo.config';
import { getTokenIconSvg } from '../utils/token-icons';

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
  const quickBanks = country.defaultBanks.slice(0, 6);
  const defaultBank = quickBanks[0];

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 16px;">
      <h2 class="section-title">Cash Out to ${country.name} (${country.currency})</h2>
      <span class="section-link" id="btn-back-cashout">Back</span>
    </div>

    <!-- Live Corridor Status -->
    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 20px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 700; color: var(--text-emerald);">${corridorTitle}</span>
        <span style="font-size: 11px; color: var(--text-muted);">${corridorProvider}</span>
      </div>
      <div style="color: var(--text-secondary); line-height: 1.4;">
        ${country.settlementDescription}
      </div>
    </div>

    <form id="form-cashout">
      <div class="form-group">
        <label class="form-label">Source Asset & Amount</label>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px;">
          <!-- In-DOM Token Selector Dropdown -->
          <div class="custom-select-wrap" id="token-select-wrap">
            <div class="custom-select-trigger" id="token-select-trigger">
              <span id="selected-token-display" style="display: inline-flex; align-items: center; gap: 6px;">${getTokenIconSvg('USDC', 16)} <span>USDC</span></span>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="token-select-menu">
              <div class="custom-select-item selected" data-value="USDC" style="display: flex; align-items: center; gap: 8px;">
                ${getTokenIconSvg('USDC', 16)} <span>USDC (Celo)</span>
              </div>
              <div class="custom-select-item" data-value="USDT" style="display: flex; align-items: center; gap: 8px;">
                ${getTokenIconSvg('USDT', 16)} <span>USDT (Celo)</span>
              </div>
              <div class="custom-select-item" data-value="cUSD" style="display: flex; align-items: center; gap: 8px;">
                ${getTokenIconSvg('cUSD', 16)} <span>cUSD (Celo)</span>
              </div>
              ${isNigeria ? `
                <div class="custom-select-item" data-value="cNGN" style="display: flex; align-items: center; gap: 8px;">
                  ${getTokenIconSvg('cNGN', 16)} <span>cNGN (Celo)</span>
                </div>
              ` : ''}
            </div>
            <input type="hidden" id="cashout-token" value="USDC" />
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

      <!-- Live FX Quote Summary -->
      <div class="quote-box" id="quote-container">
        <div class="quote-row">
          <span>Live FX Rate:</span>
          <span id="q-rate" style="font-weight: 600; color: var(--accent-emerald);">Fetching live rate...</span>
        </div>
        <div class="quote-row">
          <span>Gross Payout:</span>
          <span id="q-gross">${country.currencySymbol}0.00</span>
        </div>
        <div class="quote-row">
          <span>Sivan Protocol Fee (1%):</span>
          <span id="q-fee">-${country.currencySymbol}0.00</span>
        </div>
        <div class="quote-row">
          <span>Net Credit to Destination:</span>
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
          ${isNigeria ? 'maxlength="10" pattern="^\\d{10}$"' : 'maxlength="15"'}
          inputmode="numeric"
          autocomplete="off"
          required 
        />
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="margin-bottom: 0;">${isNigeria ? 'Destination Bank' : `${country.name} Destination Bank / MoMo`}</label>
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

        <div id="acct-lookup-status" style="font-size: 11px; margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--bg-glass); border: 1px solid var(--border-subtle); color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 8px;">
          <span>${isNigeria ? 'Enter 10-digit account number to auto-verify recipient' : 'Enter mobile money phone number or bank account'}</span>
        </div>
      </div>

      <button type="submit" class="btn-primary" id="btn-submit-cashout" style="margin-top: 8px;">
        <span>💸 Confirm Cash Out (Under 1-2 Mins)</span>
      </button>
    </form>
  `;

  const amountEl = container.querySelector('#cashout-amount') as HTMLInputElement;
  const tokenHiddenEl = container.querySelector('#cashout-token') as HTMLInputElement;
  const tokenTrigger = container.querySelector('#token-select-trigger') as HTMLElement;
  const tokenMenu = container.querySelector('#token-select-menu') as HTMLElement;
  const tokenDisplay = container.querySelector('#selected-token-display') as HTMLElement;
  const tokenItems = container.querySelectorAll('.custom-select-item');

  const availEl = container.querySelector('#cashout-avail-bal') as HTMLElement;
  const rateEl = container.querySelector('#q-rate') as HTMLElement;
  const grossEl = container.querySelector('#q-gross') as HTMLElement;
  const feeEl = container.querySelector('#q-fee') as HTMLElement;
  const netEl = container.querySelector('#q-net') as HTMLElement;
  let allBanks: BankItem[] = [];
  const bankHiddenEl = container.querySelector('#cashout-bank') as HTMLInputElement;
  const bankTrigger = container.querySelector('#bank-select-trigger') as HTMLElement;
  const bankMenu = container.querySelector('#bank-select-menu') as HTMLElement;
  const bankFilterInput = container.querySelector('#bank-filter-input') as HTMLInputElement;
  const bankItemsContainer = container.querySelector('#bank-items-container') as HTMLElement;
  const selectedBankImg = container.querySelector('#selected-bank-img') as HTMLImageElement | null;
  const selectedBankName = container.querySelector('#selected-bank-name') as HTMLElement;
  const quickPills = container.querySelectorAll('.bank-pill-btn');
  const acctEl = container.querySelector('#cashout-acct') as HTMLInputElement;
  const acctStatusEl = container.querySelector('#acct-lookup-status') as HTMLElement;
  const submitBtn = container.querySelector('#btn-submit-cashout') as HTMLButtonElement;

  let resolvedRecipientName = '';

  const renderBankItems = (filterText = '') => {
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
        bankMenu.classList.remove('open');
        bankTrigger.classList.remove('active');
        void checkAccount();
      });
    });
  };

  const selectBank = (code: string, name: string, logo: string) => {
    bankHiddenEl.value = code;
    selectedBankName.textContent = name;
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
    const isOpen = bankMenu.classList.contains('open');
    if (isOpen) {
      bankMenu.classList.remove('open');
      bankTrigger.classList.remove('active');
    } else {
      bankMenu.classList.add('open');
      bankTrigger.classList.add('active');
      bankFilterInput.value = '';
      renderBankItems('');
      setTimeout(() => bankFilterInput?.focus(), 60);
    }
  });

  bankMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  bankFilterInput?.addEventListener('input', () => {
    renderBankItems(bankFilterInput.value);
  });

  // Load banks/rails for active country
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

  let currentLiveRate: number = fxQuotesService.getLatestRate('USDC', country.code);
  let currentRateSource: string = `${country.name} Liquidity`;

  const updateQuoteDisplay = () => {
    const amt = parseFloat(amountEl.value) || 0;
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const quote = fxQuotesService.getQuote(amt, token, currentLiveRate, country.code);

    const sym = country.currencySymbol;

    if (token === 'cNGN' && isNigeria) {
      rateEl.textContent = `1 cNGN = ${sym}1.00 (Parity)`;
    } else {
      rateEl.textContent = `1 ${token} = ${sym}${currentLiveRate.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${currentRateSource})`;
    }

    grossEl.textContent = `${sym}${quote.grossOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    feeEl.textContent = `-${sym}${quote.protocolFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    netEl.textContent = `${sym}${quote.netOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const fetchAndRefreshRate = async () => {
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    if (token === 'cNGN' && isNigeria) {
      currentLiveRate = 1.0;
      currentRateSource = 'Parity';
      updateQuoteDisplay();
      return;
    }

    rateEl.textContent = `Fetching live ${token} rate...`;
    const res = await fxQuotesService.fetchLiveRate(token, 10, country.code);
    currentLiveRate = res.rate;
    currentRateSource = res.source;
    updateQuoteDisplay();
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
    });
  });

  document.addEventListener('click', () => {
    tokenMenu?.classList.remove('open');
    tokenTrigger?.classList.remove('active');
    bankMenu?.classList.remove('open');
    bankTrigger?.classList.remove('active');
  });

  updateBalanceDisplay();
  void fetchAndRefreshRate();

  amountEl?.addEventListener('input', updateQuoteDisplay);

  const checkAccount = async () => {
    const val = acctEl.value.trim();

    if (isNigeria) {
      const cleanVal = val.replace(/\D/g, '');
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
          const bankDisplayName = currentBank?.name || selectedBankName.textContent || 'Bank';

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
        const res = await fxQuotesService.verifyBankAccount(val, bankHiddenEl.value, country.code);
        const currentBank = allBanks.find(b => b.code === bankHiddenEl.value) || 
          country.defaultBanks.find(b => b.code === bankHiddenEl.value);
        const bankDisplayName = currentBank?.name || selectedBankName.textContent || 'Mobile Money';

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
      showToast('⚠️ Please enter a valid cashout amount.');
      return;
    }

    const tokenBal = balances.find(b => b.symbol === tok);
    const availableNum = tokenBal ? parseFloat(tokenBal.balanceFormatted.replace(/,/g, '')) : 0;

    if (amt > availableNum) {
      showToast(`⚠️ Insufficient ${tok} balance. Available: ${availableNum} ${tok}`);
      return;
    }

    const acctNum = acctEl.value.trim();
    if (isNigeria && acctNum.length !== 10) {
      showToast('⚠️ Please enter a valid 10-digit NUBAN account number.');
      return;
    }

    if (!isNigeria && acctNum.length < 9) {
      showToast(`⚠️ Please enter a valid ${country.name} account or phone number.`);
      return;
    }

    const bankName = selectedBankName.textContent || 'Destination Rail';
    const quote = fxQuotesService.getQuote(amt, tok as any, currentLiveRate, country.code);

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⚡ Signing Celo Transfer...</span>';

    try {
      // Execute on-chain transfer on Celo Mainnet to registered Agent wallet
      const txRes = await miniPayService.sendAttributedTransfer({
        to: '0x4a1A9cf30A86b2b333D1a743181aAE71a50BAFBc',
        amount: amt,
        currency: tok as SupportedTokenSymbol,
      });

      if (!txRes.success || !txRes.txHash) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>💸 Confirm Cash Out (Under 1-2 Mins)</span>';
        showToast(`❌ ${txRes.error || 'Transfer cancelled in wallet'}`);
        return;
      }

      // Record transaction into user's persistent Transaction History ledger
      transactionsService.recordCashout({
        sourceAmount: amt,
        sourceToken: tok,
        targetAmount: quote.netOutput,
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
      }, 2000);
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>💸 Confirm Cash Out (Under 1-2 Mins)</span>';
      showToast(`❌ Off-ramp error: ${err.message || 'Execution failed'}`);
    }
  });
}
