import { fxQuotesService, NIGERIAN_BANKS, CURRENT_USDC_NGN_RATE } from '../services/fx-quotes.service';

export function renderCashout(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
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
        <div style="display: grid; grid-template-columns: 120px 1fr; gap: 10px;">
          <select id="cashout-token" class="form-select">
            <option value="USDC">USDC (Celo)</option>
            <option value="USDT">USDT (Celo)</option>
            <option value="cUSD">cUSD (Celo)</option>
            <option value="cNGN">cNGN (Celo)</option>
          </select>
          <input 
            type="number" 
            id="cashout-amount" 
            class="form-input" 
            placeholder="Amount" 
            min="1" 
            step="any" 
            required 
            value="25"
          />
        </div>
        <div class="form-helper">Realistic test range: 5 to 50 USDC (or 5,000 to 50,000 NGN)</div>
      </div>

      <!-- Live FX Quote Summary -->
      <div class="quote-box" id="quote-container">
        <div class="quote-row">
          <span>Live FX Rate:</span>
          <span id="q-rate">1 USDC = ₦${CURRENT_USDC_NGN_RATE.toLocaleString()}</span>
        </div>
        <div class="quote-row">
          <span>Gross Payout:</span>
          <span id="q-gross">₦36,250.00</span>
        </div>
        <div class="quote-row">
          <span>Sivan Protocol Fee (1%):</span>
          <span id="q-fee">-₦362.50</span>
        </div>
        <div class="quote-row">
          <span>Net Credit to Bank:</span>
          <span id="q-net">₦35,887.50</span>
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
          placeholder="0123456789" 
          maxlength="10" 
          required 
          value="0123456789"
        />
        <div id="acct-lookup-status" style="font-size: 11px; margin-top: 5px; color: var(--accent-emerald); font-weight: 600;">
          Verified: CHIDI OKECHUKWU (Access Bank)
        </div>
      </div>

      <button type="submit" class="btn-primary" id="btn-submit-cashout" style="margin-top: 8px;">
        <span>💸 Confirm Cash Out (Under 1-2 Mins)</span>
      </button>
    </form>
  `;

  const amountEl = container.querySelector('#cashout-amount') as HTMLInputElement;
  const tokenEl = container.querySelector('#cashout-token') as HTMLSelectElement;
  const rateEl = container.querySelector('#q-rate') as HTMLElement;
  const grossEl = container.querySelector('#q-gross') as HTMLElement;
  const feeEl = container.querySelector('#q-fee') as HTMLElement;
  const netEl = container.querySelector('#q-net') as HTMLElement;
  const bankEl = container.querySelector('#cashout-bank') as HTMLSelectElement;
  const acctEl = container.querySelector('#cashout-acct') as HTMLInputElement;
  const acctStatusEl = container.querySelector('#acct-lookup-status') as HTMLElement;

  const updateQuote = () => {
    const amt = parseFloat(amountEl.value) || 0;
    const token = tokenEl.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
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

  amountEl?.addEventListener('input', updateQuote);
  tokenEl?.addEventListener('change', updateQuote);

  const checkAccount = async () => {
    const val = acctEl.value.trim();
    if (val.length === 10) {
      acctStatusEl.textContent = 'Verifying account with NIBSS...';
      acctStatusEl.style.color = 'var(--text-muted)';
      const res = await fxQuotesService.verifyBankAccount(val, bankEl.value);
      if (res.valid) {
        acctStatusEl.textContent = `Verified: ${res.accountName}`;
        acctStatusEl.style.color = 'var(--accent-emerald)';
      } else {
        acctStatusEl.textContent = 'Account verification failed';
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
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const amt = amountEl.value;
    const tok = tokenEl.value;
    const bankName = bankEl.options[bankEl.selectedIndex].text;
    showToast(`🚀 Off-ramp initiated! ${amt} ${tok} dispatched to ${bankName}. NIBSS settlement in 1-2 mins.`);
    setTimeout(() => {
      onNavigate('dashboard');
    }, 1500);
  });
}
