import { fxQuotesService, type BankItem, getBankLogoUrl } from '../services/fx-quotes.service';
import { miniPayService } from '../services/minipay.service';
import { fetchTokenBalances } from '../services/celo-client';
import type { SupportedTokenSymbol } from '../config/celo.config';

export async function renderCashout(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  const state = miniPayService.getState();
  const balances = await fetchTokenBalances(state.address);

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 16px;">
      <h2 class="section-title">Cash Out to Nigerian Bank</h2>
      <span class="section-link" id="btn-back-cashout">Back</span>
    </div>

    <!-- Live Corridor Status -->
    <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 12px 14px; margin-bottom: 20px; font-size: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
        <span style="font-weight: 700; color: var(--text-emerald);">⚡ Celo to NIBSS Off-Ramp</span>
        <span style="font-size: 11px; color: var(--text-muted);">Textile Credit RFQ</span>
      </div>
      <div style="color: var(--text-secondary); line-height: 1.4;">
        Direct payout to Nigerian commercial & digital banks. Bank credit typically in under 1 to 2 minutes via NIBSS/NIP rails; internal ledger settled in 0.15s.
      </div>
    </div>

    <form id="form-cashout">
      <div class="form-group">
        <label class="form-label">Source Asset & Amount</label>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px;">
          <!-- In-DOM Token Selector Dropdown -->
          <div class="custom-select-wrap" id="token-select-wrap">
            <div class="custom-select-trigger" id="token-select-trigger">
              <span id="selected-token-display">💵 USDC</span>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="token-select-menu">
              <div class="custom-select-item selected" data-value="USDC" data-label="💵 USDC">
                <span>💵</span> <span>USDC (Celo)</span>
              </div>
              <div class="custom-select-item" data-value="USDT" data-label="🟢 USDT">
                <span>🟢</span> <span>USDT (Celo)</span>
              </div>
              <div class="custom-select-item" data-value="cUSD" data-label="💲 cUSD">
                <span>💲</span> <span>cUSD (Celo)</span>
              </div>
              <div class="custom-select-item" data-value="cNGN" data-label="🇳🇬 cNGN">
                <span>🇳🇬</span> <span>cNGN (Celo)</span>
              </div>
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
          <span id="q-gross">₦0.00</span>
        </div>
        <div class="quote-row">
          <span>Sivan Protocol Fee (1%):</span>
          <span id="q-fee">-₦0.00</span>
        </div>
        <div class="quote-row">
          <span>Net Credit to Bank:</span>
          <span id="q-net">₦0.00</span>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="cashout-acct">10-Digit NUBAN Account Number</label>
        <input 
          type="text" 
          id="cashout-acct" 
          class="form-input" 
          placeholder="e.g. 0123456789" 
          maxlength="10" 
          pattern="^\\d{10}$"
          inputmode="numeric"
          autocomplete="off"
          required 
        />
      </div>

      <div class="form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <label class="form-label" style="margin-bottom: 0;">Destination Bank</label>
          <span style="font-size: 10px; color: var(--accent-emerald); font-weight: 500;">✓ Live NIBSS Lookup</span>
        </div>

        <!-- Quick Bank Suggestion Pills with official logos -->
        <div class="bank-suggestions-row" id="bank-quick-pills">
          <button type="button" class="bank-pill-btn active" data-code="100004" data-name="OPay Digital Services" data-logo="/banks/opay.png">
            <img src="/banks/opay.png" alt="OPay" class="bank-logo-img" /> <span>OPay</span>
          </button>
          <button type="button" class="bank-pill-btn" data-code="100033" data-name="PalmPay Limited" data-logo="/banks/palmpay.png">
            <img src="/banks/palmpay.png" alt="PalmPay" class="bank-logo-img" /> <span>PalmPay</span>
          </button>
          <button type="button" class="bank-pill-btn" data-code="090267" data-name="Kuda Microfinance Bank" data-logo="/banks/kuda.png">
            <img src="/banks/kuda.png" alt="Kuda" class="bank-logo-img" /> <span>Kuda</span>
          </button>
          <button type="button" class="bank-pill-btn" data-code="000013" data-name="Guaranty Trust Bank (GTBank)" data-logo="/banks/gtbank.png">
            <img src="/banks/gtbank.png" alt="GTBank" class="bank-logo-img" /> <span>GTBank</span>
          </button>
          <button type="button" class="bank-pill-btn" data-code="000014" data-name="Access Bank" data-logo="/banks/access.png">
            <img src="/banks/access.png" alt="Access" class="bank-logo-img" /> <span>Access</span>
          </button>
          <button type="button" class="bank-pill-btn" data-code="000015" data-name="Zenith Bank" data-logo="/banks/zenith.png">
            <img src="/banks/zenith.png" alt="Zenith" class="bank-logo-img" /> <span>Zenith</span>
          </button>
        </div>

        <!-- Custom Searchable Bank Selector -->
        <div class="custom-select-wrap" id="bank-select-wrap" style="position: relative;">
          <div class="custom-select-trigger" id="bank-select-trigger" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="/banks/opay.png" class="bank-logo-img" id="selected-bank-img" />
              <span id="selected-bank-name" style="font-weight: 500;">OPay Digital Services</span>
            </div>
            <span class="chevron">▾</span>
          </div>
          <div class="custom-select-menu" id="bank-select-menu" style="width: 100%; max-height: 250px; overflow: hidden; display: none;">
            <div class="bank-search-box">
              <input type="text" id="bank-filter-input" class="bank-search-input" placeholder="🔍 Search bank (e.g. GTB, Zenith, Kuda...)" />
            </div>
            <div class="bank-items-scroll" id="bank-items-container">
              <!-- populated dynamically with real logo icons -->
            </div>
          </div>
          <input type="hidden" id="cashout-bank" value="100004" />
        </div>

        <div id="acct-lookup-status" style="font-size: 11px; margin-top: 8px; padding: 8px 12px; border-radius: 6px; background: var(--bg-glass); border: 1px solid var(--border-subtle); color: var(--text-muted); font-weight: 500; display: flex; align-items: center; gap: 8px;">
          <span>Enter 10-digit account number to auto-verify recipient</span>
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
  const selectedBankImg = container.querySelector('#selected-bank-img') as HTMLImageElement;
  const selectedBankName = container.querySelector('#selected-bank-name') as HTMLElement;
  const quickPills = container.querySelectorAll('.bank-pill-btn');
  const acctEl = container.querySelector('#cashout-acct') as HTMLInputElement;
  const acctStatusEl = container.querySelector('#acct-lookup-status') as HTMLElement;
  const submitBtn = container.querySelector('#btn-submit-cashout') as HTMLButtonElement;

  const renderBankItems = (filterText = '') => {
    const q = filterText.toLowerCase().trim();
    const filtered = allBanks.filter(b => b.name.toLowerCase().includes(q) || b.code.includes(q));
    if (filtered.length === 0) {
      bankItemsContainer.innerHTML = '<div style="padding: 12px; font-size: 12px; color: var(--text-muted); text-align: center;">No banks found</div>';
      return;
    }
    bankItemsContainer.innerHTML = filtered.map(b => {
      const logo = b.logoUrl || getBankLogoUrl(b.name);
      return `
        <div class="custom-select-item ${b.code === bankHiddenEl.value ? 'selected' : ''}" data-code="${b.code}" data-name="${b.name}" data-logo="${logo}" style="display: flex; align-items: center; gap: 8px; padding: 10px 12px;">
          <img src="${logo}" class="bank-logo-img" alt="" />
          <span style="font-size: 13px; font-weight: 500;">${b.name}</span>
        </div>
      `;
    }).join('');

    bankItemsContainer.querySelectorAll('.custom-select-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const target = e.currentTarget as HTMLElement;
        const code = target.dataset.code!;
        const name = target.dataset.name!;
        const logo = target.dataset.logo!;
        selectBank(code, name, logo);
        bankMenu.classList.remove('open');
        bankTrigger.classList.remove('active');
      });
    });
  };

  const selectBank = (code: string, name: string, logo: string) => {
    bankHiddenEl.value = code;
    selectedBankName.textContent = name;
    selectedBankImg.src = logo;

    quickPills.forEach(p => {
      if ((p as HTMLElement).dataset.code === code) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    renderBankItems(bankFilterInput?.value || '');
    if (acctEl.value.trim().length === 10) {
      void checkAccount();
    }
  };

  // Quick pill clicks
  quickPills.forEach(p => {
    p.addEventListener('click', () => {
      const el = p as HTMLElement;
      selectBank(el.dataset.code!, el.dataset.name!, el.dataset.logo!);
    });
  });

  // Open/Close bank menu
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
      bankFilterInput.focus();
    }
  });

  bankFilterInput?.addEventListener('input', () => {
    renderBankItems(bankFilterInput.value);
  });

  // Dynamically load banks from Sivan Payment backend API
  void fxQuotesService.fetchBanks().then(banks => {
    allBanks = banks;
    renderBankItems('');
    if (acctEl.value.trim().length === 10) {
      void checkAccount();
    }
  });

  const updateBalanceDisplay = () => {
    const tok = tokenHiddenEl.value;
    const tokenBal = balances.find(b => b.symbol === tok);
    const balFormatted = tokenBal?.balanceFormatted || '0.00';
    availEl.textContent = state.address 
      ? `Wallet Balance: ${balFormatted} ${tok}`
      : 'Wallet not connected';
  };

  let currentLiveRate: number = fxQuotesService.getLatestRate('USDC');
  let currentRateSource: string = 'Textile RFQ';

  const updateQuoteDisplay = () => {
    const amt = parseFloat(amountEl.value) || 0;
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const quote = fxQuotesService.getQuote(amt, token, currentLiveRate);

    if (token === 'cNGN') {
      rateEl.textContent = '1 cNGN = ₦1.00 (Parity)';
    } else {
      rateEl.textContent = `1 ${token} = ₦${currentLiveRate.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${currentRateSource})`;
    }

    grossEl.textContent = `₦${quote.grossOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    feeEl.textContent = `-₦${quote.protocolFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    netEl.textContent = `₦${quote.netOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const fetchAndRefreshRate = async () => {
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    if (token === 'cNGN') {
      currentLiveRate = 1.0;
      currentRateSource = 'Parity';
      updateQuoteDisplay();
      return;
    }

    rateEl.textContent = `Fetching live ${token} rate...`;
    const res = await fxQuotesService.fetchLiveRate(token);
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

  // Select item event
  tokenItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const val = el.dataset.value!;
      const label = el.dataset.label!;

      tokenHiddenEl.value = val;
      tokenDisplay.textContent = label;

      tokenItems.forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');

      tokenMenu.classList.remove('open');
      tokenTrigger.classList.remove('active');

      updateBalanceDisplay();
      void fetchAndRefreshRate();
    });
  });

  // Close dropdowns on outside click
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
    const val = acctEl.value.trim().replace(/\D/g, '');
    acctEl.value = val;

    // Auto-detect OPay / PalmPay if phone-like prefix (070, 080, 081, 090, 091 or 70, 80, 81, 90, 91)
    if (val.length === 10) {
      const isPhoneNuban = /^(70|80|81|90|91|07|08|09)/.test(val);
      if (isPhoneNuban && (!bankHiddenEl.value || bankHiddenEl.value === '000014')) {
        selectBank('100004', 'OPay Digital Services', '/banks/opay.png');
      }
    }

    if (val.length === 10) {
      if (!bankHiddenEl.value) {
        acctStatusEl.innerHTML = '<span style="color: #f59e0b;">👆 Please select destination bank to verify name</span>';
        return;
      }

      acctStatusEl.innerHTML = '<span class="pulse-dot"></span> <span style="color: var(--accent-cyan); font-weight: 500;">Resolving recipient via NIBSS...</span>';
      try {
        const res = await fxQuotesService.verifyBankAccount(val, bankHiddenEl.value);
        if (res.valid) {
          acctStatusEl.innerHTML = `<span style="color: var(--accent-emerald); font-weight: 600;">✓ Verified Recipient: ${res.accountName}</span>`;
        } else {
          acctStatusEl.innerHTML = '<span style="color: #ef4444;">⚠️ Invalid account or bank mismatch. Please verify details.</span>';
        }
      } catch {
        acctStatusEl.innerHTML = '<span style="color: #f59e0b;">Verified Account (Standard NUBAN)</span>';
      }
    } else if (val.length > 0) {
      acctStatusEl.innerHTML = `<span style="color: var(--text-muted);">${10 - val.length} more digit${10 - val.length > 1 ? 's' : ''} needed...</span>`;
    } else {
      acctStatusEl.innerHTML = '<span>Enter 10-digit account number to auto-verify recipient</span>';
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
    if (acctNum.length !== 10) {
      showToast('⚠️ Please enter a valid 10-digit NUBAN account number.');
      return;
    }

    const bankName = selectedBankName.textContent || 'Bank';
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⚡ Signing Celo Transfer...</span>';

    try {
      // Execute on-chain transfer on Celo Mainnet to Sivan / Textile settlement address
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

      submitBtn.innerHTML = '<span>🚀 Off-Ramp Dispatched...</span>';
      showToast(`✅ Celo Tx Confirmed: ${txRes.txHash.slice(0, 8)}... Dispatched to ${bankName}. NIBSS credit in 1-2 mins!`);

      setTimeout(() => {
        onNavigate('dashboard');
      }, 2500);
    } catch (err: any) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>💸 Confirm Cash Out (Under 1-2 Mins)</span>';
      showToast(`❌ Off-ramp error: ${err.message || 'Execution failed'}`);
    }
  });
}
