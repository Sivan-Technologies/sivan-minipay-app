import { fxQuotesService, NIGERIAN_BANKS, CURRENT_USDC_NGN_RATE } from '../services/fx-quotes.service';
import { miniPayService } from '../services/minipay.service';
import { fetchTokenBalances } from '../services/celo-client';

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
              <span id="selected-token-display">🟢 USDT</span>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="token-select-menu">
              <div class="custom-select-item selected" data-value="USDT" data-label="🟢 USDT">
                <span>🟢</span> <span>USDT (Celo)</span>
              </div>
              <div class="custom-select-item" data-value="USDC" data-label="💵 USDC">
                <span>💵</span> <span>USDC (Celo)</span>
              </div>
              <div class="custom-select-item" data-value="cUSD" data-label="💲 cUSD">
                <span>💲</span> <span>cUSD (Celo)</span>
              </div>
              <div class="custom-select-item" data-value="cNGN" data-label="🇳🇬 cNGN">
                <span>🇳🇬</span> <span>cNGN (Celo)</span>
              </div>
            </div>
            <input type="hidden" id="cashout-token" value="USDT" />
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
          <span id="q-rate">1 USDT = ₦${CURRENT_USDC_NGN_RATE.toLocaleString()}</span>
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
        <label class="form-label" for="cashout-bank">Destination Bank</label>
        <select id="cashout-bank" class="form-select">
          ${NIGERIAN_BANKS.map(b => `<option value="${b.code}">${b.name}</option>`).join('')}
        </select>
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
          required 
        />
        <div id="acct-lookup-status" style="font-size: 11px; margin-top: 5px; color: var(--text-muted); font-weight: 500;">
          Enter 10-digit account number for instant verification
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
  const bankEl = container.querySelector('#cashout-bank') as HTMLSelectElement;
  const acctEl = container.querySelector('#cashout-acct') as HTMLInputElement;
  const acctStatusEl = container.querySelector('#acct-lookup-status') as HTMLElement;
  const submitBtn = container.querySelector('#btn-submit-cashout') as HTMLButtonElement;

  const updateBalanceDisplay = () => {
    const tok = tokenHiddenEl.value;
    const tokenBal = balances.find(b => b.symbol === tok);
    const balFormatted = tokenBal?.balanceFormatted || '0.00';
    availEl.textContent = state.address 
      ? `Wallet Balance: ${balFormatted} ${tok}`
      : 'Wallet not connected';
  };

  const updateQuote = () => {
    const amt = parseFloat(amountEl.value) || 0;
    const token = tokenHiddenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const quote = fxQuotesService.getQuote(amt, token);

    if (token === 'cNGN') {
      rateEl.textContent = '1 cNGN = ₦1.00 (Parity)';
    } else {
      rateEl.textContent = `1 ${token} = ₦${CURRENT_USDC_NGN_RATE.toLocaleString()}`;
    }

    grossEl.textContent = `₦${quote.grossOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    feeEl.textContent = `-₦${quote.protocolFeeAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    netEl.textContent = `₦${quote.netOutput.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
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
      updateQuote();
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    tokenMenu?.classList.remove('open');
    tokenTrigger?.classList.remove('active');
  });

  updateBalanceDisplay();
  updateQuote();

  amountEl?.addEventListener('input', updateQuote);

  const checkAccount = async () => {
    const val = acctEl.value.trim();
    if (val.length === 10) {
      acctStatusEl.textContent = 'Validating NUBAN account structure...';
      acctStatusEl.style.color = 'var(--text-muted)';
      const res = await fxQuotesService.verifyBankAccount(val, bankEl.value);
      if (res.valid) {
        acctStatusEl.textContent = `✓ ${res.accountName}`;
        acctStatusEl.style.color = 'var(--accent-emerald)';
      } else {
        acctStatusEl.textContent = 'Invalid account number (must be 10 digits)';
        acctStatusEl.style.color = '#ef4444';
      }
    } else {
      acctStatusEl.textContent = 'Enter 10-digit account number';
      acctStatusEl.style.color = 'var(--text-muted)';
    }
  };

  acctEl?.addEventListener('input', checkAccount);
  bankEl?.addEventListener('change', checkAccount);

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

    const bankName = bankEl.options[bankEl.selectedIndex].text;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⚡ Processing Celo Settlement...</span>';

    showToast(`🚀 Off-ramp initiated! ${amt} ${tok} dispatched to ${bankName}. NIBSS settlement in 1-2 mins.`);
    setTimeout(() => {
      onNavigate('dashboard');
    }, 1800);
  });
}
