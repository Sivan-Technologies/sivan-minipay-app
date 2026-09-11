import { agreementsService } from '../services/agreements.service';
import { agreementFeeService } from '../services/agreement-fee.service';
import { miniPayService } from '../services/minipay.service';
import { fetchTokenBalances } from '../services/celo-client';
import { CELO_CONFIG, type SupportedTokenSymbol } from '../config/celo.config';

export async function renderCreateAgreement(
  container: HTMLElement,
  onNavigate: (tab: string) => void,
  showToast: (msg: string) => void
) {
  const state = miniPayService.getState();
  const balances = await fetchTokenBalances(state.address);

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 20px;">
      <h2 class="section-title">New Service Agreement</h2>
      <span class="section-link" id="btn-cancel-create">Back</span>
    </div>

    <form id="form-create-deal">
      <div class="form-group">
        <label class="form-label" for="deal-title">Deal Title</label>
        <input 
          type="text" 
          id="deal-title" 
          class="form-input" 
          placeholder="e.g. Mobile App UI Design or Smart Contract Review" 
          required 
        />
      </div>

      <div class="form-group">
        <label class="form-label" for="deal-contractor">Contractor Celo 0x Address</label>
        <input 
          type="text" 
          id="deal-contractor" 
          class="form-input" 
          placeholder="0x..." 
          required 
          pattern="^0x[a-fA-F0-9]{40}$"
          title="Must be a valid 42-character Celo/Ethereum address starting with 0x"
        />
        <div class="form-helper">Destination wallet address where funds will settle upon completion</div>
      </div>

      <div class="form-group">
        <label class="form-label">Currency & Amount</label>
        <div style="display: grid; grid-template-columns: 140px 1fr; gap: 10px;">
          <!-- In-DOM Token Selector Dropdown -->
          <div class="custom-select-wrap" id="deal-currency-wrap">
            <div class="custom-select-trigger" id="deal-currency-trigger">
              <span id="deal-currency-display">🟢 USDT</span>
              <span class="chevron">▾</span>
            </div>
            <div class="custom-select-menu" id="deal-currency-menu">
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
            <input type="hidden" id="deal-currency" value="USDT" />
          </div>

          <input 
            type="number" 
            id="deal-amount" 
            class="form-input" 
            placeholder="0.00" 
            min="0.01" 
            step="any" 
            required 
          />
        </div>
        <div id="avail-bal-note" class="form-helper" style="color: var(--accent-emerald); font-weight: 500; margin-top: 4px;">
          Available: Loading...
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="deal-deadline">Delivery Deadline</label>
        <select id="deal-deadline" class="form-select">
          <option value="24">24 Hours (1 Day)</option>
          <option value="48" selected>48 Hours (2 Days)</option>
          <option value="72">72 Hours (3 Days)</option>
          <option value="168">7 Days (1 Week)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label" for="deal-desc">Deliverable Scope & Criteria</label>
        <textarea 
          id="deal-desc" 
          class="form-textarea" 
          placeholder="Describe deliverables and verification requirements before payment is released..." 
          required
        ></textarea>
      </div>

      <!-- Live Calculation Box -->
      <div class="quote-box" id="calc-box">
        <div class="quote-row">
          <span>Gross Agreement Value:</span>
          <span id="calc-gross">0.00 USDT</span>
        </div>
        <div class="quote-row">
          <span id="calc-fee-label">Sivan Platform Fee:</span>
          <span id="calc-fee">0.00 USDT</span>
        </div>
        <div class="quote-row">
          <span>Net Contractor Payout:</span>
          <span id="calc-net">0.00 USDT</span>
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
          <span>🏷️ Official Attribution:</span>
          <code style="color: var(--accent-cyan);">${CELO_CONFIG.attributionTag}</code>
        </div>
      </div>

      <button type="submit" class="btn-primary" id="btn-submit-deal" style="margin-top: 10px;">
        <span>🔒 Fund & Lock Deal (Celo Mainnet)</span>
      </button>
    </form>
  `;

  const amountInput = container.querySelector('#deal-amount') as HTMLInputElement;
  const currencyHiddenInput = container.querySelector('#deal-currency') as HTMLInputElement;
  const currencyTrigger = container.querySelector('#deal-currency-trigger') as HTMLElement;
  const currencyMenu = container.querySelector('#deal-currency-menu') as HTMLElement;
  const currencyDisplay = container.querySelector('#deal-currency-display') as HTMLElement;
  const currencyItems = container.querySelectorAll('.custom-select-item');

  const availNote = container.querySelector('#avail-bal-note') as HTMLElement;
  const grossEl = container.querySelector('#calc-gross') as HTMLElement;
  const feeLabel = container.querySelector('#calc-fee-label') as HTMLElement;
  const feeEl = container.querySelector('#calc-fee') as HTMLElement;
  const netEl = container.querySelector('#calc-net') as HTMLElement;
  const submitBtn = container.querySelector('#btn-submit-deal') as HTMLButtonElement;

  const updateBalanceDisplay = () => {
    const curr = currencyHiddenInput.value as SupportedTokenSymbol;
    const tokenBal = balances.find(b => b.symbol === curr);
    const balFormatted = tokenBal?.balanceFormatted || '0.00';
    availNote.textContent = state.address 
      ? `Wallet Balance: ${balFormatted} ${curr}`
      : 'Wallet not connected (Connect to fund deal)';
  };

  const updateCalc = async () => {
    const amt = parseFloat(amountInput.value) || 0;
    const curr = currencyHiddenInput.value;

    if (amt <= 0) {
      grossEl.textContent = curr === 'cNGN' ? '₦0.00 cNGN' : `0.00 ${curr}`;
      feeEl.textContent = curr === 'cNGN' ? '₦0.00 cNGN' : `0.00 ${curr}`;
      netEl.textContent = curr === 'cNGN' ? '₦0.00 cNGN' : `0.00 ${curr}`;
      feeLabel.textContent = 'Sivan Platform Fee:';
      return;
    }

    const feeResult = await agreementFeeService.getDynamicFeeQuote(amt, curr);

    if (curr === 'cNGN') {
      grossEl.textContent = `₦${amt.toLocaleString()} cNGN`;
      feeLabel.textContent = `Sivan Fee (${feeResult.feeFormula}):`;
      feeEl.textContent = `₦${feeResult.protocolFee.toLocaleString()} cNGN`;
      netEl.textContent = `₦${feeResult.netAmount.toLocaleString()} cNGN`;
    } else {
      grossEl.textContent = `${amt.toFixed(2)} ${curr}`;
      feeLabel.textContent = `Sivan Fee (${feeResult.feeFormula}):`;
      feeEl.textContent = `${feeResult.protocolFee.toFixed(2)} ${curr}`;
      netEl.textContent = `${feeResult.netAmount.toFixed(2)} ${curr}`;
    }
  };

  // Dropdown open/close event
  currencyTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = currencyMenu.classList.contains('open');
    if (isOpen) {
      currencyMenu.classList.remove('open');
      currencyTrigger.classList.remove('active');
    } else {
      currencyMenu.classList.add('open');
      currencyTrigger.classList.add('active');
    }
  });

  // Select item event
  currencyItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = e.currentTarget as HTMLElement;
      const val = el.dataset.value!;
      const label = el.dataset.label!;

      currencyHiddenInput.value = val;
      currencyDisplay.textContent = label;

      currencyItems.forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');

      currencyMenu.classList.remove('open');
      currencyTrigger.classList.remove('active');

      updateBalanceDisplay();
      updateCalc();
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    currencyMenu?.classList.remove('open');
    currencyTrigger?.classList.remove('active');
  });

  updateBalanceDisplay();
  updateCalc();

  amountInput?.addEventListener('input', updateCalc);

  // Back button
  container.querySelector('#btn-cancel-create')?.addEventListener('click', () => onNavigate('dashboard'));

  // Form submission with real on-chain transaction execution
  const form = container.querySelector('#form-create-deal') as HTMLFormElement;
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!state.address) {
      showToast('⚠️ Please connect your MetaMask or MiniPay wallet first.');
      const res = await miniPayService.connectMetaMask();
      if (!res.success) return;
    }

    const title = (container.querySelector('#deal-title') as HTMLInputElement).value.trim();
    const contractorAddress = (container.querySelector('#deal-contractor') as HTMLInputElement).value.trim();
    const amount = parseFloat(amountInput.value);
    const currency = currencyHiddenInput.value as 'USDC' | 'USDT' | 'cNGN' | 'cUSD';
    const deadlineHours = parseInt((container.querySelector('#deal-deadline') as HTMLSelectElement).value, 10);
    const description = (container.querySelector('#deal-desc') as HTMLTextAreaElement).value.trim();

    if (!amount || amount <= 0) {
      showToast('⚠️ Please enter a valid amount.');
      return;
    }

    // Check available balance
    const currentBal = balances.find(b => b.symbol === currency);
    const availableNum = currentBal ? parseFloat(currentBal.balanceFormatted.replace(/,/g, '')) : 0;

    if (amount > availableNum) {
      showToast(`⚠️ Insufficient ${currency} balance. You have ${availableNum} ${currency}.`);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Waiting for wallet confirmation...</span>';

    try {
      // Execute genuine on-chain transfer to lock deal under Sivan AI Autonomous Service Agreement
      const txRes = await miniPayService.sendAttributedTransfer({
        to: CELO_CONFIG.agentWallet,
        amount,
        currency,
      });

      if (!txRes.success || !txRes.txHash) {
        showToast(`❌ Transaction failed: ${txRes.error || 'User cancelled'}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🔒 Fund & Lock Deal (Celo Mainnet)</span>';
        return;
      }

      // Save genuine service agreement
      await agreementsService.createAgreement({
        title,
        description,
        contractorIdentifier: `${contractorAddress.slice(0, 6)}...${contractorAddress.slice(-4)}`,
        contractorAddress,
        amount,
        currency,
        deadlineHours,
        fundingTxHash: txRes.txHash,
      });

      showToast(`🎉 Deal confirmed on Celo Mainnet! Tx: ${txRes.txHash.slice(0, 10)}...`);
      onNavigate('deals');
    } catch (err: any) {
      console.error('Deal funding error:', err);
      showToast(`❌ Error: ${err.message || 'Transaction could not be completed'}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🔒 Fund & Lock Deal (Celo Mainnet)</span>';
    }
  });
}
